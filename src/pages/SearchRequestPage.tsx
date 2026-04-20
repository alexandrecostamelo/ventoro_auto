import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Sparkles, Send, Car, DollarSign, MapPin, Fuel, Clock,
  CheckCircle2, Eye, Heart, ArrowRight, Zap, MessageSquare,
  Loader2, ThumbsUp, ThumbsDown, RefreshCw, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/Navbar";
import { vehicles } from "@/data/mock";
import { formatPrice, formatKm } from "@/utils/formatters";

interface MatchResult {
  vehicle: typeof vehicles[0];
  score: number;
  reasons: string[];
}

const EXAMPLE_QUERIES = [
  "Quero um SUV automático, até R$ 90 mil, com câmera de ré e banco de couro",
  "Sedan econômico para cidade, até 50 mil km, flex, com multimídia",
  "Carro esportivo ou com boa potência, de preferência preto ou vermelho",
  "Primeiro carro para minha filha, seguro, econômico e fácil de dirigir",
];

function analyzeQuery(query: string): MatchResult[] {
  const q = query.toLowerCase();

  const keywords: Record<string, (v: typeof vehicles[0]) => number> = {
    suv: v => (v.modelo.toLowerCase().includes("tracker") || v.modelo.toLowerCase().includes("creta") || v.modelo.toLowerCase().includes("compass")) ? 20 : 0,
    sedan: v => (v.modelo.toLowerCase().includes("corolla") || v.modelo.toLowerCase().includes("civic") || v.modelo.toLowerCase().includes("cruze")) ? 20 : 0,
    automático: v => v.cambio === "Automático" ? 15 : 0,
    manual: v => v.cambio === "Manual" ? 15 : 0,
    flex: v => v.combustivel === "Flex" ? 10 : 0,
    diesel: v => v.combustivel === "Diesel" ? 10 : 0,
    elétrico: v => v.combustivel === "Elétrico" ? 10 : 0,
    econômico: v => v.combustivel === "Flex" ? 8 : 0,
    esportivo: v => parseInt(v.potencia) > 150 ? 15 : 0,
    potência: v => parseInt(v.potencia) > 150 ? 12 : 0,
    seguro: v => v.opcionais.some(o => o.toLowerCase().includes("airbag")) ? 10 : 0,
    couro: v => v.opcionais.some(o => o.toLowerCase().includes("couro")) ? 10 : 0,
    multimídia: v => v.opcionais.some(o => o.toLowerCase().includes("multimídia")) ? 10 : 0,
    câmera: v => v.opcionais.some(o => o.toLowerCase().includes("câmera")) ? 10 : 0,
    preto: v => v.cor.toLowerCase() === "preto" ? 8 : 0,
    branco: v => v.cor.toLowerCase() === "branco" ? 8 : 0,
    vermelho: v => v.cor.toLowerCase() === "vermelho" ? 8 : 0,
    prata: v => v.cor.toLowerCase() === "prata" ? 8 : 0,
  };

  const priceMatch = q.match(/(\d{2,3})\s*mil/);
  const maxPrice = priceMatch ? parseInt(priceMatch[1]) * 1000 : null;

  const kmMatch = q.match(/(\d{2,3})\s*mil\s*km/);
  const maxKm = kmMatch ? parseInt(kmMatch[1]) * 1000 : null;

  return vehicles.map(v => {
    let score = 50;
    const reasons: string[] = [];

    for (const [kw, scorer] of Object.entries(keywords)) {
      if (q.includes(kw)) {
        const pts = scorer(v);
        if (pts > 0) {
          score += pts;
          reasons.push(`✓ ${kw.charAt(0).toUpperCase() + kw.slice(1)} compatível`);
        }
      }
    }

    if (maxPrice) {
      if (v.preco <= maxPrice) {
        score += 15;
        reasons.push(`✓ Dentro do orçamento (${formatPrice(v.preco)})`);
      } else {
        score -= 20;
      }
    }

    if (maxKm) {
      if (v.quilometragem <= maxKm) {
        score += 10;
        reasons.push(`✓ KM dentro do limite (${formatKm(v.quilometragem)})`);
      } else {
        score -= 10;
      }
    }

    if (v.score_confianca >= 90) { score += 5; reasons.push("✓ Alta confiança"); }
    if (v.preco_status === "abaixo") { score += 5; reasons.push("✓ Preço abaixo da média"); }

    return { vehicle: v, score: Math.min(Math.max(score, 10), 99), reasons: reasons.slice(0, 4) };
  })
    .filter(r => r.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export default function SearchRequestPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");

  const handleSearch = (text?: string) => {
    const q = text || query;
    if (!q.trim()) return;
    setLoading(true);
    setSubmittedQuery(q);
    setTimeout(() => {
      setResults(analyzeQuery(q));
      setLoading(false);
    }, 2000);
  };

  const reset = () => {
    setQuery("");
    setResults(null);
    setSubmittedQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Search className="h-4 w-4" /> Pedido de Busca
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-display)]">
            Descreva o carro dos seus sonhos
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            A Ventoro IA analisa seu pedido e encontra os veículos mais compatíveis no nosso estoque
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Input */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Textarea
                    placeholder="Descreva o que você procura... Ex: 'Quero um SUV automático, até 90 mil, com câmera de ré'"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    rows={3}
                    className="resize-none border-0 p-0 text-base focus-visible:ring-0 shadow-none"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Dica: inclua orçamento, tipo, câmbio, opcionais desejados
              </p>
              <Button
                onClick={() => handleSearch()}
                disabled={!query.trim() || loading}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Buscar com IA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Examples */}
        {!results && !loading && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Exemplos de pedidos:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {EXAMPLE_QUERIES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(ex); handleSearch(ex); }}
                  className="text-left p-3 rounded-xl border border-border bg-surface-card hover:bg-primary/5 hover:border-primary/30 transition-all text-sm"
                >
                  <span className="text-muted-foreground">"{ex}"</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10"
            >
              <Sparkles className="h-8 w-8 text-primary" />
            </motion.div>
            <div>
              <p className="font-semibold">Ventoro IA analisando seu pedido...</p>
              <p className="text-sm text-muted-foreground mt-1">Cruzando com {vehicles.length} veículos do estoque</p>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {results && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {results.length} veículo(s) encontrado(s)
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Para: "{submittedQuery}"
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-1" /> Nova Busca
              </Button>
            </div>

            {results.length === 0 ? (
              <Card className="bg-muted/30">
                <CardContent className="py-12 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-semibold">Nenhum veículo compatível encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Tente ajustar sua descrição ou ampliar os critérios</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {results.map(({ vehicle: v, score, reasons }, idx) => (
                  <Card
                    key={v.id}
                    className={`transition-all hover:shadow-md cursor-pointer ${idx === 0 ? "ring-2 ring-primary" : ""}`}
                    onClick={() => navigate(`/veiculo/${v.slug}`)}
                  >
                    <CardContent className="p-4 flex gap-4">
                      <div className="w-32 h-24 md:w-40 md:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-muted relative">
                        <img src={v.fotos[0]} alt={v.modelo} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <Badge className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px]">
                            <Zap className="h-2.5 w-2.5 mr-0.5" /> Melhor match
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold truncate">{v.marca} {v.modelo} {v.versao}</p>
                            <p className="text-xs text-muted-foreground">
                              {v.ano} • {formatKm(v.quilometragem)} • {v.combustivel} • {v.cambio}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-primary">
                              {formatPrice(v.preco)}
                            </p>
                            <Badge className={`text-[10px] ${
                              score >= 85 ? "bg-trust-high text-white" :
                              score >= 70 ? "bg-primary text-primary-foreground" :
                              "bg-trust-medium text-white"
                            }`}>
                              <Sparkles className="h-3 w-3 mr-0.5" /> {score}% match
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {reasons.map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{r}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <MapPin className="h-3 w-3" /> {v.cidade}/{v.estado}
                          </Badge>
                          {v.preco_status === "abaixo" && (
                            <Badge variant="outline" className="text-[10px] text-trust-high border-trust-high">
                              Abaixo da média
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* AI Tip */}
            {results.length > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-5 flex items-center gap-4">
                  <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Dica da Ventoro IA</p>
                    <p className="text-xs text-muted-foreground">
                      Não encontrou o ideal? Crie um <button onClick={() => navigate("/alertas")} className="text-primary underline font-medium">Alerta Inteligente</button> e
                      receba notificações quando um veículo compatível for anunciado.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
