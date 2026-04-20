import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, X, ChevronRight, CheckCircle2, Sparkles,
  RotateCcw, Image as ImageIcon,
  GripVertical, AlertTriangle, Car, ChevronLeft,
  Save, Trash2, ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useVeiculosAnunciante, fotoCapa, type VeiculoAnunciante } from "@/hooks/useVeiculosAnunciante";
import { useVenStudio, CENARIOS_VENSTUDIO, type CenarioId, type FotoProcessamento } from "@/hooks/useVenStudio";
import { supabase } from "@/lib/supabase";

type Phase = "select" | "scenario" | "processing" | "result";

interface FotoVeiculo {
  id: string;
  url_original: string;
  url_processada: string | null;
  processada_por_ia: boolean;
  ordem: number;
  is_capa: boolean;
}

export default function VenStudioPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { veiculos, loading: veiculosLoading } = useVeiculosAnunciante();
  const venStudio = useVenStudio();

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoAnunciante | null>(null);
  const [fotosVeiculo, setFotosVeiculo] = useState<FotoVeiculo[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/entrar");
  }, [user, authLoading, navigate]);

  // Carregar uso ao montar
  useEffect(() => {
    if (user) venStudio.carregarUso();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectVeiculo = async (v: VeiculoAnunciante) => {
    setSelectedVeiculo(v);
    setLoadingFotos(true);

    const { data } = await supabase
      .from("fotos_veiculo")
      .select("id, url_original, url_processada, processada_por_ia, ordem, is_capa")
      .eq("veiculo_id", v.id)
      .order("ordem");

    const fotos = (data ?? []) as FotoVeiculo[];
    setFotosVeiculo(fotos);

    // Preparar fotos para o hook
    venStudio.setFotos(
      fotos.map((f) => ({
        fotoUrl: f.url_original,
        fotoId: f.id,
        status: "pendente" as const,
      }))
    );

    setLoadingFotos(false);
    setPhase("scenario");
  };

  const startProcessing = () => {
    if (!selectedVeiculo) return;
    setPhase("processing");
    venStudio.processarTodas(selectedVeiculo.id);
  };

  // Detectar quando todas as fotos terminaram
  useEffect(() => {
    if (phase !== "processing") return;
    const allDone = venStudio.fotos.length > 0 && venStudio.fotos.every(
      (f) => f.status === "concluido" || f.status === "erro"
    );
    if (allDone) {
      setTimeout(() => setPhase("result"), 600);
    }
  }, [venStudio.fotos, phase]);

  const reset = () => {
    setPhase("select");
    setSelectedVeiculo(null);
    setFotosVeiculo([]);
    venStudio.setFotos([]);
  };

  if (authLoading) return null;

  // ══════════════════════════════════════════════════════════════════
  // VENSTUDIO DESABILITADO — RISCO LEGAL (CDC Art. 37)
  // Pipeline generativo altera características do veículo (emblema,
  // rodas, faróis, placa). Reabilitar somente após pipeline
  // determinístico (segmentação + composição Sharp) com fingerprint.
  // Ver docs/venstudio-arquitetura.md
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Wand2 className="h-4 w-4" /> VenStudio IA
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-display)]">
            Transforme suas fotos em imagens profissionais
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold font-[family-name:var(--font-display)] mb-2">
              VenStudio em manutenção técnica
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Estamos aprimorando nosso processamento de imagens para garantir
              fidelidade total ao seu veículo. Seus anúncios continuam ativos
              com as fotos originais.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Voltaremos em breve com processamento que preserva seu veículo
              pixel a pixel — apenas o fundo é alterado.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={() => navigate("/minha-conta/anuncios")}>
                Meus anúncios
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ──── Select Vehicle Phase ──── */
function SelectPhase({ veiculos, loading, onSelect }: {
  veiculos: VeiculoAnunciante[];
  loading: boolean;
  onSelect: (v: VeiculoAnunciante) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)] mb-1">Escolha um veículo</h2>
        <p className="text-sm text-muted-foreground">Selecione o veículo cujas fotos você deseja processar com IA</p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-4 h-20" />
          ))}
        </div>
      ) : veiculos.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Car className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-semibold">Nenhum veículo publicado</p>
            <p className="text-sm text-muted-foreground mt-1">Publique um anúncio primeiro para usar o VenStudio</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {veiculos.map((v) => (
            <Card
              key={v.id}
              onClick={() => onSelect(v)}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
            >
              <CardContent className="p-4 flex items-center gap-4">
                <img
                  src={fotoCapa(v)}
                  alt={v.modelo}
                  className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{v.marca} {v.modelo} {v.versao}</p>
                  <p className="text-sm text-muted-foreground">{v.ano} · {v.fotos_veiculo.length} fotos</p>
                </div>
                {v.selo_studio_ia && (
                  <Badge className="bg-primary/10 text-primary text-xs flex-shrink-0">
                    <Wand2 className="h-3 w-3 mr-1" /> Processado
                  </Badge>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ──── Scenario Phase ──── */
function ScenarioPhase({ veiculo, fotos, cenario, melhorarQualidade, onCenarioChange, onMelhorarQualidadeChange, limiteAtingido, onBack, onProcess }: {
  veiculo: VeiculoAnunciante;
  fotos: FotoVeiculo[];
  cenario: CenarioId;
  melhorarQualidade: boolean;
  onCenarioChange: (c: CenarioId) => void;
  onMelhorarQualidadeChange: (v: boolean) => void;
  limiteAtingido: boolean;
  onBack: () => void;
  onProcess: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      {/* Vehicle info */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">
            {veiculo.marca} {veiculo.modelo} {veiculo.versao}
          </h2>
          <p className="text-sm text-muted-foreground">{fotos.length} fotos disponíveis</p>
        </div>
      </div>

      {/* Fotos preview */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {fotos.map((f, i) => (
          <div key={f.id} className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-border relative">
            <img src={f.url_original} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            {f.processada_por_ia && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cenários */}
      <div>
        <h3 className="text-base font-semibold mb-3">Escolha o Cenário</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CENARIOS_VENSTUDIO.map((s) => (
            <Card
              key={s.id}
              onClick={() => onCenarioChange(s.id)}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                cenario === s.id ? "ring-2 ring-primary shadow-lg" : ""
              }`}
            >
              <CardContent className="p-0">
                <div className={`h-28 bg-gradient-to-br ${s.gradient} rounded-t-lg flex items-center justify-center`}>
                  <ImageIcon className="h-10 w-10 text-white/80" />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">{s.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  {cenario === s.id && (
                    <Badge className="mt-2 bg-primary/10 text-primary text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Selecionado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quality toggle */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Melhorar qualidade (HD)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Brilho, contraste e nitidez otimizados</p>
          </div>
          <Switch checked={melhorarQualidade} onCheckedChange={onMelhorarQualidadeChange} />
        </CardContent>
      </Card>

      {/* Limite warning */}
      {limiteAtingido && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <p className="text-sm">Limite diário de 20 processamentos atingido. Tente novamente amanhã.</p>
          </CardContent>
        </Card>
      )}

      {/* Process button */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Processar {fotos.length} foto(s)
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cenário: {CENARIOS_VENSTUDIO.find((c) => c.id === cenario)?.nome} · As fotos originais são preservadas
            </p>
          </div>
          <Button onClick={onProcess} disabled={limiteAtingido || fotos.length === 0} className="bg-primary hover:bg-primary/90">
            <Wand2 className="h-4 w-4 mr-2" /> Processar com IA
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ──── Processing Phase ──── */
function ProcessingPhase({ fotos, progresso, cenario }: {
  fotos: FotoProcessamento[];
  progresso: number;
  cenario: string;
}) {
  const total = fotos.length;
  const done = fotos.filter((f) => f.status === "concluido" || f.status === "erro").length;
  const currentIndex = fotos.findIndex((f) => f.status === "processando");

  const steps = ["Baixando imagem...", "Removendo fundo...", "Aplicando cenário...", "Finalizando..."];
  const stepIdx = Math.min(Math.floor((progresso / 100) * steps.length), steps.length - 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto text-center py-16 space-y-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10"
      >
        <Wand2 className="h-10 w-10 text-primary" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">VenStudio IA processando</h2>
        <p className="text-muted-foreground mt-1">
          Cenário: <span className="font-medium text-foreground">{cenario}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progresso} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{currentIndex >= 0 ? `Foto ${currentIndex + 1}: ${steps[stepIdx]}` : steps[stepIdx]}</span>
          <span>{done}/{total} fotos</span>
        </div>
      </div>

      <div className="flex justify-center gap-1">
        {fotos.map((f, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              f.status === "concluido" ? "bg-primary scale-100"
                : f.status === "erro" ? "bg-destructive scale-100"
                : f.status === "processando" ? "bg-primary/50 scale-110 animate-pulse"
                : "bg-muted scale-75"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ──── Result Phase ──── */
function ResultPhase({ fotos, fotosOriginais, cenario, veiculo, onReset, onReverter }: {
  fotos: FotoProcessamento[];
  fotosOriginais: FotoVeiculo[];
  cenario: typeof CENARIOS_VENSTUDIO[number];
  veiculo: VeiculoAnunciante;
  onReset: () => void;
  onReverter: (i: number) => void;
}) {
  const navigate = useNavigate();
  const [activePhoto, setActivePhoto] = useState(0);
  const [deletando, setDeletando] = useState<number | null>(null);
  const [salvoMsg, setSalvoMsg] = useState(false);
  const fotosOk = fotos.filter((f) => f.status === "concluido").length;
  const fotosErro = fotos.filter((f) => f.status === "erro").length;

  const activeFoto = fotos[activePhoto];
  const activeOriginal = fotosOriginais[activePhoto];

  async function handleDeleteProcessada(idx: number) {
    const foto = fotosOriginais[idx];
    if (!foto) return;
    setDeletando(idx);
    // Reverter para a original no banco
    await supabase
      .from("fotos_veiculo")
      .update({ url_processada: null, processada_por_ia: false, cenario_ia: null })
      .eq("id", foto.id);
    onReverter(idx);
    setDeletando(null);
  }

  function handleSalvar() {
    // As fotos já foram salvas automaticamente pela Edge Function
    // Mostrar feedback visual
    setSalvoMsg(true);
    setTimeout(() => setSalvoMsg(false), 3000);
  }

  function handleVoltar() {
    navigate(`/veiculo/${veiculo.slug}`);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Processamento Concluído!
          </h2>
          <p className="text-sm text-muted-foreground">
            {fotosOk} foto(s) processadas com {cenario.nome}
            {fotosErro > 0 && ` · ${fotosErro} com erro`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Processar outro
          </Button>
        </div>
      </div>

      {/* Before/After Slider */}
      {activeFoto?.urlProcessada && activeOriginal && (
        <BeforeAfterSlider
          before={activeOriginal.url_original}
          after={activeFoto.urlProcessada}
        />
      )}

      {activeFoto?.status === "erro" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Erro ao processar esta foto</p>
              <p className="text-xs text-muted-foreground">{activeFoto.erro}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons for active photo */}
      {activeFoto?.status === "concluido" && activeFoto.urlProcessada && (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={deletando === activePhoto}
            onClick={() => handleDeleteProcessada(activePhoto)}
          >
            {deletando === activePhoto ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Descartar esta foto processada
          </Button>
        </div>
      )}

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {fotos.map((foto, idx) => (
          <button
            key={idx}
            onClick={() => setActivePhoto(idx)}
            className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all relative ${
              activePhoto === idx ? "ring-2 ring-primary scale-105" : "opacity-60 hover:opacity-100"
            }`}
          >
            <img
              src={foto.urlProcessada ?? fotosOriginais[idx]?.url_original ?? foto.fotoUrl}
              alt={`Foto ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            {foto.status === "concluido" && (
              <div className="absolute bottom-0 right-0 bg-primary rounded-tl p-0.5">
                <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
            {foto.status === "erro" && (
              <div className="absolute bottom-0 right-0 bg-destructive rounded-tl p-0.5">
                <X className="h-2.5 w-2.5 text-destructive-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Processadas", value: `${fotosOk}/${fotos.length}` },
          { label: "Cenário", value: cenario.nome },
          { label: "Tempo médio", value: (() => {
            const tempos = fotos.filter(f => f.tempoMs).map(f => f.tempoMs!);
            return tempos.length > 0 ? `${(tempos.reduce((a, b) => a + b, 0) / tempos.length / 1000).toFixed(1)}s` : "-";
          })() },
          { label: "Erros", value: fotosErro.toString() },
        ].map((stat) => (
          <Card key={stat.label} className="bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="font-bold text-primary font-[family-name:var(--font-mono)]">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom actions — Salvar e Voltar */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Save className="h-4 w-4 text-primary" />
              {salvoMsg ? "Fotos salvas no anúncio!" : "As fotos processadas já foram salvas automaticamente no seu anúncio."}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {veiculo.marca} {veiculo.modelo} {veiculo.versao} — {fotosOk} foto(s) atualizadas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleVoltar}>
              <ExternalLink className="h-4 w-4 mr-1" /> Ver anúncio
            </Button>
            <Button onClick={handleSalvar} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-1" /> {salvoMsg ? "Salvo!" : "Confirmar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ──── Before/After Comparison Slider ──── */
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) updatePosition(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    updatePosition(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden aspect-[16/9] cursor-col-resize select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* "After" — full background */}
      <div className="absolute inset-0">
        <img src={after} alt="Depois" className="w-full h-full object-cover" />
      </div>

      {/* "Before" — clipped */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
        <img src={before} alt="Antes" className="w-full h-full object-cover" />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
        style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Labels */}
      <Badge className="absolute top-3 left-3 bg-black/60 text-white border-0">Antes</Badge>
      <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0">
        <Sparkles className="h-3 w-3 mr-1" /> Depois
      </Badge>
    </div>
  );
}
