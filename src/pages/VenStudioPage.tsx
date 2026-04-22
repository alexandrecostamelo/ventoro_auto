import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import {
  Sparkles, ArrowLeft, CheckCircle2, Wand2, Camera, ShieldCheck,
  ChevronDown, Loader2, RotateCcw, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CENARIOS_V2, CENARIOS_V2_LIST, type CenarioV2Id } from "@/lib/venstudio-cenarios-v2";
import { useVenStudioV2 } from "@/hooks/useVenStudioV2";
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

  const venStudio = useVenStudioV2();
  const processando = venStudio.status === "processando";
  const concluido = venStudio.status === "concluido";
  const cenarioConfig = CENARIOS_V2[cenario];

  useEffect(() => {
    if (!authLoading && !user) navigate("/entrar");
  }, [user, authLoading, navigate]);

  // Carregar fotos e dados do veículo
  useEffect(() => {
    if (!veiculoId) { setLoadingFotos(false); return; }

    async function load() {
      const [fotosRes, veiculoRes] = await Promise.all([
        supabase.from("fotos_veiculos").select("id, url_original, url_processada").eq("veiculo_id", veiculoId).order("ordem"),
        supabase.from("veiculos").select("marca, modelo").eq("id", veiculoId).single(),
      ]);
      if (fotosRes.data) setFotos(fotosRes.data);
      if (veiculoRes.data) setVeiculoInfo(veiculoRes.data);
      setLoadingFotos(false);
    }
    load();
  }, [veiculoId]);

  const handleProcessar = async () => {
    if (!veiculoId || fotos.length === 0) return;
    const fotosInput = fotos.map((f) => ({ url: f.url_original, id: f.id }));
    await venStudio.processarTodas(
      fotosInput,
      cenario,
      veiculoId,
      opcoes as { light_direction?: "above" | "left" | "right" | "below"; light_strength?: number; preserve_subject?: number },
    );
  };

  // Sem veículo selecionado
  if (!veiculoId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto pt-28 pb-16 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10 text-[var(--color-brand-primary)]" />
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
      <div className="max-w-4xl mx-auto pt-28 pb-16 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-[var(--color-brand-primary)]" /> VenStudio IA
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
            {!processando && !concluido && (
              <>
                <div>
                  <p className="text-sm font-semibold mb-3">Escolha o cenário</p>
                  <div className="grid grid-cols-2 gap-3">
                    {CENARIOS_V2_LIST.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCenario(c.id as CenarioV2Id)}
                        className={`text-left rounded-lg border bg-card shadow-sm cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                          cenario === c.id ? "ring-2 ring-[var(--color-brand-primary)] shadow-lg" : "border-border"
                        }`}
                      >
                        <div className={`h-20 bg-gradient-to-br ${c.gradient} flex items-center justify-center text-3xl`}>
                          {c.emoji}
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-sm text-foreground">{c.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.descricao}</p>
                          {cenario === c.id && (
                            <Badge className="mt-2 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-[10px]">
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

                {/* Fotos do veículo */}
                <div>
                  <p className="text-sm font-semibold mb-3">Fotos que serão processadas ({fotos.length})</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {fotos.map((f) => (
                      <div key={f.id} className="aspect-[4/3] rounded-lg overflow-hidden border border-border">
                        <img src={f.url_original} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão processar */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleProcessar}
                    className="flex-1 gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90 text-white"
                  >
                    <Sparkles className="h-4 w-4" /> Processar {fotos.length} foto(s) com IA
                  </Button>
                </div>
              </>
            )}

            {/* Processando */}
            {processando && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--color-brand-primary)]" />
                  <p className="font-semibold">Processando fotos com cenário {CENARIOS_V2[cenario].label}...</p>
                </div>
                <Progress value={venStudio.progresso} className="h-2" />
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {fotos.map((f, i) => {
                    const resultado = venStudio.fotos[i];
                    return (
                      <div key={f.id} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
                        <img src={resultado?.urlProcessada || f.url_original} alt="" className="w-full h-full object-cover" />
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
                    );
                  })}
                </div>
                <Button variant="ghost" size="sm" onClick={venStudio.cancelar} className="text-xs">
                  Cancelar
                </Button>
              </div>
            )}

            {/* Concluído */}
            {concluido && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-700 dark:text-green-400">Processamento concluído!</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {venStudio.fotos.map((r, i) => (
                    <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
                      <img src={r.urlProcessada || r.fotoUrl} alt="" className="w-full h-full object-cover" />
                      {r.aprovado && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle2 className="h-5 w-5 text-green-500 drop-shadow" />
                        </div>
                      )}
                      {r.status === "erro" && (
                        <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-[10px] p-1 text-center">
                          {r.erro || "Erro"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {venStudio.erro && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {venStudio.erro}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => venStudio.resetar()} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Processar novamente
                  </Button>
                  <Button onClick={() => navigate(-1)} className="gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90 text-white">
                    Voltar ao anúncio
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
