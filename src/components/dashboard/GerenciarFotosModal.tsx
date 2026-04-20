import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X, Plus, Trash2, Star, Loader2, ImageIcon, Wand2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadFotoVeiculo } from "@/lib/storage";
import { comprimirImagem, validarArquivoImagem } from "@/utils/imageCompression";

const MAX_FOTOS = 15;

interface FotoItem {
  id: string;
  url_original: string;
  url_processada: string | null;
  is_capa: boolean;
  ordem: number;
  processada_por_ia: boolean;
}

interface Props {
  veiculoId: string;
  marca: string;
  modelo: string;
  onClose: () => void;
  onFotosChanged?: () => void;
  colorTheme?: "brand" | "garage";
}

export default function GerenciarFotosModal({
  veiculoId,
  marca,
  modelo,
  onClose,
  onFotosChanged,
  colorTheme = "brand",
}: Props) {
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accentBg = colorTheme === "garage" ? "bg-garage" : "bg-brand";
  const accentText = colorTheme === "garage" ? "text-garage" : "text-brand";
  const accentBorder = colorTheme === "garage" ? "border-garage" : "border-brand";

  // Carregar fotos ao montar
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("fotos_veiculo")
        .select("id, url_original, url_processada, is_capa, ordem, processada_por_ia")
        .eq("veiculo_id", veiculoId)
        .order("ordem");
      setFotos((data ?? []) as FotoItem[]);
      setLoading(false);
    })();
  }, [veiculoId]);

  async function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro(null);

    const restantes = MAX_FOTOS - fotos.length;
    if (restantes <= 0) {
      setErro(`Limite de ${MAX_FOTOS} fotos atingido.`);
      return;
    }

    const arquivos = Array.from(files).slice(0, restantes);

    // Validar todos
    for (const f of arquivos) {
      const errMsg = validarArquivoImagem(f);
      if (errMsg) {
        setErro(errMsg);
        return;
      }
    }

    setUploading(true);
    const novasFotos: FotoItem[] = [];
    const ordemBase = fotos.length;

    for (let i = 0; i < arquivos.length; i++) {
      try {
        const comprimida = await comprimirImagem(arquivos[i]);
        const nomeArquivo = `${ordemBase + i}_${Date.now()}.jpg`;
        const { url, error: uploadError } = await uploadFotoVeiculo(
          veiculoId,
          comprimida,
          nomeArquivo,
        );

        if (!url || uploadError) {
          console.warn(`Upload foto ${i} falhou:`, uploadError);
          continue;
        }

        const isCapa = fotos.length === 0 && novasFotos.length === 0;

        const { data: inserted, error: dbError } = await supabase
          .from("fotos_veiculo")
          .insert({
            veiculo_id: veiculoId,
            url_original: url,
            url_processada: null,
            ordem: ordemBase + i,
            is_capa: isCapa,
            processada_por_ia: false,
          })
          .select("id, url_original, url_processada, is_capa, ordem, processada_por_ia")
          .single();

        if (dbError) {
          console.warn(`Insert fotos_veiculo falhou:`, dbError.message);
          continue;
        }

        if (inserted) {
          novasFotos.push(inserted as FotoItem);
        }
      } catch (err) {
        console.warn(`Erro ao processar foto ${i}:`, err);
      }
    }

    if (novasFotos.length > 0) {
      setFotos((prev) => [...prev, ...novasFotos]);
      onFotosChanged?.();
    }
    setUploading(false);
  }

  async function handleRemover(fotoId: string) {
    setRemovendo(fotoId);
    const foto = fotos.find((f) => f.id === fotoId);
    if (!foto) return;

    const { error } = await supabase
      .from("fotos_veiculo")
      .delete()
      .eq("id", fotoId);

    if (!error) {
      const novaLista = fotos.filter((f) => f.id !== fotoId);
      // Se removeu a capa, promover a primeira
      if (foto.is_capa && novaLista.length > 0) {
        novaLista[0].is_capa = true;
        await supabase
          .from("fotos_veiculo")
          .update({ is_capa: true })
          .eq("id", novaLista[0].id);
      }
      setFotos(novaLista);
      onFotosChanged?.();
    }
    setRemovendo(null);
  }

  async function handleDefinirCapa(fotoId: string) {
    // Remover capa anterior
    const anterior = fotos.find((f) => f.is_capa);
    if (anterior && anterior.id !== fotoId) {
      await supabase
        .from("fotos_veiculo")
        .update({ is_capa: false })
        .eq("id", anterior.id);
    }
    // Definir nova capa
    await supabase
      .from("fotos_veiculo")
      .update({ is_capa: true })
      .eq("id", fotoId);

    setFotos((prev) =>
      prev.map((f) => ({ ...f, is_capa: f.id === fotoId }))
    );
    onFotosChanged?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h4 text-text-primary">
            Fotos — {marca} {modelo}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={`w-6 h-6 animate-spin ${accentText}`} />
          </div>
        )}

        {/* Fotos grid */}
        {!loading && (
          <>
            {fotos.length === 0 ? (
              <div className="text-center py-10">
                <ImageIcon className="w-10 h-10 text-text-muted mx-auto mb-2" />
                <p className="text-body text-text-secondary">Nenhuma foto adicionada ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="relative group rounded-lg overflow-hidden border border-border aspect-[4/3]">
                    <img
                      src={foto.url_processada ?? foto.url_original}
                      alt="Foto do veículo"
                      className="w-full h-full object-cover"
                    />

                    {/* Selo capa */}
                    {foto.is_capa && (
                      <span className={`absolute top-1 left-1 ${accentBg} text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded`}>
                        CAPA
                      </span>
                    )}

                    {/* Selo IA */}
                    {foto.processada_por_ia && (
                      <span className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Wand2 className="w-2.5 h-2.5" /> IA
                      </span>
                    )}

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {!foto.is_capa && (
                        <button
                          onClick={() => handleDefinirCapa(foto.id)}
                          className="rounded-full bg-white/90 p-1.5 text-text-primary hover:bg-white transition-colors"
                          title="Definir como capa"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemover(foto.id)}
                        disabled={removendo === foto.id}
                        className="rounded-full bg-white/90 p-1.5 text-danger hover:bg-white transition-colors disabled:opacity-50"
                        title="Remover foto"
                      >
                        {removendo === foto.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Erro */}
            {erro && (
              <p className="text-small text-danger mb-3">{erro}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Adicionar fotos */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
                multiple
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || fotos.length >= MAX_FOTOS}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border ${accentBorder} ${accentText} px-4 py-2.5 text-small font-medium hover:bg-opacity-10 transition-colors disabled:opacity-50`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Adicionar fotos ({fotos.length}/{MAX_FOTOS})
                  </>
                )}
              </button>

              {/* Link para VenStudio */}
              <Link
                to="/studio"
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg ${accentBg} text-primary-foreground px-4 py-2.5 text-small font-medium hover:brightness-90 transition-all`}
                onClick={onClose}
              >
                <Wand2 className="w-4 h-4" /> Reprocessar com VenStudio IA
              </Link>
            </div>

            <p className="text-micro text-text-muted mt-3">
              Passe o mouse sobre uma foto para definir como capa ou remover. Use o VenStudio para aplicar cenários profissionais com IA.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
