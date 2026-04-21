import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, X, ChevronRight, CheckCircle2, Sparkles,
  RotateCcw, Image as ImageIcon, AlertTriangle, Car, ChevronLeft,
  Save, Trash2, ExternalLink, Loader2, Crown, ShieldCheck,
  GripVertical, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useVeiculosAnunciante, fotoCapa, type VeiculoAnunciante } from "@/hooks/useVeiculosAnunciante";
import { useVenStudio, CENARIOS_VENSTUDIO, type CenarioId, type FotoProcessamento, type Tier } from "@/hooks/useVenStudio";
import { CENARIOS, fundoUrl, VARIACOES } from "@/lib/venstudio-cenarios";
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
  const [confirmou, setConfirmou] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/entrar");
  }, [user, authLoading, navigate]);

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

  useEffect(() => {
    if (phase !== "processing") return;
    const allDone = venStudio.fotos.length > 0 && venStudio.fotos.every(
      (f) => f.status === "concluido" || f.status === "erro" || f.status === "rejeitado"
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
    setConfirmou(false);
  };

  if (authLoading) return null;

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
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto text-sm">
            Seu veículo é preservado pixel a pixel — a IA altera apenas o fundo.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">
          {phase === "select" && (
            <SelectPhase
              key="select"
              veiculos={veiculos}
              loading={veiculosLoading}
              onSelect={handleSelectVeiculo}
            />
          )}
          {phase === "scenario" && selectedVeiculo && (
            <ScenarioPhase
              key="scenario"
              veiculo={selectedVeiculo}
              fotos={fotosVeiculo}
              cenario={venStudio.cenario}
              tier={venStudio.tier}
              onCenarioChange={venStudio.setCenario}
              onTierChange={venStudio.setTier}
              confirmou={confirmou}
              onConfirmouChange={setConfirmou}
              onBack={reset}
              onProcess={startProcessing}
            />
          )}
          {phase === "processing" && (
            <ProcessingPhase
              key="processing"
              fotos={venStudio.fotos}
              progresso={venStudio.progresso}
              cenario={venStudio.cenario}
            />
          )}
          {phase === "result" && selectedVeiculo && (
            <ResultPhase
              key="result"
              fotos={venStudio.fotos}
              fotosOriginais={fotosVeiculo}
              cenarioId={venStudio.cenario}
              veiculo={selectedVeiculo}
              onReset={reset}
              onReverter={(i) => venStudio.reverterFoto(i)}
            />
          )}
        </AnimatePresence>
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
        <p className="text-sm text-muted-foreground">Selecione o veículo cujas fotos você deseja processar</p>
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
                <img src={fotoCapa(v)} alt={v.modelo} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{v.marca} {v.modelo} {v.versao}</p>
                  <p className="text-sm text-muted-foreground">{v.ano} · {v.fotos_veiculo.length} fotos</p>
                </div>
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
function ScenarioPhase({ veiculo, fotos, cenario, tier, onCenarioChange, onTierChange, confirmou, onConfirmouChange, onBack, onProcess }: {
  veiculo: VeiculoAnunciante;
  fotos: FotoVeiculo[];
  cenario: CenarioId;
  tier: Tier;
  onCenarioChange: (c: CenarioId) => void;
  onTierChange: (t: Tier) => void;
  confirmou: boolean;
  onConfirmouChange: (v: boolean) => void;
  onBack: () => void;
  onProcess: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">
            {veiculo.marca} {veiculo.modelo} {veiculo.versao}
          </h2>
          <p className="text-sm text-muted-foreground">{fotos.length} fotos</p>
        </div>
      </div>

      {/* Garantia */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-3 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-green-700 dark:text-green-400">Veículo preservado pixel a pixel.</span> Apenas o fundo é alterado.
          </p>
        </CardContent>
      </Card>

      {/* Fotos preview */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {fotos.map((f, i) => (
          <div key={f.id} className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-border">
            <img src={f.url_original} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Cenários */}
      <div>
        <h3 className="text-base font-semibold mb-3">Cenário</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CENARIOS_VENSTUDIO.map((s) => {
            const cfg = CENARIOS[s.id as CenarioId];
            const thumb = fundoUrl(s.id as CenarioId, VARIACOES[s.id as CenarioId][0]);
            return (
              <Card
                key={s.id}
                onClick={() => onCenarioChange(s.id as CenarioId)}
                className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                  cenario === s.id ? "ring-2 ring-primary shadow-lg" : ""
                }`}
              >
                <div className="h-20 overflow-hidden">
                  <img src={thumb} alt={cfg.nome} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-3">
                  <p className="font-semibold text-sm">{cfg.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</p>
                  {cenario === s.id && (
                    <Badge className="mt-2 bg-primary/10 text-primary text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Selecionado
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Tier toggle */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-trust-medium" /> Qualidade Premium (IA Avançada)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Fundo gerado por IA. Exclusivo Premium.</p>
          </div>
          <Switch checked={tier === 'C'} onCheckedChange={(v) => onTierChange(v ? 'C' : 'B')} />
        </CardContent>
      </Card>

      {/* Checkbox legal */}
      <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmou}
          onChange={(e) => onConfirmouChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-muted-foreground">
          Confirmo que as fotos processadas representam fielmente o veículo real.
        </span>
      </label>

      {/* Process button */}
      <Button onClick={onProcess} disabled={!confirmou || fotos.length === 0} className="w-full bg-primary hover:bg-primary/90">
        <Wand2 className="h-4 w-4 mr-2" /> Processar {fotos.length} foto(s) — Tier {tier}
      </Button>
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
  const done = fotos.filter((f) => f.status === "concluido" || f.status === "erro" || f.status === "rejeitado").length;
  const current = fotos.find((f) => f.status === "segmentando" || f.status === "compondo");
  const stepLabel = current?.status === "segmentando" ? "Removendo fundo..." : current?.status === "compondo" ? "Compondo cenário..." : "Finalizando...";

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
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">VenStudio processando</h2>
        <p className="text-muted-foreground mt-1">
          Cenário: <span className="font-medium text-foreground">{CENARIOS[cenario as CenarioId]?.nome || cenario}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progresso} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{stepLabel}</span>
          <span>{done}/{total}</span>
        </div>
      </div>

      <div className="flex justify-center gap-1">
        {fotos.map((f, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              f.status === "concluido" ? "bg-primary scale-100"
                : f.status === "erro" ? "bg-destructive scale-100"
                : f.status === "rejeitado" ? "bg-amber-500 scale-100"
                : f.status === "segmentando" || f.status === "compondo" ? "bg-primary/50 scale-110 animate-pulse"
                : "bg-muted scale-75"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ──── Result Phase ──── */
function ResultPhase({ fotos, fotosOriginais, cenarioId, veiculo, onReset, onReverter }: {
  fotos: FotoProcessamento[];
  fotosOriginais: FotoVeiculo[];
  cenarioId: CenarioId;
  veiculo: VeiculoAnunciante;
  onReset: () => void;
  onReverter: (i: number) => void;
}) {
  const navigate = useNavigate();
  const [activePhoto, setActivePhoto] = useState(0);
  const [deletando, setDeletando] = useState<number | null>(null);

  const fotosOk = fotos.filter((f) => f.status === "concluido").length;
  const fotosErro = fotos.filter((f) => f.status === "erro").length;
  const fotosRejeitadas = fotos.filter((f) => f.status === "rejeitado").length;
  const activeFoto = fotos[activePhoto];
  const activeOriginal = fotosOriginais[activePhoto];
  const cenarioConfig = CENARIOS[cenarioId];

  async function handleDeleteProcessada(idx: number) {
    const foto = fotosOriginais[idx];
    if (!foto) return;
    setDeletando(idx);
    await supabase
      .from("fotos_veiculo")
      .update({ url_processada: null, processada_por_ia: false, cenario_ia: null })
      .eq("id", foto.id);
    onReverter(idx);
    setDeletando(null);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Processamento Concluído
          </h2>
          <p className="text-sm text-muted-foreground">
            {fotosOk} processada(s) com {cenarioConfig.nome}
            {fotosErro > 0 && ` · ${fotosErro} erro(s)`}
            {fotosRejeitadas > 0 && ` · ${fotosRejeitadas} rejeitada(s) (integridade)`}
          </p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-1" /> Processar outro
        </Button>
      </div>

      {/* Before/After */}
      {activeFoto?.urlProcessada && activeOriginal && (
        <BeforeAfterSlider before={activeOriginal.url_original} after={activeFoto.urlProcessada} />
      )}

      {activeFoto?.status === "erro" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Erro ao processar</p>
              <p className="text-xs text-muted-foreground">{activeFoto.erro}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeFoto?.status === "rejeitado" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Integridade não aprovada</p>
              <p className="text-xs text-muted-foreground">{activeFoto.erro} A foto original foi mantida.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {activeFoto?.status === "concluido" && activeFoto.urlProcessada && (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={deletando === activePhoto}
            onClick={() => handleDeleteProcessada(activePhoto)}
          >
            {deletando === activePhoto ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Descartar processada
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
            {foto.status === "rejeitado" && (
              <div className="absolute bottom-0 right-0 bg-amber-500 rounded-tl p-0.5">
                <ShieldCheck className="h-2.5 w-2.5 text-white" />
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

      {/* Bottom actions */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Save className="h-4 w-4 text-primary" />
              Fotos salvas automaticamente no anúncio
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {veiculo.marca} {veiculo.modelo} — {fotosOk} foto(s) atualizadas
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/veiculo/${veiculo.slug}`)}>
            <ExternalLink className="h-4 w-4 mr-1" /> Ver anúncio
          </Button>
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
    setSliderPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden aspect-[16/9] cursor-col-resize select-none"
      onMouseMove={(e) => { if (isDragging.current) updatePosition(e.clientX); }}
      onMouseUp={() => { isDragging.current = false; }}
      onMouseLeave={() => { isDragging.current = false; }}
      onTouchMove={(e) => updatePosition(e.touches[0].clientX)}
    >
      <div className="absolute inset-0">
        <img src={after} alt="Depois" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
        <img src={before} alt="Antes" className="w-full h-full object-cover" />
      </div>
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
        style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
        onMouseDown={() => { isDragging.current = true; }}
        onTouchStart={() => { isDragging.current = true; }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <Badge className="absolute top-3 left-3 bg-black/60 text-white border-0">Antes</Badge>
      <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0">
        <Sparkles className="h-3 w-3 mr-1" /> Depois
      </Badge>
    </div>
  );
}
