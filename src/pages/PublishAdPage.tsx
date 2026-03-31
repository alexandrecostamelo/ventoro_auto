import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Camera, Wand2, MessageSquareText, DollarSign, Crown, CheckCircle2,
  ChevronLeft, ChevronRight, Upload, X, Sparkles, AlertTriangle, Info,
  Fuel, Gauge, Palette, Zap, Settings2, MapPin, FileText, Star,
  Image as ImageIcon, Eye, ArrowRight, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";

const STEPS = [
  { id: 1, label: "Dados", icon: Car },
  { id: 2, label: "Fotos", icon: Camera },
  { id: 3, label: "VenStudio", icon: Wand2 },
  { id: 4, label: "Copiloto", icon: MessageSquareText },
  { id: 5, label: "Preço", icon: DollarSign },
  { id: 6, label: "Plano", icon: Crown },
  { id: 7, label: "Sucesso", icon: CheckCircle2 },
];

const MARCAS = ["Toyota", "Honda", "Volkswagen", "Chevrolet", "Hyundai", "Jeep", "Fiat", "BMW", "Mercedes-Benz", "Audi"];
const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico", "Híbrido"];
const CAMBIOS = ["Automático", "Manual", "CVT", "Automatizado"];
const CORES = ["Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Verde"];

interface FormData {
  marca: string; modelo: string; versao: string; ano: string;
  quilometragem: string; combustivel: string; cambio: string;
  cor: string; potencia: string; cidade: string; estado: string;
  opcionais: string[];
  fotos: string[];
  studioProcessed: boolean;
  descricao: string;
  preco: string;
  aceitaTroca: boolean;
  plano: string;
}

const OPCIONAIS_LIST = [
  "Ar-condicionado", "Direção elétrica", "Vidro elétrico", "Trava elétrica",
  "Airbag", "ABS", "Câmera de ré", "Sensor de estacionamento",
  "Central multimídia", "Banco de couro", "Teto solar", "Rodas de liga",
  "Piloto automático", "Start/Stop", "Farol de LED", "Keyless entry"
];

const MOCK_PHOTOS = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=400",
];

export default function PublishAdPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    marca: "", modelo: "", versao: "", ano: "", quilometragem: "",
    combustivel: "", cambio: "", cor: "", potencia: "", cidade: "", estado: "",
    opcionais: [], fotos: [], studioProcessed: false,
    descricao: "", preco: "", aceitaTroca: false, plano: "destaque",
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [studioProcessing, setStudioProcessing] = useState(false);

  const progress = (step / STEPS.length) * 100;

  const updateForm = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleOpcional = (op: string) => {
    setForm(prev => ({
      ...prev,
      opcionais: prev.opcionais.includes(op)
        ? prev.opcionais.filter(o => o !== op)
        : [...prev.opcionais, op]
    }));
  };

  const addMockPhoto = () => {
    const next = MOCK_PHOTOS[form.fotos.length % MOCK_PHOTOS.length];
    updateForm("fotos", [...form.fotos, next]);
  };

  const removePhoto = (idx: number) => {
    updateForm("fotos", form.fotos.filter((_, i) => i !== idx));
  };

  const simulateStudio = () => {
    setStudioProcessing(true);
    setTimeout(() => {
      setStudioProcessing(false);
      updateForm("studioProcessed", true);
    }, 2500);
  };

  const simulateAI = () => {
    setAiGenerating(true);
    setTimeout(() => {
      updateForm("descricao",
        `${form.marca} ${form.modelo} ${form.versao} ${form.ano} em excelente estado de conservação. ` +
        `Com apenas ${form.quilometragem || "XX.XXX"} km rodados, este veículo conta com motor ${form.combustivel || "flex"} e câmbio ${form.cambio || "automático"}. ` +
        `Equipado com ${form.opcionais.slice(0, 4).join(", ") || "diversos opcionais"}, oferece conforto e segurança para toda a família. ` +
        `IPVA pago, revisões em dia e sem qualquer pendência. Único dono, nunca batido. Oportunidade imperdível!`
      );
      setAiGenerating(false);
    }, 2000);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 7));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {step < 7 && (
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Etapa {step} de 7
              </span>
              <span className="text-sm font-medium text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-1.5 mb-3" />
            <div className="flex gap-1">
              {STEPS.map(s => {
                const Icon = s.icon;
                const isActive = s.id === step;
                const isDone = s.id < step;
                return (
                  <button
                    key={s.id}
                    onClick={() => s.id < step && setStep(s.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : isDone
                        ? "text-primary/70 cursor-pointer hover:bg-primary/5"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 1 && <StepVehicleData form={form} updateForm={updateForm} toggleOpcional={toggleOpcional} />}
            {step === 2 && <StepPhotos form={form} addPhoto={addMockPhoto} removePhoto={removePhoto} />}
            {step === 3 && <StepStudio form={form} processing={studioProcessing} onProcess={simulateStudio} />}
            {step === 4 && <StepCopilot form={form} updateForm={updateForm} generating={aiGenerating} onGenerate={simulateAI} />}
            {step === 5 && <StepPricing form={form} updateForm={updateForm} />}
            {step === 6 && <StepPlan form={form} updateForm={updateForm} />}
            {step === 7 && <StepSuccess form={form} navigate={navigate} />}
          </motion.div>
        </AnimatePresence>

        {step < 7 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <Button onClick={nextStep} className="bg-primary hover:bg-primary/90">
              {step === 6 ? "Publicar Anúncio" : "Continuar"} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────── Step 1: Vehicle Data ──────────── */
function StepVehicleData({ form, updateForm, toggleOpcional }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Dados do Veículo</h2>
        <p className="text-muted-foreground mt-1">Preencha as informações do seu veículo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Marca *</Label>
          <Select value={form.marca} onValueChange={v => updateForm("marca", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{MARCAS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Modelo *</Label>
          <Input placeholder="Ex: Corolla" value={form.modelo} onChange={e => updateForm("modelo", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Versão</Label>
          <Input placeholder="Ex: Altis Premium" value={form.versao} onChange={e => updateForm("versao", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Ano *</Label>
          <Input placeholder="Ex: 2023" type="number" value={form.ano} onChange={e => updateForm("ano", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Quilometragem *</Label>
          <Input placeholder="Ex: 25000" type="number" value={form.quilometragem} onChange={e => updateForm("quilometragem", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Combustível</Label>
          <Select value={form.combustivel} onValueChange={v => updateForm("combustivel", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{COMBUSTIVEIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Câmbio</Label>
          <Select value={form.cambio} onValueChange={v => updateForm("cambio", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{CAMBIOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cor</Label>
          <Select value={form.cor} onValueChange={v => updateForm("cor", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{CORES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Potência</Label>
          <Input placeholder="Ex: 177 cv" value={form.potencia} onChange={e => updateForm("potencia", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input placeholder="Ex: São Paulo" value={form.cidade} onChange={e => updateForm("cidade", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Input placeholder="Ex: SP" value={form.estado} onChange={e => updateForm("estado", e.target.value)} />
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold">Opcionais</Label>
        <p className="text-sm text-muted-foreground mb-3">Selecione os itens do veículo</p>
        <div className="flex flex-wrap gap-2">
          {OPCIONAIS_LIST.map(op => (
            <Badge
              key={op}
              variant={form.opcionais.includes(op) ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                form.opcionais.includes(op)
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-primary/10"
              }`}
              onClick={() => toggleOpcional(op)}
            >
              {op}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────── Step 2: Photos ──────────── */
function StepPhotos({ form, addPhoto, removePhoto }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Fotos do Veículo</h2>
        <p className="text-muted-foreground mt-1">Adicione até 20 fotos do seu veículo</p>
      </div>

      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-10 w-10 text-primary mb-3" />
          <p className="font-semibold text-foreground">Arraste suas fotos aqui</p>
          <p className="text-sm text-muted-foreground mb-4">JPG, PNG ou WEBP até 10MB cada</p>
          <Button variant="outline" onClick={addPhoto}>
            <Camera className="h-4 w-4 mr-2" /> Selecionar Fotos (Simulado)
          </Button>
        </CardContent>
      </Card>

      {form.fotos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">{form.fotos.length} foto(s) adicionada(s)</Label>
            <Badge variant="outline">{form.fotos.length}/20</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {form.fotos.map((foto: string, idx: number) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden aspect-[4/3]">
                <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px]">Capa</Badge>
                )}
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-muted/50 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Dicas para boas fotos</p>
          <ul className="mt-1 space-y-1 list-disc pl-4">
            <li>Fotografe em local bem iluminado</li>
            <li>Inclua fotos de todos os ângulos externos</li>
            <li>Fotografe o painel, bancos e porta-malas</li>
            <li>A primeira foto será a capa do anúncio</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ──────────── Step 3: VenStudio IA ──────────── */
function StepStudio({ form, processing, onProcess }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" /> VenStudio IA
        </h2>
        <p className="text-muted-foreground mt-1">
          Transforme suas fotos em imagens profissionais com IA
        </p>
      </div>

      {form.fotos.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-trust-medium mb-3" />
            <p className="font-semibold">Nenhuma foto adicionada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Volte à etapa anterior para adicionar fotos
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["Showroom Premium", "Fundo Neutro", "Cenário Urbano"].map((cenario, i) => (
              <Card
                key={cenario}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  i === 0 ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="p-4 text-center">
                  <div className="h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center mb-3">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">{cenario}</p>
                  {i === 0 && <Badge className="mt-2 bg-primary/10 text-primary text-[10px]">Recomendado</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Processar {form.fotos.length} foto(s) com VenStudio IA
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remoção de fundo, correção de luz e aplicação de cenário
                  </p>
                </div>
                <Button
                  onClick={onProcess}
                  disabled={processing || form.studioProcessed}
                  className="bg-primary hover:bg-primary/90"
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                        <Wand2 className="h-4 w-4" />
                      </motion.div>
                      Processando...
                    </span>
                  ) : form.studioProcessed ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Processado
                    </span>
                  ) : (
                    "Aplicar VenStudio"
                  )}
                </Button>
              </div>

              {processing && (
                <div className="mt-4">
                  <Progress value={65} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Removendo fundo e aplicando cenário...</p>
                </div>
              )}

              {form.studioProcessed && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Antes</p>
                    <div className="rounded-lg overflow-hidden aspect-[4/3] bg-muted">
                      <img src={form.fotos[0]} alt="Antes" className="w-full h-full object-cover opacity-70" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary mb-2">Depois ✨</p>
                    <div className="rounded-lg overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5">
                      <img src={form.fotos[0]} alt="Depois" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ──────────── Step 4: AI Copilot ──────────── */
function StepCopilot({ form, updateForm, generating, onGenerate }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
          <MessageSquareText className="h-6 w-6 text-primary" /> Copiloto Ventoro IA
        </h2>
        <p className="text-muted-foreground mt-1">
          A IA gera a descrição perfeita baseada nos dados do seu veículo
        </p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Gerar descrição com IA</p>
            <p className="text-xs text-muted-foreground">
              Baseada em {form.marca || "marca"} {form.modelo || "modelo"}, {form.opcionais.length} opcionais
            </p>
          </div>
          <Button onClick={onGenerate} disabled={generating} size="sm" className="bg-primary hover:bg-primary/90">
            {generating ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Sparkles className="h-4 w-4" />
              </motion.div>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-1" /> Gerar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Descrição do Anúncio</Label>
        <Textarea
          placeholder="Descreva seu veículo ou use a IA para gerar..."
          value={form.descricao}
          onChange={e => updateForm("descricao", e.target.value)}
          rows={8}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{form.descricao.length}/2000 caracteres</p>
      </div>

      {form.descricao && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Pré-visualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{form.descricao}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ──────────── Step 5: Pricing ──────────── */
function StepPricing({ form, updateForm }: any) {
  const precoNum = Number(form.preco) || 0;
  const sugeridoMin = 95000;
  const sugeridoMax = 115000;
  const status = precoNum === 0 ? null : precoNum < sugeridoMin ? "abaixo" : precoNum > sugeridoMax ? "acima" : "na_media";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Definir Preço</h2>
        <p className="text-muted-foreground mt-1">A Ventoro IA analisa o mercado para recomendar o melhor preço</p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Análise de Mercado Ventoro IA</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-background rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Mínimo</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-trust-low">
                R$ {sugeridoMin.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="bg-background rounded-xl p-4 ring-2 ring-primary">
              <p className="text-xs text-primary font-medium">Recomendado</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-primary">
                R$ {Math.round((sugeridoMin + sugeridoMax) / 2).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="bg-background rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Máximo</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-trust-medium">
                R$ {sugeridoMax.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Preço de Venda (R$) *</Label>
        <Input
          type="number"
          placeholder="Ex: 105000"
          value={form.preco}
          onChange={e => updateForm("preco", e.target.value)}
          className="text-xl font-bold font-[family-name:var(--font-mono)]"
        />
        {status && (
          <Badge variant="outline" className={
            status === "abaixo" ? "text-trust-high border-trust-high" :
            status === "acima" ? "text-trust-low border-trust-low" :
            "text-primary border-primary"
          }>
            {status === "abaixo" ? "Abaixo da média — venda rápida" :
             status === "acima" ? "Acima da média — pode demorar mais" :
             "Dentro da faixa ideal ✓"}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
        <div>
          <p className="font-medium text-sm">Aceita troca?</p>
          <p className="text-xs text-muted-foreground">Habilite se considerar propostas de troca</p>
        </div>
        <Switch checked={form.aceitaTroca} onCheckedChange={v => updateForm("aceitaTroca", v)} />
      </div>
    </div>
  );
}

/* ──────────── Step 6: Plan Selection ──────────── */
function StepPlan({ form, updateForm }: any) {
  const plans = [
    { id: "gratis", name: "Grátis", price: "R$ 0", desc: "Anúncio básico por 30 dias", features: ["1 foto", "Listagem padrão", "30 dias de duração"] },
    { id: "destaque", name: "Destaque", price: "R$ 49,90", desc: "Mais visibilidade e recursos", features: ["20 fotos", "Selo destaque", "VenStudio IA incluso", "Landing page", "60 dias de duração"], recommended: true },
    { id: "premium", name: "Premium", price: "R$ 99,90", desc: "Máxima exposição e IA completa", features: ["20 fotos + vídeo", "Destaque na home", "VenStudio + Copiloto IA", "Landing page premium", "Relatório de leads", "90 dias de duração"] },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Escolha seu Plano</h2>
        <p className="text-muted-foreground mt-1">Selecione o plano ideal para vender mais rápido</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <Card
            key={plan.id}
            className={`cursor-pointer transition-all hover:shadow-lg relative ${
              form.plano === plan.id ? "ring-2 ring-primary shadow-lg" : ""
            } ${plan.recommended ? "border-primary" : ""}`}
            onClick={() => updateForm("plano", plan.id)}
          >
            {plan.recommended && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                <Star className="h-3 w-3 mr-1" /> Mais popular
              </Badge>
            )}
            <CardContent className="p-6 text-center">
              <Crown className={`h-8 w-8 mx-auto mb-3 ${
                plan.id === "premium" ? "text-trust-medium" :
                plan.id === "destaque" ? "text-primary" : "text-muted-foreground"
              }`} />
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="text-2xl font-bold font-[family-name:var(--font-mono)] text-primary mt-1">{plan.price}</p>
              <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
              <Separator className="my-4" />
              <ul className="space-y-2 text-sm text-left">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {form.plano === plan.id && (
                <Badge className="mt-4 bg-primary text-primary-foreground">Selecionado ✓</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ──────────── Step 7: Success ──────────── */
function StepSuccess({ form, navigate }: any) {
  return (
    <div className="text-center py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6"
      >
        <CheckCircle2 className="h-12 w-12 text-primary" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-3xl font-bold font-[family-name:var(--font-display)]">Anúncio Publicado!</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Seu {form.marca} {form.modelo} {form.versao} já está no ar.
          Você receberá notificações quando alguém demonstrar interesse.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
          <Card className="bg-primary/5">
            <CardContent className="p-4 text-center">
              <Eye className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Visibilidade</p>
              <p className="font-bold text-sm">Alta</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5">
            <CardContent className="p-4 text-center">
              <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="font-bold text-sm">92/100</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5">
            <CardContent className="p-4 text-center">
              <Sparkles className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">IA ativa</p>
              <p className="font-bold text-sm">Sim</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button onClick={() => navigate("/minha-conta/anuncios")} className="bg-primary hover:bg-primary/90">
            Ver Meus Anúncios <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar à Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
