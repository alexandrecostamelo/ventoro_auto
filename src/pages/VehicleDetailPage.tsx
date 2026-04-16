import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VehicleCard } from "@/components/VehicleCard";
import { vehicles as mockVehicles, garages as mockGarages, formatPrice, formatKm } from "@/data/mock";
import { useVeiculo, useVeiculos } from "@/hooks/useVeiculos";
import { useFavoritos } from "@/hooks/useFavoritos";
import { useAuth } from "@/contexts/AuthContext";
import { veiculoDbParaMock, type VeiculoComFotos } from "@/utils/adapters";
import { USE_REAL_DATA } from "@/config/flags";
import { incrementarVisualizacao } from "@/lib/visualizacoes";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Eye, Heart, Calendar, MessageCircle, Share2, Shield, Sparkles,
  ChevronRight, AlertCircle, ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Fallback usado quando não há histórico real no banco
const HARDCODED_PRICE_HISTORY = [
  { date: "Jan", price: 135000 },
  { date: "Fev", price: 133000 },
  { date: "Mar", price: 131000 },
  { date: "Abr", price: 130000 },
  { date: "Mai", price: 129500 },
  { date: "Jun", price: 128900 },
];

// ─── Tipos auxiliares ──────────────────────────────────────────────────────────

interface GarageInfo {
  nome: string
  logo_url: string | null
  total_estoque: number
  avaliacao: number
  slug: string
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VehicleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorito, toggleFavorito } = useFavoritos();

  const [mainPhoto, setMainPhoto] = useState(0);
  const [showFinancing, setShowFinancing] = useState(false);
  const [entrada, setEntrada] = useState(30);
  const [prazo, setPrazo] = useState(48);

  // Hooks sempre chamados (regras do React)
  const { veiculo: veiculoDB, loading, error } = useVeiculo(slug ?? "");
  const { veiculos: similarDB } = useVeiculos(
    USE_REAL_DATA && veiculoDB
      ? { marca: veiculoDB.marca, por_pagina: 7 }
      : {}
  );

  // Incrementar visualizações — fire-and-forget quando o ID ficar disponível
  useEffect(() => {
    if (USE_REAL_DATA && veiculoDB?.id) {
      incrementarVisualizacao(veiculoDB.id);
    }
  }, [veiculoDB?.id]);

  // Reset da foto principal quando o veículo muda
  useEffect(() => {
    setMainPhoto(0);
  }, [slug]);

  // ── Resolução dos dados ──────────────────────────────────────────────────────

  const vehicle = USE_REAL_DATA
    ? (veiculoDB ? veiculoDbParaMock(veiculoDB as unknown as VeiculoComFotos) : null)
    : (mockVehicles.find((v) => v.slug === slug) ?? mockVehicles[0]);

  // Garagem normalizada (campos comuns entre DB e mock)
  const garage: GarageInfo | null = (() => {
    if (USE_REAL_DATA) {
      const g = veiculoDB?.garagens;
      return g ? { nome: g.nome, logo_url: g.logo_url, total_estoque: g.total_estoque, avaliacao: g.avaliacao, slug: g.slug } : null;
    }
    const g = vehicle?.garagem_id ? (mockGarages.find((g) => g.id === vehicle.garagem_id) ?? null) : null;
    return g ? { nome: g.nome, logo_url: g.logo_url, total_estoque: g.total_estoque, avaliacao: g.avaliacao, slug: g.slug } : null;
  })();

  // WhatsApp: garagem > telefone garagem > telefone perfil
  const whatsappRaw = USE_REAL_DATA
    ? (veiculoDB?.garagens?.whatsapp ?? veiculoDB?.garagens?.telefone ?? veiculoDB?.profiles?.telefone ?? null)
    : null;
  const whatsappUrl = whatsappRaw
    ? `https://wa.me/55${whatsappRaw.replace(/\D/g, "")}`
    : null;

  // Veículos similares
  const similar = USE_REAL_DATA
    ? similarDB.filter((v) => v.slug !== slug).slice(0, 6).map((v) => veiculoDbParaMock(v))
    : mockVehicles.filter((v) => v.id !== vehicle?.id).slice(0, 6);

  // Histórico de preço
  const priceHistoryData = (() => {
    if (!USE_REAL_DATA || !veiculoDB?.historico_preco?.length) return HARDCODED_PRICE_HISTORY;
    return [...veiculoDB.historico_preco]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((h) => ({
        date: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(h.created_at)),
        price: h.preco,
      }));
  })();

  // ── Estados de UI ────────────────────────────────────────────────────────────

  const isLoading = USE_REAL_DATA && loading;
  const isNotFound = USE_REAL_DATA && !loading && !vehicle && !error;
  // PGRST116 = .single() sem resultado
  const isNotFoundError = USE_REAL_DATA && !!error && (error.includes("PGRST116") || error.includes("multiple") || error.includes("no rows"));
  const hasError = USE_REAL_DATA && !!error && !isNotFoundError;

  if (isLoading) return <PageSkeleton />;
  if (isNotFound || isNotFoundError) return <NotFoundState />;
  if (hasError) return <ErrorState message={error!} />;
  if (!vehicle) return null;

  // ── Derivados do veículo ─────────────────────────────────────────────────────

  const pctDiff = vehicle.preco_sugerido.max > 0
    ? Math.round(Math.abs(vehicle.preco_sugerido.max - vehicle.preco) / vehicle.preco_sugerido.max * 100)
    : 0;

  const priceTag = {
    abaixo: { label: `▼ ${pctDiff}% abaixo da média`, className: "bg-brand-light text-brand-dark" },
    na_media: { label: "= preço justo", className: "bg-amber-50 text-amber-700" },
    acima: { label: `▲ ${pctDiff}% acima da média`, className: "bg-red-50 text-red-700" },
  }[vehicle.preco_status];

  const scoreColor = vehicle.score_confianca >= 90 ? "text-trust-high" : vehicle.score_confianca >= 75 ? "text-trust-medium" : "text-trust-low";
  const scoreBarColor = vehicle.score_confianca >= 90 ? "bg-trust-high" : vehicle.score_confianca >= 75 ? "bg-trust-medium" : "bg-trust-low";

  const entradaValue = (vehicle.preco * entrada) / 100;
  const financiado = vehicle.preco - entradaValue;
  const parcela = (financiado / prazo) * 1.018;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-4 lg:px-8 max-w-[1080px]">
        {/* Breadcrumb */}
        <div className="text-small text-text-muted mb-4">
          <Link to="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/buscar" className="hover:text-brand">Buscar</Link>
          <span className="mx-2">›</span>
          <span className="text-text-primary">{vehicle.marca} {vehicle.modelo} {vehicle.versao} {vehicle.ano}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1">
            {/* Gallery */}
            <div className="flex flex-col md:flex-row gap-2 mb-6">
              <div className="flex-1 relative aspect-video rounded-lg overflow-hidden bg-surface-secondary">
                <img
                  src={vehicle.fotos[mainPhoto]}
                  alt={`${vehicle.marca} ${vehicle.modelo}`}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-car.jpg"; }}
                />
                {vehicle.selo_studio_ia && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-micro font-medium text-primary-foreground">
                    <Sparkles className="h-3 w-3" /> Fotos VenStudio IA
                  </span>
                )}
              </div>
              {vehicle.fotos.length > 1 && (
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:w-[120px]">
                  {vehicle.fotos.map((foto, i) => (
                    <button
                      key={i}
                      onClick={() => setMainPhoto(i)}
                      className={`flex-shrink-0 w-20 h-16 md:w-full md:h-20 rounded-md overflow-hidden border-2 transition-all ${
                        mainPhoto === i ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={foto}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-car.jpg"; }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`rounded-full px-2.5 py-1 text-micro font-medium ${
                  vehicle.tipo_anunciante === "garagem" ? "bg-garage-light text-garage" : "bg-surface-secondary text-text-secondary"
                }`}>
                  {vehicle.tipo_anunciante === "garagem" ? "Garagem Pro" : "Particular"}
                </span>
                {vehicle.selo_inspecao && (
                  <span className="rounded-full bg-brand-light px-2.5 py-1 text-micro font-medium text-brand-dark">
                    <Shield className="inline h-3 w-3 mr-1" />Inspeção IA
                  </span>
                )}
              </div>
              <h1 className="font-display text-[32px] font-bold text-text-primary leading-tight">
                {vehicle.marca} {vehicle.modelo} {vehicle.versao}
              </h1>
              <p className="text-body text-text-secondary mt-1">
                {vehicle.ano} · {formatKm(vehicle.quilometragem)} · {vehicle.cambio} · {vehicle.combustivel}
                {vehicle.cor ? ` · ${vehicle.cor}` : ""}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="font-display text-4xl font-bold text-text-primary">{formatPrice(vehicle.preco)}</span>
                <span className={`rounded-full px-3 py-1 text-small font-medium ${priceTag.className}`}>{priceTag.label}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-text-muted">
                <span className="flex items-center gap-1 text-small">
                  <MapPin className="h-3.5 w-3.5" />{vehicle.cidade}, {vehicle.estado}
                </span>
                {vehicle.data_publicacao && (
                  <span className="flex items-center gap-1 text-small">
                    <Calendar className="h-3.5 w-3.5" />{vehicle.data_publicacao}
                  </span>
                )}
                <span className="flex items-center gap-1 text-small">
                  <Eye className="h-3.5 w-3.5" />{vehicle.visualizacoes} views
                </span>
              </div>
            </div>

            {/* Specs grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: "POTÊNCIA", value: vehicle.potencia || "N/D" },
                { label: "TORQUE", value: vehicle.torque || "N/D" },
                { label: "CÂMBIO", value: vehicle.cambio },
                { label: "COMBUSTÍVEL", value: vehicle.combustivel },
                { label: "CONSUMO CIDADE", value: vehicle.consumo_cidade || "N/D" },
                { label: "CONSUMO ESTRADA", value: vehicle.consumo_estrada || "N/D" },
                { label: "COR", value: vehicle.cor || "N/D" },
                { label: "ANO", value: String(vehicle.ano) },
              ].map((spec) => (
                <div key={spec.label} className="rounded-lg border border-border bg-surface-card p-3">
                  <p className="text-micro text-text-muted uppercase tracking-wider">{spec.label}</p>
                  <p className="text-body font-medium text-text-primary mt-0.5">{spec.value}</p>
                </div>
              ))}
            </div>

            {/* AI Analysis */}
            <div className="rounded-lg border border-brand/30 bg-brand-light p-5 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-brand" />
                <h3 className="font-display text-lg font-semibold text-text-primary">Análise Ventoro IA</h3>
              </div>
              <p className="text-body text-text-secondary mb-4">
                O {vehicle.marca} {vehicle.modelo} {vehicle.versao} {vehicle.ano} apresenta excelente estado de conservação,
                com quilometragem compatível para o ano ({formatKm(vehicle.quilometragem)}).
                O preço está posicionado de forma competitiva,{" "}
                {vehicle.preco_status === "abaixo" ? "abaixo da média de mercado" : "dentro da faixa de mercado"},
                representando boa oportunidade. Documentação em ordem, sem histórico de sinistros registrados.
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-body font-medium text-text-primary">
                  Score de confiança: {vehicle.score_confianca}/100
                </span>
                <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden">
                  <div className={`h-full ${scoreBarColor} rounded-full transition-all`} style={{ width: `${vehicle.score_confianca}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Quilometragem OK", "Preço justo", "Histórico limpo"].map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-card border border-brand/20 px-3 py-1 text-small text-brand-dark font-medium">{tag}</span>
                ))}
              </div>
            </div>

            {/* Optionals */}
            {vehicle.opcionais.length > 0 && (
              <div className="mb-8">
                <h3 className="font-display text-lg font-semibold text-text-primary mb-3">Opcionais</h3>
                <div className="flex flex-wrap gap-2">
                  {vehicle.opcionais.map((opt) => (
                    <span key={opt} className="rounded-full bg-surface-secondary px-3 py-1.5 text-small text-text-secondary">{opt}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {vehicle.descricao && (
              <div className="mb-8">
                <h3 className="font-display text-lg font-semibold text-text-primary mb-3">Descrição</h3>
                <p className="text-body text-text-secondary leading-relaxed">{vehicle.descricao}</p>
              </div>
            )}

            {/* Price history */}
            <div className="mb-8">
              <h3 className="font-display text-lg font-semibold text-text-primary mb-3">Histórico de preço</h3>
              <div className="rounded-lg border border-border bg-surface-card p-4 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistoryData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(60 2% 60%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(60 2% 60%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatPrice(v)} />
                    <Line type="monotone" dataKey="price" stroke="hsl(157 69% 37%)" strokeWidth={2} dot={{ fill: "hsl(157 69% 37%)", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Financing simulation */}
            <div className="mb-8">
              <button onClick={() => setShowFinancing(!showFinancing)} className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
                Simulação financeira
                <ChevronRight className={`h-5 w-5 transition-transform ${showFinancing ? "rotate-90" : ""}`} />
              </button>
              {showFinancing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 rounded-lg border border-border bg-surface-card p-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-micro text-text-muted uppercase mb-1 block">Entrada ({entrada}%)</label>
                      <input type="range" min={10} max={50} value={entrada} onChange={(e) => setEntrada(Number(e.target.value))} className="w-full accent-brand" />
                      <p className="text-small text-text-secondary mt-1">{formatPrice(entradaValue)}</p>
                    </div>
                    <div>
                      <label className="text-micro text-text-muted uppercase mb-1 block">Prazo</label>
                      <select value={prazo} onChange={(e) => setPrazo(Number(e.target.value))} className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small">
                        {[12, 24, 36, 48, 60].map((p) => <option key={p} value={p}>{p} meses</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-surface-secondary">
                    <p className="text-micro text-text-muted uppercase">Parcela estimada</p>
                    <p className="font-display text-3xl font-bold text-text-primary mt-1">
                      {formatPrice(Math.round(parcela))}<span className="text-body font-normal text-text-muted">/mês</span>
                    </p>
                    <p className="text-micro text-text-muted mt-2">* Estimativa com taxa de 1,8% a.m. Consulte seu banco.</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Similar vehicles */}
            {similar.length > 0 && (
              <div className="mb-8">
                <h3 className="font-display text-lg font-semibold text-text-primary mb-4">Você pode gostar também</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {similar.map((v) => (
                    <div key={v.id} className="min-w-[260px] max-w-[260px]">
                      <VehicleCard vehicle={v} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky contact card - desktop */}
          <div className="hidden lg:block w-[320px] flex-shrink-0">
            <div className="sticky top-20">
              <div className="rounded-lg border border-border bg-surface-card p-5 shadow-card">
                <p className="font-display text-2xl font-bold text-text-primary mb-1">{formatPrice(vehicle.preco)}</p>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-micro mb-4 ${priceTag.className}`}>{priceTag.label}</span>

                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full rounded-full bg-[#25D366] px-5 py-3 text-body font-medium text-primary-foreground transition-all hover:brightness-90 active:scale-[0.97] mb-2 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp
                  </a>
                ) : (
                  <button className="w-full rounded-full bg-[#25D366] px-5 py-3 text-body font-medium text-primary-foreground transition-all hover:brightness-90 active:scale-[0.97] mb-2 flex items-center justify-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp
                  </button>
                )}
                <button className="w-full rounded-full border border-border px-5 py-3 text-body font-medium text-text-primary transition-all hover:bg-surface-secondary mb-2">
                  Agendar visita
                </button>
                <button className="w-full rounded-full px-5 py-3 text-body font-medium text-brand hover:text-brand-dark transition-colors mb-4">
                  Fazer proposta
                </button>

                <div className="flex justify-center gap-6 mb-4 border-t border-border pt-4">
                  <button
                    onClick={() => {
                      if (!USE_REAL_DATA) return;
                      if (!user) { navigate("/entrar"); return; }
                      toggleFavorito(vehicle.id);
                    }}
                    className="flex items-center gap-1 text-small text-text-muted hover:text-brand transition-colors"
                  >
                    <Heart className={`h-4 w-4 transition-colors ${USE_REAL_DATA && isFavorito(vehicle.id) ? "fill-red-500 text-red-500" : ""}`} />
                    {USE_REAL_DATA && isFavorito(vehicle.id) ? "Favoritado" : "Favoritar"}
                  </button>
                  <button className="flex items-center gap-1 text-small text-text-muted hover:text-brand transition-colors">
                    <Share2 className="h-4 w-4" /> Compartilhar
                  </button>
                </div>

                {/* Score */}
                <div className="rounded-lg bg-surface-secondary p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-small font-medium text-text-primary">Score de confiança</span>
                    <span className={`font-mono text-lg font-bold ${scoreColor}`}>{vehicle.score_confianca}</span>
                  </div>
                  <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
                    <div className={`h-full ${scoreBarColor} rounded-full`} style={{ width: `${vehicle.score_confianca}%` }} />
                  </div>
                </div>

                {/* Seller info */}
                {garage ? (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      {garage.logo_url ? (
                        <img src={garage.logo_url} alt={garage.nome} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-brand-light flex items-center justify-center text-brand-dark font-display font-semibold text-sm">
                          {garage.nome.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-small font-medium text-text-primary">{garage.nome}</p>
                        <p className="text-micro text-text-muted">{garage.total_estoque} veículos · ★ {garage.avaliacao}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand-light flex items-center justify-center text-brand-dark font-display font-semibold text-sm">
                        VP
                      </div>
                      <div>
                        <p className="text-small font-medium text-text-primary">Vendedor particular</p>
                        <p className="text-micro text-text-muted">Anunciante verificado</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-card border-t border-border px-4 py-3 flex items-center justify-between z-40">
          <div>
            <p className="font-display text-lg font-bold text-text-primary">{formatPrice(vehicle.preco)}</p>
            <span className={`text-micro ${priceTag.className} rounded-full px-2 py-0.5`}>{priceTag.label}</span>
          </div>
          <div className="flex gap-2">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#25D366] px-5 py-2.5 text-small font-medium text-primary-foreground flex items-center gap-1"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            ) : (
              <button className="rounded-full bg-[#25D366] px-5 py-2.5 text-small font-medium text-primary-foreground flex items-center gap-1">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
            )}
            <button className="rounded-full border border-border px-4 py-2.5 text-small font-medium text-text-primary">
              Proposta
            </button>
          </div>
        </div>
      </div>
      <div className="pb-20 lg:pb-0" />
      <Footer />
    </div>
  );
}

// ─── Estados de loading / erro / 404 ─────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-4 lg:px-8 max-w-[1080px]">
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            {/* Gallery skeleton */}
            <div className="flex gap-2 mb-6">
              <Skeleton className="flex-1 aspect-video rounded-lg" />
              <div className="hidden md:flex flex-col gap-2 w-[120px]">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="w-full h-20 rounded-md" />)}
              </div>
            </div>
            {/* Title */}
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <Skeleton className="h-10 w-48 mb-6" />
            {/* Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
            <Skeleton className="h-32 rounded-lg mb-8" />
            <Skeleton className="h-24 rounded-lg mb-8" />
          </div>
          <div className="hidden lg:block w-[320px]">
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-4">🚗</div>
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Veículo não encontrado</h1>
        <p className="text-body text-text-secondary mb-6 max-w-sm">
          Este anúncio pode ter sido removido ou o link está incorreto.
        </p>
        <Link
          to="/buscar"
          className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-body font-medium text-primary-foreground hover:brightness-90 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Ver todos os veículos
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Erro ao carregar veículo</h1>
        <p className="text-small text-text-secondary max-w-sm mb-6">{message}</p>
        <Link to="/buscar" className="flex items-center gap-2 text-brand hover:text-brand-dark">
          <ArrowLeft className="h-4 w-4" />
          Voltar à busca
        </Link>
      </div>
    </div>
  );
}
