import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import {
  Sparkles, ArrowLeft, CheckCircle2, Wand2, Camera, ShieldCheck,
  ChevronDown, Loader2, RotateCcw, AlertTriangle, X, Trash2,
  ZoomIn, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CENARIOS_V2, CENARIOS_V2_LIST, type CenarioV2Id } from "@/lib/venstudio-cenarios-v2";
import { useVenStudioV2, type FotoResultado } from "@/hooks/useVenStudioV2";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface FotoDB {
  id: string;
  url_original: string;
  url_processada: string | null;
}

export default function VenStudioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const veiculoId = searchParams.get("veiculo");
  const { user, loading: authLoading } = useAuth();

  const [fotos, setFotos] = useState<FotoDB[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(true);
  const [veiculoInfo, setVeiculoInfo] = useState<{ marca: string; modelo: string } | null>(null);
  const [cenario, setCenario] = useState<CenarioV2Id>("showroom");
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const [opcoes, setOpcoes] = useState<{ light_direction?: string; light_strength?: number; preserve_subject?: number }>({});
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [resultadosAnteriores, setResultadosAnteriores] = useState<FotoResultado[]>([]);

  const venStudio = useVenStudioV2();
  const processando = venStudio.status === "processando";
  const concluido = venStudio.status === "concluido";
  const temErro = venStudio.status === "erro";
  const cenarioConfig = CENARIOS_V2[cenario];

  useEffect(() => {
    if (!authLoading && !user) navigate("/entrar");
  }, [user, authLoading, navigate]);

  // Carregar fotos e dados do veículo
  useEffect(() => {
    if (!veiculoId) { setLoadingFotos(false); return; }

    async function load() {
      const [fotosRes, veiculoRes] = await Promise.all([
        supabase.from("fotos_veiculo").select("id, url_original, url_processada").eq("veiculo_id", veiculoId).order("ordem"),
        supabase.from("veiculos").select("marca, modelo").eq("id", veiculoId).single(),
      ]);
      if (fotosRes.data) {
        setFotos(fotosRes.data);
        // Selecionar todas por padrão
        setSelecionadas(new Set(fotosRes.data.map((f: FotoDB) => f.id)));
      }
      if (veiculoRes.data) setVeiculoInfo(veiculoRes.data);
      setLoadingFotos(false);
    }
    load();
  }, [veiculoId]);

  const toggleSelecionada = useCallback((id: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleTodas = useCallback(() => {
    if (selecionadas.size === fotos.length) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(fotos.map(f => f.id)));
    }
  }, [selecionadas.size, fotos]);

  const handleProcessar = async () => {
    if (!veiculoId || selecionadas.size === 0) return;
    const fotosInput = fotos
      .filter(f => selecionadas.has(f.id))
      .map((f) => ({ url: f.url_original, id: f.id }));
    await venStudio.processarTodas(
      fotosInput,
      cenario,
      veiculoId,
      opcoes as { light_direction?: "above" | "left" | "right" | "below"; light_strength?: number; preserve_subject?: number },
    );
  };

  // Quando concluir, acumular resultados (não sobrescrever)
  useEffect(() => {
    if (concluido || temErro) {
      const novos = venStudio.fotos.filter(f => f.urlProcessada);
      if (novos.length > 0) {
        setResultadosAnteriores(prev => [...prev, ...novos]);
      }
    }
  }, [concluido, temErro]);

  const handleDeletarResultado = (index: number) => {
    setResultadosAnteriores(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessarNovamente = () => {
    venStudio.resetar();
  };

  const todasSelecionadas = selecionadas.size === fotos.length;
  const fotosSelecionadasCount = selecionadas.size;

  // Sem veículo selecionado
  if (!veiculoId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto pt-28 pb-16 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--brand-primary))]/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10 text-[hsl(var(--brand-primary))]" />
          </div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary mb-3">VenStudio IA</h1>
          <p className="text-text-secondary max-w-lg mx-auto mb-8">
            Selecione um veículo nos seus anúncios para usar o VenStudio. Acesse "Gerenciar fotos" em qualquer anúncio e clique em "VenStudio IA".
          </p>
          <Button variant="outline" onClick={() => navigate("/minha-conta/anuncios")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Ir para meus anúncios
          </Button>
        </div>
      </div>
    );
  }

  if (loadingFotos || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-28 pb-16 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-[hsl(var(--brand-primary))]" /> VenStudio IA
            </h1>
            {veiculoInfo && (
              <p className="text-sm text-muted-foreground">{veiculoInfo.marca} {veiculoInfo.modelo} — {fotos.length} foto(s)</p>
            )}
          </div>
        </div>

        {/* Banner de confiança */}
        <Card className="border-green-500/30 bg-green-500/5 mb-6">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-700 dark:text-green-400">Seu veículo é preservado com fidelidade total</p>
              <p className="text-muted-foreground mt-0.5">
                A IA altera apenas o ambiente — cor, rodas, faróis, emblemas, placa e todos os detalhes permanecem idênticos ao original.
              </p>
            </div>
          </CardContent>
        </Card>

        {fotos.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-8 text-center">
              <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">Nenhuma foto encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">Este veículo não possui fotos cadastradas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Grid de cenários */}
            {!processando && (
              <>
                <div>
                  <p className="text-sm font-semibold mb-3">Escolha o cenário</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {CENARIOS_V2_LIST.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCenario(c.id as CenarioV2Id)}
                        className={`text-left rounded-lg border bg-card shadow-sm cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                          cenario === c.id ? "ring-2 ring-[hsl(var(--brand-primary))] shadow-lg" : "border-border"
                        }`}
                      >
                        <div className={`h-16 bg-gradient-to-br ${c.gradient} flex items-center justify-center text-2xl`}>
                          {c.emoji}
                        </div>
                        <div className="p-2.5">
                          <p className="font-semibold text-xs text-foreground">{c.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{c.descricao}</p>
                          {cenario === c.id && (
                            <Badge className="mt-1.5 bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Selecionado
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Controles avançados */}
                <div>
                  <button
                    type="button"
                    onClick={() => setMostrarAvancado(!mostrarAvancado)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${mostrarAvancado ? "rotate-180" : ""}`} />
                    Ajustes de iluminação (avançado)
                  </button>
                  {mostrarAvancado && (
                    <Card className="mt-3">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-muted-foreground w-40">Direção da luz</label>
                          <Select
                            value={opcoes.light_direction ?? cenarioConfig.light_source_direction}
                            onValueChange={(v) => setOpcoes({ ...opcoes, light_direction: v })}
                          >
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">De cima</SelectItem>
                              <SelectItem value="left">Esquerda</SelectItem>
                              <SelectItem value="right">Direita</SelectItem>
                              <SelectItem value="below">De baixo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Fotos do veículo — selecionáveis */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Selecione as fotos para processar</p>
                    <button
                      type="button"
                      onClick={toggleTodas}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        todasSelecionadas ? "bg-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]" : "border-border"
                      }`}>
                        {todasSelecionadas && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {todasSelecionadas ? "Desmarcar todas" : "Selecionar todas"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {fotos.map((f) => {
                      const selected = selecionadas.has(f.id);
                      return (
                        <div
                          key={f.id}
                          className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all group ${
                            selected ? "border-[hsl(var(--brand-primary))] shadow-md" : "border-border opacity-60 hover:opacity-80"
                          }`}
                          onClick={() => toggleSelecionada(f.id)}
                        >
                          <img src={f.url_original} alt="" className="w-full h-full object-cover" />
                          {/* Checkbox overlay */}
                          <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selected ? "bg-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]" : "bg-white/80 border-gray-400"
                          }`}>
                            {selected && <Check className="h-3.5 w-3.5 text-white" />}
                          </div>
                          {/* Zoom button */}
                          <button
                            type="button"
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setZoomUrl(f.url_original); }}
                          >
                            <ZoomIn className="h-3.5 w-3.5 text-white" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botão processar */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleProcessar}
                    disabled={fotosSelecionadasCount === 0}
                    className="flex-1 gap-2 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    {fotosSelecionadasCount === 0
                      ? "Selecione ao menos 1 foto"
                      : `Processar ${fotosSelecionadasCount} foto(s) com IA`}
                  </Button>
                </div>
              </>
            )}

            {/* Processando */}
            {processando && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--brand-primary))]" />
                  <p className="font-semibold">Processando fotos com cenário {CENARIOS_V2[cenario].label}...</p>
                </div>
                <Progress value={venStudio.progresso} className="h-2" />
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {venStudio.fotos.map((resultado, i) => (
                    <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
                      <img src={resultado?.urlProcessada || resultado.fotoUrl} alt="" className="w-full h-full object-cover" />
                      {resultado?.status === "processando" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      {resultado?.status === "concluido" && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle2 className="h-5 w-5 text-green-500 drop-shadow" />
                        </div>
                      )}
                      {resultado?.status === "erro" && (
                        <div className="absolute top-1 right-1">
                          <AlertTriangle className="h-5 w-5 text-red-500 drop-shadow" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={venStudio.cancelar} className="text-xs">
                  Cancelar
                </Button>
              </div>
            )}

            {/* Resultados (concluido ou erro, acumulados) */}
            {(concluido || temErro) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {venStudio.fotos.some(f => f.status === "concluido") ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="font-semibold text-green-700 dark:text-green-400">Processamento concluído!</p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <p className="font-semibold text-red-600">Erro no processamento</p>
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleProcessarNovamente} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Nova geração
                  </Button>
                </div>

                {/* Última geração */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Última geração — {CENARIOS_V2[cenario].label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {venStudio.fotos.map((r, i) => (
                      <div key={i} className="space-y-1.5">
                        <div
                          className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border cursor-pointer group"
                          onClick={() => setZoomUrl(r.urlProcessada || r.fotoUrl)}
                        >
                          <img src={r.urlProcessada || r.fotoUrl} alt="" className="w-full h-full object-cover" />
                          {r.status === "concluido" && (
                            <div className="absolute top-1.5 left-1.5">
                              <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0.5">IA</Badge>
                            </div>
                          )}
                          {r.status === "erro" && (
                            <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-[10px] p-1 text-center">
                              {r.erro || "Erro"}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                          </div>
                        </div>
                        {/* Original para comparação */}
                        <p className="text-[10px] text-muted-foreground text-center">
                          {r.status === "concluido" ? "Gerada com IA" : r.status === "erro" ? "Falhou" : "Original"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {venStudio.erro && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {venStudio.erro}
                  </p>
                )}
              </div>
            )}

            {/* Resultados anteriores acumulados */}
            {resultadosAnteriores.length > 0 && (
              <div className="space-y-3 border-t border-border pt-6">
                <p className="text-sm font-semibold">Fotos geradas anteriormente ({resultadosAnteriores.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {resultadosAnteriores.map((r, i) => (
                    <div key={`prev-${i}`} className="space-y-1.5">
                      <div
                        className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border cursor-pointer group"
                        onClick={() => setZoomUrl(r.urlProcessada || r.fotoUrl)}
                      >
                        <img src={r.urlProcessada || r.fotoUrl} alt="" className="w-full h-full object-cover" />
                        <Badge className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[10px] px-1.5 py-0.5">IA</Badge>
                        {/* Zoom hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                        </div>
                        {/* Delete button */}
                        <button
                          type="button"
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); handleDeletarResultado(i); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botão voltar (sempre visível quando não processando) */}
            {!processando && (
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Voltar ao anúncio
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Zoom */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setZoomUrl(null)}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={zoomUrl}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
