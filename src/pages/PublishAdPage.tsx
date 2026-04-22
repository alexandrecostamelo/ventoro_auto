import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Camera, Wand2, MessageSquareText, DollarSign, Crown, CheckCircle2,
  ChevronLeft, ChevronRight, Upload, X, Sparkles, AlertTriangle, Info,
  FileText, Star, Image as ImageIcon, Eye, ArrowRight, Shield,
  RotateCcw, Lightbulb, ChevronDown, Plus, Trash2, Lock, ShieldCheck, Loader2,
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
import { Navbar } from "@/components/Navbar";
import { usePublicarVeiculo, type DadosNovoVeiculo, type FotoPublicada } from "@/hooks/usePublicarVeiculo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { validarArquivoImagem } from "@/utils/imageCompression";
import { useVenStudioV2, type FotoResultado } from "@/hooks/useVenStudioV2";
import { CENARIOS_V2, CENARIOS_V2_LIST, type CenarioV2Id } from "@/lib/venstudio-cenarios-v2";

const STEPS = [
  { id: 1, label: "Dados", icon: Car },
  { id: 2, label: "Fotos", icon: Camera },
  { id: 3, label: "VenStudio", icon: Wand2 },
  { id: 4, label: "Copiloto", icon: MessageSquareText },
  { id: 5, label: "Preço", icon: DollarSign },
  { id: 6, label: "Plano", icon: Crown },
  { id: 7, label: "Sucesso", icon: CheckCircle2 },
];

const MARCAS = [
  "Toyota", "Honda", "Volkswagen", "Chevrolet", "Hyundai",
  "Jeep", "Fiat", "BMW", "Mercedes-Benz", "Audi",
];

// Valores em lowercase para corresponder ao enum do banco
const COMBUSTIVEIS = [
  { label: "Flex", value: "flex" },
  { label: "Gasolina", value: "gasolina" },
  { label: "Etanol", value: "etanol" },
  { label: "Diesel", value: "diesel" },
  { label: "Elétrico", value: "eletrico" },
  { label: "Híbrido", value: "hibrido" },
];

// "Automatizado" removido — não existe no schema
const CAMBIOS = [
  { label: "Automático", value: "automatico" },
  { label: "Manual", value: "manual" },
  { label: "CVT", value: "cvt" },
];

const CORES = ["Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Verde"];

const CONDICOES = [
  { label: "Excelente", value: "excelente" },
  { label: "Ótimo", value: "otimo" },
  { label: "Bom", value: "bom" },
  { label: "Regular", value: "regular" },
];

const OPCIONAIS_LIST = [
  "Ar-condicionado", "Direção elétrica", "Vidro elétrico", "Trava elétrica",
  "Airbag", "ABS", "Câmera de ré", "Sensor de estacionamento",
  "Central multimídia", "Banco de couro", "Teto solar", "Rodas de liga",
  "Piloto automático", "Start/Stop", "Farol de LED", "Keyless entry",
];

const MAX_FOTOS = 15;

interface FormData extends DadosNovoVeiculo {}

function validarStep(step: number, form: FormData): string | null {
  if (step === 1) {
    if (!form.marca) return "Selecione a marca do veículo.";
    if (!form.modelo.trim()) return "Informe o modelo do veículo.";
    if (!form.ano || isNaN(parseInt(form.ano, 10))) return "Informe um ano válido.";
    if (!form.quilometragem) return "Informe a quilometragem.";
    if (!form.combustivel) return "Selecione o tipo de combustível.";
    if (!form.cambio) return "Selecione o câmbio.";
    if (!form.cidade.trim()) return "Informe a cidade.";
    if (!form.estado.trim()) return "Informe o estado (sigla, ex: SP).";
    return null;
  }
  if (step === 5) {
    if (!form.preco || Number(form.preco) <= 0) return "Informe um preço válido maior que zero.";
    return null;
  }
  return null;
}

export default function PublishAdPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { publicar, loading: publicando, error: publishError } = usePublicarVeiculo();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/entrar')
    }
  }, [user, authLoading, navigate])

  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [slugPublicado, setSlugPublicado] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

  // Fotos: File objects + object URLs para preview (separados do form)
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);

  const [form, setForm] = useState<FormData>({
    marca: "", modelo: "", versao: "", ano: "", quilometragem: "",
    combustivel: "", cambio: "", cor: "", potencia: "", cidade: "", estado: "",
    opcionais: [],
    condicao: "bom",
    fotos: [],
    studioProcessed: false,
    studioCenario: "showroom",
    studioMelhorarQualidade: false,
    titulo: "",
    descricao: "",
    destaques: [],
    faq: [],
    preco: "",
    aceitaTroca: false,
    ipva_pago: false,
    revisoes_em_dia: false,
    sem_sinistro: false,
    num_chaves: 1,
    plano: "premium",  // "destaque" no wizard, mapeado para "premium" no DB
  });

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSugestoes, setAiSugestoes] = useState<string[]>([]);
  const [aiGeracoes, setAiGeracoes] = useState(0);
  const [fotosPublicadas, setFotosPublicadas] = useState<FotoPublicada[]>([]);
  const venStudio = useVenStudioV2();
  const [studioCenario, setStudioCenario] = useState<CenarioV2Id>('showroom');
  const [studioOpcoes, setStudioOpcoes] = useState<{ light_direction?: string; light_strength?: number; preserve_subject?: number }>({});

  const progress = (step / STEPS.length) * 100;

  const updateForm = (field: keyof FormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleOpcional = (op: string) => {
    setForm((prev) => ({
      ...prev,
      opcionais: prev.opcionais.includes(op)
        ? prev.opcionais.filter((o) => o !== op)
        : [...prev.opcionais, op],
    }));
  };

  const handleFilesAdded = (files: File[]) => {
    const restantes = MAX_FOTOS - fotoFiles.length;
    if (restantes <= 0) {
      setStepError(`Limite de ${MAX_FOTOS} fotos atingido.`);
      return;
    }
    const toAdd = files.slice(0, restantes);
    const ignoradas = files.length - toAdd.length;
    const novosPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setFotoFiles((prev) => [...prev, ...toAdd]);
    setFotoPreviews((prev) => [...prev, ...novosPreviews]);
    if (ignoradas > 0) {
      setStepError(`Limite de ${MAX_FOTOS} fotos. ${ignoradas} foto(s) ignorada(s).`);
    } else {
      setStepError(null);
    }
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(fotoPreviews[idx]);
    setFotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setFotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // VenStudio pausado
  // const confirmarStudio = () => {
  //   updateForm("studioProcessed", true);
  //   updateForm("studioCenario", venStudio.cenario);
  // };

  const gerarComIA = async () => {
    setAiGenerating(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const { data, error } = await supabase.functions.invoke("gerar-descricao-veiculo", {
        body: {
          marca: form.marca, modelo: form.modelo, versao: form.versao,
          ano: form.ano, quilometragem: form.quilometragem,
          combustivel: form.combustivel, cambio: form.cambio,
          cor: form.cor, potencia: form.potencia,
          cidade: form.cidade, estado: form.estado,
          opcionais: form.opcionais, condicao: form.condicao,
          preco: form.preco || "0",
          ipva_pago: form.ipva_pago, revisoes_em_dia: form.revisoes_em_dia,
          sem_sinistro: form.sem_sinistro, fotos_count: fotoFiles.length,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      updateForm("titulo", data.titulo || "");
      updateForm("descricao", data.descricao || "");
      updateForm("destaques", data.destaques || []);
      updateForm("faq", data.faq || []);
      setAiSugestoes(data.sugestoes || []);
      setAiGeracoes((prev) => prev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setAiError(msg);
    } finally {
      setAiGenerating(false);
    }
  };

  const nextStep = () => {
    const erro = validarStep(step, form);
    if (erro) {
      setStepError(erro);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, 7));
  };

  const prevStep = () => {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handlePublicar = async () => {
    setUploadInfo(null);
    const resultado = await publicar(form, fotoFiles, (n, total) => {
      setUploadInfo(`Enviando fotos ${n}/${total}…`);
    });
    setUploadInfo(null);
    if (resultado) {
      setSlugPublicado(resultado.slug);
      setFotosPublicadas(resultado.fotos);
      setStep(7);

      // VenStudio V2: processamento é feito inline no Step 3 (Stability AI)
    }
  };

  const isPublishStep = step === 6;

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {step < 7 && (
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Etapa {step} de 6</span>
              <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 mb-3" />
            <div className="flex gap-1">
              {STEPS.filter((s) => s.id < 7).map((s) => {
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
            {step === 1 && (
              <StepVehicleData form={form} updateForm={updateForm} toggleOpcional={toggleOpcional} />
            )}
            {step === 2 && (
              <StepPhotos
                previews={fotoPreviews}
                onFilesAdded={handleFilesAdded}
                onRemove={removePhoto}
              />
            )}
            {step === 3 && (
              <StepStudio
                previews={fotoPreviews}
                cenario={studioCenario}
                onCenarioChange={setStudioCenario}
                opcoes={studioOpcoes}
                onOpcoesChange={setStudioOpcoes}
                venStudio={venStudio}
                veiculoId={slugPublicado}
                onSkip={() => updateForm("studioProcessed", false)}
                onConfirm={() => updateForm("studioProcessed", true)}
              />
            )}
            {step === 4 && (
              <StepCopilot
                form={form}
                updateForm={updateForm}
                generating={aiGenerating}
                aiError={aiError}
                sugestoes={aiSugestoes}
                geracoes={aiGeracoes}
                onGenerate={gerarComIA}
              />
            )}
            {step === 5 && <StepPricing form={form} updateForm={updateForm} />}
            {step === 6 && <StepPlan form={form} updateForm={updateForm} user={user} />}
            {step === 7 && (
              <StepSuccess
                form={form}
                navigate={navigate}
                slug={slugPublicado}
                studioFotos={[]}
                studioProgresso={0}
                studioProcessando={false}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {step < 7 && (
          <div className="mt-8 pt-6 border-t border-border space-y-3">
            {/* Erro de validação por etapa */}
            {stepError && (
              <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {stepError}
              </p>
            )}
            {/* Erro de publicação */}
            {isPublishStep && publishError && (
              <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {publishError.message}
              </p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep} disabled={step === 1 || publicando}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              {isPublishStep ? (
                <Button
                  onClick={handlePublicar}
                  disabled={publicando}
                  className="bg-primary hover:bg-primary/90"
                >
                  {publicando ? (
                    <span className="flex items-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      {uploadInfo ?? "Publicando…"}
                    </span>
                  ) : (
                    <>
                      {user?.user_metadata?.tipo === "garagem" ? "Publicar no estoque" : "Publicar anúncio"}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={nextStep} className="bg-primary hover:bg-primary/90">
                  Continuar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────── Step 1: Vehicle Data ──────────── */
function StepVehicleData({ form, updateForm, toggleOpcional }: {
  form: FormData;
  updateForm: (f: keyof FormData, v: unknown) => void;
  toggleOpcional: (op: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Dados do Veículo</h2>
        <p className="text-muted-foreground mt-1">Preencha as informações do seu veículo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Marca *</Label>
          <Select value={form.marca} onValueChange={(v) => updateForm("marca", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {MARCAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Modelo *</Label>
          <Input placeholder="Ex: Corolla" value={form.modelo} onChange={(e) => updateForm("modelo", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Versão</Label>
          <Input placeholder="Ex: Altis Premium" value={form.versao} onChange={(e) => updateForm("versao", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Ano *</Label>
          <Input placeholder="Ex: 2023" type="number" value={form.ano} onChange={(e) => updateForm("ano", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Quilometragem *</Label>
          <Input placeholder="Ex: 25000" type="number" value={form.quilometragem} onChange={(e) => updateForm("quilometragem", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Combustível *</Label>
          <Select value={form.combustivel} onValueChange={(v) => updateForm("combustivel", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {COMBUSTIVEIS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Câmbio *</Label>
          <Select value={form.cambio} onValueChange={(v) => updateForm("cambio", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {CAMBIOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cor</Label>
          <Select value={form.cor} onValueChange={(v) => updateForm("cor", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {CORES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Potência</Label>
          <Input placeholder="Ex: 177 cv" value={form.potencia} onChange={(e) => updateForm("potencia", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Cidade *</Label>
          <Input placeholder="Ex: São Paulo" value={form.cidade} onChange={(e) => updateForm("cidade", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Estado *</Label>
          <Input placeholder="Ex: SP" maxLength={2} value={form.estado} onChange={(e) => updateForm("estado", e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-2">
          <Label>Condição do veículo</Label>
          <Select value={form.condicao} onValueChange={(v) => updateForm("condicao", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONDICOES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold">Opcionais</Label>
        <p className="text-sm text-muted-foreground mb-3">Selecione os itens do veículo</p>
        <div className="flex flex-wrap gap-2">
          {OPCIONAIS_LIST.map((op) => (
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
function StepPhotos({
  previews,
  onFilesAdded,
  onRemove,
}: {
  previews: string[];
  onFilesAdded: (files: File[]) => void;
  onRemove: (idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setValidationError(null);
    const validos: File[] = [];
    const erros: string[] = [];
    for (const file of Array.from(fileList)) {
      const erro = validarArquivoImagem(file);
      if (erro) { erros.push(erro); continue; }
      validos.push(file);
    }
    if (erros.length > 0) setValidationError(erros[0]);
    if (validos.length > 0) onFilesAdded(validos);
    // Reset input so the same file can be re-selected after removal
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Fotos do Veículo</h2>
        <p className="text-muted-foreground mt-1">
          Adicione até {MAX_FOTOS} fotos — a primeira será a capa do anúncio
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => processFiles(e.target.files)}
      />

      {/* Drop zone */}
      <Card
        className={`border-dashed border-2 cursor-pointer transition-all select-none ${
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/8"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          processFiles(e.dataTransfer.files);
        }}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 pointer-events-none">
          <Upload className={`h-10 w-10 mb-3 transition-colors ${dragOver ? "text-primary" : "text-primary/60"}`} />
          <p className="font-semibold text-foreground">
            {dragOver ? "Solte para adicionar" : "Clique ou arraste fotos aqui"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">JPEG, PNG, WebP • máx. {MAX_FOTOS} fotos</p>
          <Button
            variant="outline"
            type="button"
            className="mt-4 pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          >
            <Camera className="h-4 w-4 mr-2" /> Selecionar fotos
          </Button>
        </CardContent>
      </Card>

      {/* Erro de validação inline */}
      {validationError && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {validationError}
        </p>
      )}

      {/* Grid de previews */}
      {previews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">
              {previews.length} foto(s) selecionada(s)
            </Label>
            <Badge variant="outline" className={previews.length >= MAX_FOTOS ? "text-destructive border-destructive" : ""}>
              {previews.length}/{MAX_FOTOS}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {previews.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-muted">
                <img
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px]">
                    Capa
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            As fotos serão comprimidas e enviadas ao publicar o anúncio.
          </p>
        </div>
      )}

      {/* Dicas */}
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

/* ──────────── Step 3: VenStudio IA V2 — Stability AI ──────────── */
function StepStudio({ previews, cenario, onCenarioChange, opcoes, onOpcoesChange, venStudio, veiculoId, onSkip, onConfirm }: {
  previews: string[];
  cenario: CenarioV2Id;
  onCenarioChange: (c: CenarioV2Id) => void;
  opcoes: { light_direction?: string; light_strength?: number; preserve_subject?: number };
  onOpcoesChange: (o: { light_direction?: string; light_strength?: number; preserve_subject?: number }) => void;
  venStudio: ReturnType<typeof useVenStudioV2>;
  veiculoId: string;
  onSkip: () => void;
  onConfirm: () => void;
}) {
  const [confirmou, setConfirmou] = useState(false);
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const processando = venStudio.status === 'processando';
  const concluido = venStudio.status === 'concluido';

  if (previews.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" /> VenStudio IA
          </h2>
        </div>
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhuma foto adicionada</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Volte à etapa anterior e adicione fotos para usar o VenStudio</p>
            <Button variant="outline" onClick={onSkip}>Pular esta etapa</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cenarioConfig = CENARIOS_V2[cenario];

  const handleProcessar = async () => {
    const fotosInput = previews.map((url, i) => ({ url, id: String(i) }));
    await venStudio.processarTodas(fotosInput, cenario, veiculoId, opcoes as { light_direction?: 'above' | 'left' | 'right' | 'below'; light_strength?: number; preserve_subject?: number });
    onConfirm();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" /> VenStudio IA
        </h2>
        <p className="text-muted-foreground mt-1">Transforme suas fotos em imagens profissionais</p>
      </div>

      {/* Banner de confiança */}
      <Card className="border-green-500/30 bg-green-500/5">
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

      {/* Grid de cenários */}
      {!processando && !concluido && (
        <>
          <div>
            <p className="text-sm font-semibold mb-3">Escolha o cenário</p>
            <div className="grid grid-cols-2 gap-3">
              {CENARIOS_V2_LIST.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => onCenarioChange(c.id as CenarioV2Id)}
                  className={`text-left rounded-lg border bg-card shadow-sm cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                    cenario === c.id ? "ring-2 ring-primary shadow-lg" : "border-border"
                  }`}
                >
                  <div className={`h-20 bg-gradient-to-br ${c.gradient} flex items-center justify-center text-3xl`}>
                    {c.emoji}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-foreground">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.descricao}</p>
                    {cenario === c.id && (
                      <Badge className="mt-2 bg-primary/10 text-primary text-[10px]">
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
              onClick={() => setMostrarAvancado(!mostrarAvancado)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${mostrarAvancado ? 'rotate-180' : ''}`} />
              Ajustes de iluminação (avançado)
            </button>
            {mostrarAvancado && (
              <Card className="mt-3">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-muted-foreground w-40">Direção da luz</label>
                    <Select
                      value={opcoes.light_direction ?? cenarioConfig.light_source_direction}
                      onValueChange={(v) => onOpcoesChange({ ...opcoes, light_direction: v })}
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
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-muted-foreground w-40">Intensidade</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={opcoes.light_strength ?? cenarioConfig.light_source_strength}
                      onChange={(e) => onOpcoesChange({ ...opcoes, light_strength: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs w-8 text-right">{(opcoes.light_strength ?? cenarioConfig.light_source_strength).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-muted-foreground w-40">Preservação</label>
                    <input
                      type="range"
                      min="0.8"
                      max="1"
                      step="0.01"
                      value={opcoes.preserve_subject ?? 0.95}
                      onChange={(e) => onOpcoesChange({ ...opcoes, preserve_subject: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs w-16 text-right">
                      {(opcoes.preserve_subject ?? 0.95) >= 0.95 ? 'Máxima' : 'Balanceado'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Galeria de fotos com status */}
      <div>
        <p className="text-sm font-medium mb-2">{previews.length} foto(s) {processando ? 'em processamento' : concluido ? 'processadas' : 'serão processadas'}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {previews.map((url, i) => {
            const fotoResult = venStudio.fotos[i];
            return (
              <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
                <img src={fotoResult?.urlProcessada || url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                {fotoResult && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    {fotoResult.status === 'processando' && <Loader2 className="h-5 w-5 text-white animate-spin" />}
                    {fotoResult.status === 'concluido' && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                    {fotoResult.status === 'erro' && <AlertTriangle className="h-5 w-5 text-red-400" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Barra de progresso */}
      {processando && (
        <div className="space-y-2">
          <Progress value={venStudio.progresso} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Processando... ~20s por foto</span>
            <Button variant="ghost" size="sm" onClick={venStudio.cancelar} className="text-xs h-7">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Erro */}
      {venStudio.erro && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-red-500">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {venStudio.erro}
          </CardContent>
        </Card>
      )}

      {/* Checkbox legal */}
      {!processando && (
        <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmou}
            onChange={(e) => setConfirmou(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            Confirmo que as fotos processadas representam fielmente o veículo real anunciado.
          </span>
        </label>
      )}

      {/* Botões */}
      {!processando && !concluido && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Pular esta etapa
          </Button>
          <Button
            onClick={handleProcessar}
            disabled={!confirmou}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Wand2 className="h-4 w-4 mr-2" /> Processar {previews.length} foto(s)
          </Button>
        </div>
      )}

      {concluido && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { venStudio.resetar(); }} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" /> Reprocessar
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-primary hover:bg-primary/90">
            Avançar <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ──────────── Step 4: AI Copilot ──────────── */
function StepCopilot({ form, updateForm, generating, aiError, sugestoes, geracoes, onGenerate }: {
  form: FormData;
  updateForm: (f: keyof FormData, v: unknown) => void;
  generating: boolean;
  aiError: string | null;
  sugestoes: string[];
  geracoes: number;
  onGenerate: () => void;
}) {
  const [faqAberto, setFaqAberto] = useState<number | null>(null);

  const addDestaque = () => {
    updateForm("destaques", [...form.destaques, ""]);
  };
  const removeDestaque = (idx: number) => {
    updateForm("destaques", form.destaques.filter((_: string, i: number) => i !== idx));
  };
  const updateDestaque = (idx: number, value: string) => {
    updateForm("destaques", form.destaques.map((d: string, i: number) => (i === idx ? value : d)));
  };

  const addFaq = () => {
    updateForm("faq", [...form.faq, { pergunta: "", resposta: "" }]);
  };
  const removeFaq = (idx: number) => {
    updateForm("faq", form.faq.filter((_: { pergunta: string; resposta: string }, i: number) => i !== idx));
  };
  const updateFaq = (idx: number, field: "pergunta" | "resposta", value: string) => {
    updateForm("faq", form.faq.map((f: { pergunta: string; resposta: string }, i: number) => (i === idx ? { ...f, [field]: value } : f)));
  };

  const hasContent = form.descricao || form.destaques.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
          <MessageSquareText className="h-6 w-6 text-primary" /> Copiloto Ventoro IA
        </h2>
        <p className="text-muted-foreground mt-1">
          A IA gera título, descrição, destaques e FAQ baseados nos dados do seu veículo
        </p>
      </div>

      {/* Generate button */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {hasContent ? "Regenerar conteúdo com IA" : "Gerar conteúdo com IA"}
              </p>
              <p className="text-xs text-muted-foreground">
                Baseada em {form.marca || "marca"} {form.modelo || "modelo"} {form.ano}, {form.opcionais.length} opcionais
                {geracoes > 0 && ` · ${geracoes}/3 gerações usadas`}
              </p>
            </div>
            <Button
              onClick={onGenerate}
              disabled={generating || geracoes >= 3}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  Gerando...
                </span>
              ) : hasContent ? (
                <><RotateCcw className="h-4 w-4 mr-1" /> Gerar novamente</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-1" /> Gerar</>
              )}
            </Button>
          </div>
          {generating && (
            <p className="text-xs text-primary mt-3 animate-pulse">
              O copiloto está analisando seu veículo e gerando o melhor conteúdo...
            </p>
          )}
          {geracoes >= 3 && (
            <p className="text-xs text-muted-foreground mt-3">
              Limite de 3 gerações por anúncio atingido. Você pode editar o conteúdo manualmente.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {aiError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Não foi possível gerar o conteúdo</p>
              <p className="text-xs text-muted-foreground">{aiError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Título */}
      <div className="space-y-2">
        <Label>Título do anúncio</Label>
        <Input
          placeholder="Ex: Honda Civic EXL 2022 — Baixa km, Revisado"
          value={form.titulo}
          onChange={(e) => updateForm("titulo", e.target.value)}
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground text-right">{form.titulo.length}/80</p>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label>Descrição do anúncio</Label>
        <Textarea
          placeholder="Descreva seu veículo ou use a IA para gerar..."
          value={form.descricao}
          onChange={(e) => updateForm("descricao", e.target.value)}
          rows={8}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{form.descricao.length}/2000</p>
      </div>

      {/* Destaques */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Destaques do veículo</Label>
          {form.destaques.length < 6 && (
            <Button variant="ghost" size="sm" onClick={addDestaque} className="text-primary">
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
        {form.destaques.length === 0 && !generating && (
          <p className="text-xs text-muted-foreground">Use a IA para gerar ou adicione manualmente</p>
        )}
        {form.destaques.map((d: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary flex-shrink-0" />
            <Input
              value={d}
              onChange={(e) => updateDestaque(i, e.target.value)}
              placeholder={`Destaque ${i + 1}`}
              className="flex-1"
            />
            <Button variant="ghost" size="sm" onClick={() => removeDestaque(i)} className="text-muted-foreground hover:text-destructive p-1">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Perguntas frequentes (FAQ)</Label>
          {form.faq.length < 5 && (
            <Button variant="ghost" size="sm" onClick={addFaq} className="text-primary">
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
        {form.faq.length === 0 && !generating && (
          <p className="text-xs text-muted-foreground">Use a IA para gerar ou adicione manualmente</p>
        )}
        {form.faq.map((f: { pergunta: string; resposta: string }, i: number) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFaqAberto(faqAberto === i ? null : i)}
                  className="flex-1 text-left flex items-center gap-2"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${faqAberto === i ? "rotate-180" : ""}`} />
                  <span className="text-sm font-medium">{f.pergunta || `Pergunta ${i + 1}`}</span>
                </button>
                <Button variant="ghost" size="sm" onClick={() => removeFaq(i)} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {faqAberto === i && (
                <div className="space-y-2 pl-6">
                  <Input
                    value={f.pergunta}
                    onChange={(e) => updateFaq(i, "pergunta", e.target.value)}
                    placeholder="Pergunta"
                  />
                  <Textarea
                    value={f.resposta}
                    onChange={(e) => updateFaq(i, "resposta", e.target.value)}
                    placeholder="Resposta"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sugestões de melhoria */}
      {sugestoes.length > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30">
          <CardContent className="p-4">
            <p className="font-semibold text-sm flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-600" /> Sugestões para melhorar seu anúncio
            </p>
            <ul className="space-y-1">
              {sugestoes.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span> {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ──────────── Step 5: Pricing ──────────── */

interface FipeData {
  codigo_fipe: string | null;
  preco_fipe: number;
  referencia_mes: string | null;
  preco_sugerido_min: number;
  preco_sugerido_max: number;
  ajuste_km: number;
  ajuste_condicao: number;
  preco_status: 'abaixo' | 'na_media' | 'acima' | null;
  fonte: 'cache' | 'api';
}

function FipeGauge({ preco, fipeMin, fipeMax, precoFipe }: {
  preco: number;
  fipeMin: number;
  fipeMax: number;
  precoFipe: number;
}) {
  // Gauge range: fipeMin * 0.7 to fipeMax * 1.3
  const rangeMin = fipeMin * 0.7;
  const rangeMax = fipeMax * 1.3;
  const range = rangeMax - rangeMin;

  const clamp = (v: number) => Math.max(0, Math.min(100, ((v - rangeMin) / range) * 100));

  const fipeMinPos = clamp(fipeMin);
  const fipeMaxPos = clamp(fipeMax);
  const fipePos = clamp(precoFipe);
  const precoPos = clamp(preco);

  return (
    <div className="relative h-10 mt-4 mb-6">
      {/* Track */}
      <div className="absolute top-4 left-0 right-0 h-2 rounded-full bg-muted overflow-hidden">
        {/* Zona abaixo (verde) */}
        <div
          className="absolute h-full bg-green-400/40"
          style={{ left: '0%', width: `${fipeMinPos}%` }}
        />
        {/* Zona ideal (primary) */}
        <div
          className="absolute h-full bg-primary/30"
          style={{ left: `${fipeMinPos}%`, width: `${fipeMaxPos - fipeMinPos}%` }}
        />
        {/* Zona acima (vermelho) */}
        <div
          className="absolute h-full bg-red-400/40"
          style={{ left: `${fipeMaxPos}%`, width: `${100 - fipeMaxPos}%` }}
        />
      </div>

      {/* FIPE marker */}
      <div
        className="absolute top-2 w-0.5 h-6 bg-primary/60"
        style={{ left: `${fipePos}%` }}
      />
      <div
        className="absolute -top-1 text-[10px] text-primary font-medium whitespace-nowrap"
        style={{ left: `${fipePos}%`, transform: 'translateX(-50%)' }}
      >
        FIPE
      </div>

      {/* User price marker */}
      {preco > 0 && (
        <>
          <div
            className="absolute top-2.5 w-4 h-4 rounded-full border-2 border-foreground bg-background shadow-md"
            style={{ left: `${precoPos}%`, transform: 'translateX(-50%)' }}
          />
          <div
            className="absolute top-8 text-[10px] font-bold whitespace-nowrap"
            style={{ left: `${precoPos}%`, transform: 'translateX(-50%)' }}
          >
            Seu preço
          </div>
        </>
      )}
    </div>
  );
}

function StepPricing({ form, updateForm }: {
  form: FormData;
  updateForm: (f: keyof FormData, v: unknown) => void;
}) {
  const [fipeData, setFipeData] = useState<FipeData | null>(null);
  const [fipeLoading, setFipeLoading] = useState(false);
  const [fipeError, setFipeError] = useState<string | null>(null);
  const [fipeConsulted, setFipeConsulted] = useState(false);

  // Auto-consult FIPE on mount if we have marca/modelo/ano
  useEffect(() => {
    if (fipeConsulted) return;
    if (!form.marca || !form.modelo || !form.ano) return;
    consultarFipe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const consultarFipe = async () => {
    if (!form.marca || !form.modelo || !form.ano) {
      setFipeError('Preencha marca, modelo e ano para consultar a FIPE.');
      return;
    }

    setFipeLoading(true);
    setFipeError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const { data, error } = await supabase.functions.invoke('consultar-fipe', {
        body: {
          marca: form.marca,
          modelo: form.modelo,
          ano: parseInt(form.ano, 10),
          combustivel: form.combustivel || 'flex',
          quilometragem: form.quilometragem ? parseInt(form.quilometragem, 10) : undefined,
          condicao: form.condicao || 'bom',
          preco: form.preco ? parseFloat(form.preco) : undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.nao_encontrado) {
          setFipeError('Veículo não encontrado na tabela FIPE. Defina o preço manualmente.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setFipeData(data as FipeData);
      setFipeConsulted(true);
    } catch (err) {
      setFipeError(err instanceof Error ? err.message : 'Erro ao consultar FIPE');
    } finally {
      setFipeLoading(false);
    }
  };

  // Recalculate status when price changes
  const precoNum = Number(form.preco) || 0;
  const status = fipeData
    ? precoNum === 0
      ? null
      : precoNum < fipeData.preco_sugerido_min
        ? 'abaixo'
        : precoNum > fipeData.preco_sugerido_max
          ? 'acima'
          : 'na_media'
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Definir Preço</h2>
        <p className="text-muted-foreground mt-1">Consultamos a tabela FIPE para recomendar o melhor preço</p>
      </div>

      {/* FIPE Analysis */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">Análise FIPE Ventoro</span>
            </div>
            {fipeData && (
              <Badge variant="outline" className="text-xs">
                {fipeData.referencia_mes || 'Referência atual'}
                {fipeData.codigo_fipe && ` · ${fipeData.codigo_fipe}`}
              </Badge>
            )}
          </div>

          {fipeLoading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                <Sparkles className="h-8 w-8 text-primary" />
              </motion.div>
              <p className="text-sm text-muted-foreground">Consultando tabela FIPE...</p>
              <p className="text-xs text-muted-foreground">{form.marca} {form.modelo} {form.ano}</p>
            </div>
          ) : fipeData ? (
            <>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-background rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Faixa mínima</p>
                  <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-green-600 dark:text-green-400">
                    R$ {fipeData.preco_sugerido_min.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="bg-background rounded-xl p-4 ring-2 ring-primary">
                  <p className="text-xs text-primary font-medium">FIPE</p>
                  <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-primary">
                    R$ {fipeData.preco_fipe.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="bg-background rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Faixa máxima</p>
                  <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-amber-600 dark:text-amber-400">
                    R$ {fipeData.preco_sugerido_max.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* Gauge */}
              <FipeGauge
                preco={precoNum}
                fipeMin={fipeData.preco_sugerido_min}
                fipeMax={fipeData.preco_sugerido_max}
                precoFipe={fipeData.preco_fipe}
              />

              {/* Adjustments info */}
              {(fipeData.ajuste_km !== 0 || fipeData.ajuste_condicao !== 0) && (
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  {fipeData.ajuste_condicao !== 0 && (
                    <span>Condição: {fipeData.ajuste_condicao > 0 ? '+' : ''}{(fipeData.ajuste_condicao * 100).toFixed(1)}%</span>
                  )}
                  {fipeData.ajuste_km !== 0 && (
                    <span>Km: {fipeData.ajuste_km > 0 ? '+' : ''}{(fipeData.ajuste_km * 100).toFixed(1)}%</span>
                  )}
                </div>
              )}
            </>
          ) : fipeError ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <p className="text-sm text-muted-foreground text-center">{fipeError}</p>
              <Button variant="outline" size="sm" onClick={consultarFipe}>
                <RotateCcw className="h-3 w-3 mr-1" /> Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 gap-3">
              <DollarSign className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Preencha marca, modelo e ano para consultar</p>
              <Button variant="outline" size="sm" onClick={consultarFipe} disabled={!form.marca || !form.modelo || !form.ano}>
                <Sparkles className="h-3 w-3 mr-1" /> Consultar FIPE
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Preço de Venda (R$) *</Label>
        <Input
          type="number"
          placeholder="Ex: 105000"
          value={form.preco}
          onChange={(e) => updateForm("preco", e.target.value)}
          className="text-xl font-bold font-[family-name:var(--font-mono)]"
        />
        {status && (
          <Badge variant="outline" className={
            status === "abaixo" ? "text-green-600 dark:text-green-400 border-green-600 dark:border-green-400" :
            status === "acima" ? "text-red-500 border-red-500" :
            "text-primary border-primary"
          }>
            {status === "abaixo" ? "Abaixo da FIPE — venda rápida"
              : status === "acima" ? "Acima da FIPE — pode demorar mais"
              : "Dentro da faixa FIPE ✓"}
          </Badge>
        )}
        {precoNum > 0 && fipeData && (
          <p className="text-xs text-muted-foreground">
            {precoNum > fipeData.preco_fipe
              ? `${((precoNum / fipeData.preco_fipe - 1) * 100).toFixed(1)}% acima da FIPE`
              : precoNum < fipeData.preco_fipe
                ? `${((1 - precoNum / fipeData.preco_fipe) * 100).toFixed(1)}% abaixo da FIPE`
                : 'Exatamente no valor FIPE'
            }
          </p>
        )}
      </div>

      {/* Documentação e condições */}
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-primary" />
          <Label className="text-base font-semibold">Documentação e condições</Label>
        </div>

        {[
          { field: "ipva_pago" as const, label: "IPVA pago", desc: "IPVA do ano atual quitado" },
          { field: "revisoes_em_dia" as const, label: "Revisões em dia", desc: "Revisões periódicas realizadas" },
          { field: "sem_sinistro" as const, label: "Sem sinistro", desc: "Nunca batido ou sinistrado" },
          { field: "aceitaTroca" as const, label: "Aceita troca", desc: "Considero propostas de troca" },
        ].map((item) => (
          <div key={item.field} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={form[item.field] as boolean}
              onCheckedChange={(v) => updateForm(item.field, v)}
            />
          </div>
        ))}

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-sm">Número de chaves</p>
            <p className="text-xs text-muted-foreground">Quantas chaves acompanham o veículo</p>
          </div>
          <Select
            value={String(form.num_chaves)}
            onValueChange={(v) => updateForm("num_chaves", parseInt(v, 10))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ──────────── Step 6: Plan Selection ──────────── */
function StepPlan({ form, updateForm, user }: {
  form: FormData;
  updateForm: (f: keyof FormData, v: unknown) => void;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const isGaragem = user?.user_metadata?.tipo === "garagem";

  const plans = [
    {
      id: "basico",
      name: "Grátis",
      price: "R$ 0",
      desc: "Anúncio básico por 30 dias",
      features: ["1 foto", "Listagem padrão", "30 dias de duração"],
    },
    {
      id: "premium",
      name: "Destaque",
      price: isGaragem ? "Incluso no plano" : "R$ 49,90",
      desc: "Mais visibilidade e recursos",
      features: ["20 fotos", "Selo destaque", "VenStudio IA incluso", "Landing page", "60 dias de duração"],
      recommended: true,
    },
    {
      id: "turbo",
      name: "Premium",
      price: isGaragem ? "Incluso no plano" : "R$ 99,90",
      desc: "Máxima exposição e IA completa",
      features: ["20 fotos + vídeo", "Destaque na home", "VenStudio + Copiloto IA", "Landing page premium", "Relatório de leads", "90 dias de duração"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Escolha seu Plano</h2>
        <p className="text-muted-foreground mt-1">Selecione o plano ideal para vender mais rápido</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
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
                plan.id === "turbo" ? "text-trust-medium" :
                plan.id === "premium" ? "text-primary" : "text-muted-foreground"
              }`} />
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="text-2xl font-bold font-[family-name:var(--font-mono)] text-primary mt-1">{plan.price}</p>
              <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
              <Separator className="my-4" />
              <ul className="space-y-2 text-sm text-left">
                {plan.features.map((f) => (
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
function StepSuccess({ form, navigate, slug, studioFotos, studioProgresso, studioProcessando }: {
  form: FormData;
  navigate: (path: string) => void;
  slug: string | null;
  studioFotos: { status: string; urlProcessada?: string; erro?: string }[];
  studioProgresso: number;
  studioProcessando: boolean;
}) {
  const fotosOk = studioFotos.filter(f => f.status === 'concluido').length;
  const fotosErro = studioFotos.filter(f => f.status === 'erro').length;
  const showStudio = form.studioProcessed && studioFotos.length > 0;

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

        {/* VenStudio Progress */}
        {showStudio && (
          <Card className="max-w-lg mx-auto mt-6 bg-primary/5 border-primary/20 text-left">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                {studioProcessando ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Wand2 className="h-5 w-5 text-primary" />
                  </motion.div>
                ) : (
                  <Wand2 className="h-5 w-5 text-primary" />
                )}
                <p className="font-semibold text-sm">
                  {studioProcessando
                    ? "VenStudio IA processando fotos..."
                    : studioProgresso === 100
                    ? "VenStudio IA concluído!"
                    : "VenStudio IA"}
                </p>
              </div>
              <Progress value={studioProgresso} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {fotosOk}/{studioFotos.length} fotos processadas
                {fotosErro > 0 && ` · ${fotosErro} com erro (fotos originais preservadas)`}
              </p>
            </CardContent>
          </Card>
        )}

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
              <p className="text-xs text-muted-foreground">VenStudio</p>
              <p className="font-bold text-sm">{form.studioProcessed ? "Ativo" : "Não"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          {slug && (
            <Button onClick={() => navigate(`/veiculo/${slug}`)} className="bg-primary hover:bg-primary/90">
              Ver meu anúncio <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/minha-conta/anuncios")}>
            Ver todos os anúncios
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar à Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
