import { Upload, Eye, Save, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useMinhaGaragem } from "@/hooks/useMinhaGaragem";
import { supabase } from "@/lib/supabase";
import { uploadLogoGaragem, uploadCapaGaragem } from "@/lib/storage";
import { comprimirImagem, validarArquivoImagem } from "@/utils/imageCompression";

const sections = [
  { id: "sobre", label: "Sobre" },
  { id: "estoque", label: "Estoque" },
  { id: "avaliacoes", label: "Avaliações" },
  { id: "contato", label: "Contato" },
  { id: "horarios", label: "Horários" },
];

interface FormState {
  nome: string;
  descricao: string;
  especialidade: string;
  telefone: string;
  whatsapp: string;
  email: string;
}

export default function GarageStorefront() {
  const { garagem, loading, recarregar } = useMinhaGaragem();
  const [form, setForm] = useState<FormState | null>(null);
  const [sectionToggles, setSectionToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map((s, i) => [s.id, i < 4]))
  );
  const [salvando, setSalvando] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Upload de logo
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Upload de capa
  const capaInputRef = useRef<HTMLInputElement>(null);
  const [capaPreview, setCapaPreview] = useState<string | null>(null);
  const [capaUploading, setCapaUploading] = useState(false);
  const [capaError, setCapaError] = useState<string | null>(null);

  // Inicializa form com dados reais quando carregam
  useEffect(() => {
    if (garagem && !form) {
      setForm({
        nome: garagem.nome,
        descricao: garagem.descricao ?? "",
        especialidade: garagem.especialidade ?? "",
        telefone: garagem.telefone ?? "",
        whatsapp: garagem.whatsapp ?? "",
        email: garagem.email ?? "",
      });
    }
  }, [garagem, form]);

  if (loading || !garagem || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-garage border-t-transparent animate-spin" />
      </div>
    );
  }

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev);

  const toggle = (id: string) =>
    setSectionToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  async function handleSave() {
    setSalvando(true);
    setSaveError(null);
    const { error } = await supabase
      .from("garagens")
      .update({
        nome: form.nome || garagem.nome,
        descricao: form.descricao || null,
        especialidade: form.especialidade || null,
        telefone: form.telefone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
      })
      .eq("id", garagem.id);
    setSalvando(false);
    if (error) {
      setSaveError("Erro ao salvar. Tente novamente.");
      return;
    }
    setSavedOk(true);
    recarregar();
    setTimeout(() => setSavedOk(false), 3000);
  }

  async function handleLogoUpload(file: File) {
    const erroValidacao = validarArquivoImagem(file);
    if (erroValidacao) { setLogoError(erroValidacao); return; }

    // Limite de 1MB para logo
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 5) { setLogoError("Logo muito grande. Máximo 5MB."); return; }

    setLogoError(null);
    setLogoUploading(true);
    // Preview imediato
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    try {
      const comprimida = await comprimirImagem(file, { maxSizeMB: 1, maxWidth: 400, maxHeight: 400 });
      const { url, error: uploadError } = await uploadLogoGaragem(garagem.id, comprimida);
      if (uploadError || !url) throw new Error(uploadError ?? "Upload falhou");

      const { error: updateError } = await supabase
        .from("garagens")
        .update({ logo_url: url })
        .eq("id", garagem.id);
      if (updateError) throw new Error(updateError.message);

      recarregar();
    } catch (err) {
      setLogoError((err as Error).message);
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleCapaUpload(file: File) {
    const erroValidacao = validarArquivoImagem(file);
    if (erroValidacao) { setCapaError(erroValidacao); return; }

    setCapaError(null);
    setCapaUploading(true);
    // Preview imediato
    const previewUrl = URL.createObjectURL(file);
    setCapaPreview(previewUrl);

    try {
      const comprimida = await comprimirImagem(file, { maxSizeMB: 3, maxWidth: 1920, maxHeight: 600 });
      const { url, error: uploadError } = await uploadCapaGaragem(garagem.id, comprimida);
      if (uploadError || !url) throw new Error(uploadError ?? "Upload falhou");

      const { error: updateError } = await supabase
        .from("garagens")
        .update({ capa_url: url })
        .eq("id", garagem.id);
      if (updateError) throw new Error(updateError.message);

      recarregar();
    } catch (err) {
      setCapaError((err as Error).message);
      setCapaPreview(null);
    } finally {
      setCapaUploading(false);
      if (capaInputRef.current) capaInputRef.current.value = "";
    }
  }

  const logoDisplayUrl = logoPreview ?? garagem.logo_url;
  const capaDisplayUrl = capaPreview ?? garagem.capa_url;

  const formFields: { label: string; field: keyof FormState; type?: string }[] = [
    { label: "Nome da garagem", field: "nome" },
    { label: "Especialidades", field: "especialidade" },
    { label: "Telefone", field: "telefone", type: "tel" },
    { label: "WhatsApp", field: "whatsapp", type: "tel" },
    { label: "Email", field: "email", type: "email" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-h2 text-text-primary">Configuração da vitrine</h1>

      {/* Hidden file inputs */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
      />
      <input
        ref={capaInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleCapaUpload(e.target.files[0])}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-5">
          {/* Logo & Cover */}
          <div className="rounded-xl border border-border bg-background p-5 space-y-4">
            <h3 className="text-h4 text-text-primary">Identidade visual</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Logo */}
              <div>
                <p className="text-micro text-text-muted mb-2">Logo</p>
                <div
                  className="rounded-xl border-2 border-dashed border-border bg-surface-secondary h-28 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:border-garage hover:bg-garage-light/30 transition-all group"
                  onClick={() => !logoUploading && logoInputRef.current?.click()}
                >
                  {logoDisplayUrl ? (
                    <img
                      src={logoDisplayUrl}
                      alt="Logo"
                      className="absolute inset-0 w-full h-full object-cover transition-opacity group-hover:opacity-70"
                    />
                  ) : null}
                  <div className="relative z-10 flex flex-col items-center">
                    {logoUploading ? (
                      <Loader2 className="w-5 h-5 text-garage animate-spin mb-1" />
                    ) : (
                      <Upload className="w-5 h-5 text-text-muted group-hover:text-garage mb-1 transition-colors" />
                    )}
                    <span className="text-micro text-text-muted group-hover:text-garage transition-colors">
                      {logoUploading ? "Enviando…" : logoDisplayUrl ? "Trocar logo" : "Adicionar logo"}
                    </span>
                  </div>
                </div>
                {logoError && (
                  <p className="text-micro text-danger mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {logoError}
                  </p>
                )}
                <p className="text-micro text-text-muted mt-1">JPEG, PNG, WebP • máx. 1MB</p>
              </div>

              {/* Capa */}
              <div>
                <p className="text-micro text-text-muted mb-2">Capa</p>
                <div
                  className="rounded-xl border-2 border-dashed border-border bg-surface-secondary h-28 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:border-garage hover:bg-garage-light/30 transition-all group"
                  onClick={() => !capaUploading && capaInputRef.current?.click()}
                >
                  {capaDisplayUrl ? (
                    <img
                      src={capaDisplayUrl}
                      alt="Capa"
                      className="absolute inset-0 w-full h-full object-cover transition-opacity group-hover:opacity-70"
                    />
                  ) : null}
                  <div className="relative z-10 flex flex-col items-center">
                    {capaUploading ? (
                      <Loader2 className="w-5 h-5 text-garage animate-spin mb-1" />
                    ) : (
                      <Upload className="w-5 h-5 text-text-muted group-hover:text-garage mb-1 transition-colors" />
                    )}
                    <span className="text-micro text-text-muted group-hover:text-garage transition-colors">
                      {capaUploading ? "Enviando…" : capaDisplayUrl ? "Trocar capa" : "Adicionar capa"}
                    </span>
                  </div>
                </div>
                {capaError && (
                  <p className="text-micro text-danger mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {capaError}
                  </p>
                )}
                <p className="text-micro text-text-muted mt-1">JPEG, PNG, WebP • máx. 3MB</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-border bg-background p-5 space-y-4">
            <h3 className="text-h4 text-text-primary">Informações</h3>
            {formFields.map((f) => (
              <div key={f.field}>
                <label className="text-micro text-text-muted mb-1 block">{f.label}</label>
                <input
                  type={f.type ?? "text"}
                  value={form[f.field]}
                  onChange={set(f.field)}
                  className="w-full rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-body text-text-primary outline-none focus:border-garage focus:ring-1 focus:ring-garage/30 transition-all"
                />
              </div>
            ))}
            <div>
              <label className="text-micro text-text-muted mb-1 block">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={set("descricao")}
                rows={3}
                className="w-full rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-body text-text-primary outline-none focus:border-garage focus:ring-1 focus:ring-garage/30 transition-all resize-none"
              />
            </div>
          </div>

          {/* URL pública — somente leitura */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h3 className="text-h4 text-text-primary mb-3">URL pública</h3>
            <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5">
              <span className="text-small text-text-muted">ventoro.com.br/garagem/</span>
              <span className="text-body text-text-primary font-medium">{garagem.slug}</span>
            </div>
            <p className="text-micro text-text-muted mt-2">A URL não pode ser alterada nesta versão.</p>
          </div>

          {/* Section toggles */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h3 className="text-h4 text-text-primary mb-3">Seções visíveis</h3>
            <div className="space-y-2">
              {sections.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <span className="text-body text-text-primary">{s.label}</span>
                  <button
                    onClick={() => toggle(s.id)}
                    className={`w-10 h-6 rounded-full flex items-center transition-colors ${
                      sectionToggles[s.id] ? "bg-garage justify-end" : "bg-border justify-start"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow mx-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {saveError && (
            <p className="text-micro text-danger text-center">{saveError}</p>
          )}

          <button
            onClick={handleSave}
            disabled={salvando || savedOk}
            className="w-full rounded-full bg-garage text-white py-3 text-small font-medium hover:brightness-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {savedOk ? (
              <><Check className="w-4 h-4" /> Salvo com sucesso</>
            ) : salvando ? (
              "Salvando…"
            ) : (
              <><Save className="w-4 h-4" /> Salvar alterações</>
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-text-muted" />
              <span className="text-micro text-text-muted uppercase tracking-wider">Preview da vitrine</span>
            </div>
            <div className="rounded-xl border border-border bg-background overflow-hidden shadow-elevated">
              <div
                className="h-28 bg-cover bg-center relative"
                style={{ backgroundImage: capaDisplayUrl ? `url(${capaDisplayUrl})` : undefined }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="px-5 pb-5 -mt-8 relative">
                {logoDisplayUrl ? (
                  <img src={logoDisplayUrl} alt={form.nome} className="w-14 h-14 rounded-xl border-2 border-white shadow mb-3 object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl border-2 border-white shadow mb-3 bg-garage-light flex items-center justify-center">
                    <span className="font-display text-xl font-bold text-garage">{form.nome.charAt(0)}</span>
                  </div>
                )}
                <p className="text-h4 text-text-primary">{form.nome}</p>
                <p className="text-micro text-text-muted">{garagem.cidade}, {garagem.estado}</p>
                <div className="flex gap-4 mt-3 text-micro text-text-muted">
                  <span>{garagem.total_estoque} veículos</span>
                  <span>⭐ {garagem.avaliacao?.toFixed(1) ?? "—"}</span>
                  <span>Score {garagem.score_confianca}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
