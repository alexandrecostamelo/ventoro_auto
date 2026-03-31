import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Upload, Camera, X, ChevronRight, CheckCircle2, Sparkles,
  Download, RotateCcw, SlidersHorizontal, Image as ImageIcon,
  Building2, Trees, Palette, Sun, Layers, ArrowRight, GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Navbar } from "@/components/Navbar";

const SCENARIOS = [
  { id: "showroom", name: "Showroom Premium", icon: Building2, desc: "Fundo profissional de concessionária", gradient: "from-slate-800 to-slate-900" },
  { id: "neutro", name: "Fundo Neutro", icon: Layers, desc: "Fundo limpo branco ou cinza", gradient: "from-gray-200 to-gray-300" },
  { id: "urbano", name: "Cenário Urbano", icon: Building2, desc: "Paisagem urbana moderna", gradient: "from-blue-900 to-indigo-900" },
  { id: "natureza", name: "Natureza", icon: Trees, desc: "Cenário natural e verde", gradient: "from-emerald-800 to-green-900" },
  { id: "sunset", name: "Golden Hour", icon: Sun, desc: "Iluminação dourada ao pôr do sol", gradient: "from-amber-600 to-orange-700" },
  { id: "studio", name: "Estúdio 360°", icon: Palette, desc: "Iluminação de estúdio profissional", gradient: "from-zinc-700 to-zinc-800" },
];

const ENHANCEMENTS = [
  { id: "bg_remove", label: "Remover fundo", active: true },
  { id: "light_fix", label: "Correção de luz", active: true },
  { id: "color_enhance", label: "Realce de cores", active: true },
  { id: "reflection", label: "Reflexo no piso", active: false },
  { id: "shadow", label: "Sombra realista", active: true },
];

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
];

type Phase = "upload" | "scenario" | "processing" | "result";

export default function VenStudioPage() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("showroom");
  const [enhancements, setEnhancements] = useState(ENHANCEMENTS);
  const [processProgress, setProcessProgress] = useState(0);
  const [processedIndex, setProcessedIndex] = useState(0);

  const addMockPhoto = () => {
    if (photos.length < 20) {
      const next = MOCK_IMAGES[photos.length % MOCK_IMAGES.length];
      setPhotos(prev => [...prev, next]);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleEnhancement = (id: string) => {
    setEnhancements(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const startProcessing = () => {
    setPhase("processing");
    setProcessProgress(0);
    setProcessedIndex(0);
    const total = photos.length;
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setProcessProgress(Math.round((current / total) * 100));
      setProcessedIndex(current);
      if (current >= total) {
        clearInterval(interval);
        setTimeout(() => setPhase("result"), 600);
      }
    }, 1200);
  };

  const reset = () => {
    setPhase("upload");
    setPhotos([]);
    setProcessProgress(0);
    setProcessedIndex(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Wand2 className="h-4 w-4" /> VenStudio IA
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-display)]">
            Transforme suas fotos em imagens profissionais
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Remoção de fundo, cenários premium e correções automáticas com inteligência artificial
          </p>

          {/* Phase Indicator */}
          {phase !== "upload" && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {(["upload", "scenario", "processing", "result"] as Phase[]).map((p, i) => (
                <div key={p} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    phase === p ? "bg-primary text-primary-foreground scale-110" :
                    (["upload", "scenario", "processing", "result"].indexOf(phase) > i)
                      ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  {i < 3 && <div className={`w-8 h-0.5 ${
                    (["upload", "scenario", "processing", "result"].indexOf(phase) > i) ? "bg-primary" : "bg-muted"
                  }`} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {phase === "upload" && (
            <UploadPhase
              key="upload"
              photos={photos}
              addPhoto={addMockPhoto}
              removePhoto={removePhoto}
              onNext={() => setPhase("scenario")}
            />
          )}
          {phase === "scenario" && (
            <ScenarioPhase
              key="scenario"
              selected={selectedScenario}
              onSelect={setSelectedScenario}
              enhancements={enhancements}
              toggleEnhancement={toggleEnhancement}
              photoCount={photos.length}
              onBack={() => setPhase("upload")}
              onProcess={startProcessing}
            />
          )}
          {phase === "processing" && (
            <ProcessingPhase
              key="processing"
              progress={processProgress}
              processedIndex={processedIndex}
              total={photos.length}
              scenario={SCENARIOS.find(s => s.id === selectedScenario)!.name}
            />
          )}
          {phase === "result" && (
            <ResultPhase
              key="result"
              photos={photos}
              scenario={SCENARIOS.find(s => s.id === selectedScenario)!}
              onReset={reset}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ──── Upload Phase ──── */
function UploadPhase({ photos, addPhoto, removePhoto, onNext }: {
  photos: string[]; addPhoto: () => void; removePhoto: (i: number) => void; onNext: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <p className="font-semibold text-lg">Arraste suas fotos aqui</p>
          <p className="text-sm text-muted-foreground mb-4">JPG, PNG ou WEBP • até 10MB cada • máx. 20 fotos</p>
          <Button onClick={addPhoto} className="bg-primary hover:bg-primary/90">
            <Camera className="h-4 w-4 mr-2" /> Selecionar Fotos (Simulado)
          </Button>
        </CardContent>
      </Card>

      {photos.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-semibold">{photos.length} foto(s) adicionada(s)</p>
            <Badge variant="outline">{photos.length}/20</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-muted">
                <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <Badge className="absolute bottom-2 left-2 bg-background/80 text-foreground text-[10px]">{idx + 1}</Badge>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={onNext} className="bg-primary hover:bg-primary/90">
              Escolher Cenário <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ──── Scenario Phase ──── */
function ScenarioPhase({ selected, onSelect, enhancements, toggleEnhancement, photoCount, onBack, onProcess }: {
  selected: string; onSelect: (id: string) => void; enhancements: typeof ENHANCEMENTS;
  toggleEnhancement: (id: string) => void; photoCount: number; onBack: () => void; onProcess: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <div>
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)] mb-1">Escolha o Cenário</h2>
        <p className="text-sm text-muted-foreground">Selecione o fundo ideal para suas fotos</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SCENARIOS.map(s => {
          const Icon = s.icon;
          return (
            <Card
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selected === s.id ? "ring-2 ring-primary shadow-lg" : ""
              }`}
            >
              <CardContent className="p-0">
                <div className={`h-28 bg-gradient-to-br ${s.gradient} rounded-t-lg flex items-center justify-center`}>
                  <Icon className="h-10 w-10 text-white/80" />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  {selected === s.id && (
                    <Badge className="mt-2 bg-primary/10 text-primary text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Selecionado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhancements */}
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-primary" /> Ajustes Automáticos
        </h3>
        <div className="flex flex-wrap gap-2">
          {enhancements.map(e => (
            <Badge
              key={e.id}
              variant={e.active ? "default" : "outline"}
              className={`cursor-pointer transition-all px-3 py-1.5 ${
                e.active ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-primary/10"
              }`}
              onClick={() => toggleEnhancement(e.id)}
            >
              {e.active && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {e.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Processar {photoCount} foto(s)
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cenário: {SCENARIOS.find(s => s.id === selected)?.name} •{" "}
              {enhancements.filter(e => e.active).length} ajustes ativos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>Voltar</Button>
            <Button onClick={onProcess} className="bg-primary hover:bg-primary/90">
              <Wand2 className="h-4 w-4 mr-2" /> Processar com IA
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ──── Processing Phase ──── */
function ProcessingPhase({ progress, processedIndex, total, scenario }: {
  progress: number; processedIndex: number; total: number; scenario: string;
}) {
  const steps = ["Analisando imagem...", "Removendo fundo...", "Aplicando cenário...", "Corrigindo iluminação...", "Finalizando..."];
  const currentStep = steps[Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1)];

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
          Cenário: <span className="font-medium text-foreground">{scenario}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{currentStep}</span>
          <span>{processedIndex}/{total} fotos</span>
        </div>
      </div>

      <div className="flex justify-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < processedIndex ? "bg-primary scale-100" : "bg-muted scale-75"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ──── Result Phase with Before/After Slider ──── */
function ResultPhase({ photos, scenario, onReset }: {
  photos: string[]; scenario: typeof SCENARIOS[number]; onReset: () => void;
}) {
  const [activePhoto, setActivePhoto] = useState(0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Processamento Concluído!
          </h2>
          <p className="text-sm text-muted-foreground">{photos.length} fotos processadas com {scenario.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Novas Fotos
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-1" /> Baixar Todas
          </Button>
        </div>
      </div>

      {/* Before/After Slider */}
      <BeforeAfterSlider
        before={photos[activePhoto]}
        scenarioGradient={scenario.gradient}
      />

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {photos.map((photo, idx) => (
          <button
            key={idx}
            onClick={() => setActivePhoto(idx)}
            className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all ${
              activePhoto === idx ? "ring-2 ring-primary scale-105" : "opacity-60 hover:opacity-100"
            }`}
          >
            <img src={photo} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Fotos processadas", value: photos.length.toString() },
          { label: "Fundo removido", value: "100%" },
          { label: "Qualidade", value: "HD" },
          { label: "Cenário", value: scenario.name },
        ].map(stat => (
          <Card key={stat.label} className="bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="font-bold text-primary font-[family-name:var(--font-mono)]">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

/* ──── Before/After Comparison Slider ──── */
function BeforeAfterSlider({ before, scenarioGradient }: { before: string; scenarioGradient: string }) {
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
      <div className={`absolute inset-0 bg-gradient-to-br ${scenarioGradient}`}>
        <img src={before} alt="Depois" className="w-full h-full object-cover brightness-110 contrast-105 saturate-110" />
      </div>

      {/* "Before" — clipped */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
        <img src={before} alt="Antes" className="w-full h-full object-cover grayscale-[20%] brightness-90" />
        <div className="absolute inset-0 bg-black/10" />
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
