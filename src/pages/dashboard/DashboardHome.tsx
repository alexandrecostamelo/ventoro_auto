import { useEffect, useState } from "react";
import { vehicles, leads as mockLeads, alerts as mockAlerts, mockUser, formatPrice, formatKm } from "@/data/mock";
import { Link } from "react-router-dom";
import {
  Eye, Users, Heart, TrendingUp, ArrowUpRight,
  Sparkles, ChevronRight, MessageCircle, Bell,
} from "lucide-react";
import { USE_REAL_DATA } from "@/config/flags";
import { useAuth } from "@/contexts/AuthContext";
import { useVeiculosAnunciante, fotoCapa } from "@/hooks/useVeiculosAnunciante";
import { useLeadsAnunciante } from "@/hooks/useLeadsAnunciante";
import { supabase } from "@/lib/supabase";
import { formatarPreco, formatarKm, formatarDataRelativa } from "@/utils/formatters";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AlertaDisplay {
  id: string;
  nome: string;
  ativa: boolean;
  total_matches: number;
}

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_MY_VEHICLES = vehicles.filter((v) => v.tipo_anunciante === "particular").slice(0, 3);
const MOCK_RECENT_LEADS = mockLeads.slice(0, 3);
const MOCK_METRICS = [
  { label: "Visualizações", value: "2.847", icon: Eye },
  { label: "Leads recebidos", value: "34", icon: Users },
  { label: "Favoritos", value: "89", icon: Heart },
  { label: "Taxa de contato", value: "4,2%", icon: TrendingUp },
];

const AI_SUGGESTIONS = [
  {
    text: "Suas fotos são boas, mas adicionar uma foto do motor pode aumentar contatos em 40%.",
    action: "Adicionar foto",
  },
  {
    text: "O preço do seu Civic está 4% abaixo da média. Considere subir R$ 3.000 para maximizar o retorno.",
    action: "Ajustar preço",
  },
  {
    text: "Veículos com vídeo recebem 2x mais leads. Grave um vídeo curto do seu veículo.",
    action: "Saiba mais",
  },
];

const STATUS_COLORS: Record<string, string> = {
  novo: "bg-trust-high/10 text-trust-high",
  em_contato: "bg-warning/10 text-warning",
  proposta: "bg-garage/10 text-garage",
  visita: "bg-info/10 text-info",
  vendido: "bg-brand-dark/10 text-brand-dark",
  perdido: "bg-text-muted/10 text-text-muted",
};

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo", em_contato: "Em contato", proposta: "Proposta",
  visita: "Visita", vendido: "Vendido", perdido: "Perdido",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonHome() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-56 bg-surface-secondary rounded-lg mb-2" />
        <div className="h-4 w-72 bg-surface-secondary rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-background p-5 h-28" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-background p-4 h-20" />
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { profile, user, loading: authLoading } = useAuth();
  const { veiculos, metricas, loading: veicLoading } = useVeiculosAnunciante();
  const { leads: leadsReais, loading: leadsLoading } = useLeadsAnunciante();
  const [alertas, setAlertas] = useState<AlertaDisplay[]>([]);

  // Fetch buscas_salvas (alertas) for real data path
  useEffect(() => {
    if (!USE_REAL_DATA || !user) return;
    supabase
      .from("buscas_salvas")
      .select("id, nome, ativa, total_matches")
      .eq("user_id", user.id)
      .limit(6)
      .then(({ data }) => {
        if (data) setAlertas(data as AlertaDisplay[]);
      });
  }, [user]);

  const isLoading = USE_REAL_DATA && (authLoading || veicLoading || leadsLoading);
  if (isLoading) return <SkeletonHome />;

  // ── Derived display data ──────────────────────────────────────────────────

  const nomeSaudacao = USE_REAL_DATA
    ? (profile?.nome?.split(" ")[0] ?? "Usuário")
    : mockUser.nome;

  const veiculosAtivos = USE_REAL_DATA
    ? veiculos.filter((v) => v.status === "publicado").slice(0, 3)
    : MOCK_MY_VEHICLES;

  const leadsRecentes = USE_REAL_DATA
    ? leadsReais.slice(0, 3)
    : MOCK_RECENT_LEADS;

  const alertasDisplay: AlertaDisplay[] = USE_REAL_DATA
    ? alertas
    : mockAlerts.map((a) => ({ id: a.id, nome: a.nome, ativa: a.ativo, total_matches: a.total_matches }));

  // ── Metric cards ─────────────────────────────────────────────────────────

  const metricCards = USE_REAL_DATA
    ? [
        { label: "Visualizações", value: metricas.totalViews.toLocaleString("pt-BR"), icon: Eye },
        { label: "Leads recebidos", value: metricas.totalLeads.toString(), icon: Users },
        { label: "Favoritos", value: metricas.totalFavs.toString(), icon: Heart },
        {
          label: "Taxa de contato",
          value: metricas.taxaContato.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "%",
          icon: TrendingUp,
        },
      ]
    : MOCK_METRICS;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-h2 text-text-primary">
          Olá, {nomeSaudacao}! 👋
        </h1>
        <p className="text-body text-text-secondary mt-1">
          Aqui está o desempenho dos seus anúncios.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-border bg-background p-5 hover:shadow-card transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-brand-light p-2">
                <m.icon className="w-4 h-4 text-brand" />
              </div>
              {!USE_REAL_DATA && (
                <span className="flex items-center gap-0.5 text-micro font-medium text-trust-high">
                  <ArrowUpRight className="w-3 h-3" />
                  +12%
                </span>
              )}
            </div>
            <p className="font-display text-[26px] font-bold text-text-primary">{m.value}</p>
            <p className="text-micro text-text-muted mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Active ads */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3 text-text-primary">Seus anúncios ativos</h2>
          <Link to="/minha-conta/anuncios" className="text-small text-brand hover:underline flex items-center gap-1">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {veiculosAtivos.length === 0 ? (
          <div className="rounded-xl border border-border bg-background p-8 text-center">
            <p className="text-body text-text-secondary">Você não tem anúncios ativos no momento.</p>
            <Link
              to="/anunciar"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand text-primary-foreground px-5 py-2.5 text-small font-medium hover:brightness-90 transition-all"
            >
              Criar anúncio
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {veiculosAtivos.map((v) => {
              if (USE_REAL_DATA) {
                const rv = v as (typeof veiculos)[number];
                return (
                  <div
                    key={rv.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-border bg-background p-4 hover:shadow-card transition-shadow"
                  >
                    <img
                      src={fotoCapa(rv)}
                      alt={rv.modelo}
                      className="w-full sm:w-24 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-h4 text-text-primary truncate">
                        {rv.marca} {rv.modelo} {rv.versao}
                      </p>
                      <p className="text-small text-text-secondary">
                        {rv.ano} · {formatarKm(rv.quilometragem)} · {rv.cambio}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-lg font-bold text-text-primary">
                        {formatarPreco(rv.preco)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-micro text-text-muted">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {rv.visualizacoes}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {rv.leads_count}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {rv.favoritos_count}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        to={`/veiculo/${rv.slug}`}
                        className="rounded-full border border-border px-4 py-1.5 text-micro font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
                      >
                        Ver
                      </Link>
                      <button
                        disabled
                        title="Edição de anúncio em breve"
                        className="rounded-full border border-border px-4 py-1.5 text-micro font-medium text-text-secondary opacity-40 cursor-not-allowed"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                );
              }

              // Mock path
              const mv = v as (typeof MOCK_MY_VEHICLES)[number];
              return (
                <div
                  key={mv.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-border bg-background p-4 hover:shadow-card transition-shadow"
                >
                  <img src={mv.fotos[0]} alt={mv.modelo} className="w-full sm:w-24 h-20 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-h4 text-text-primary truncate">
                      {mv.marca} {mv.modelo} {mv.versao}
                    </p>
                    <p className="text-small text-text-secondary">
                      {mv.ano} · {formatKm(mv.quilometragem)} · {mv.cambio}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-lg font-bold text-text-primary">{formatPrice(mv.preco)}</p>
                    <div className="flex items-center gap-3 mt-1 text-micro text-text-muted">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {mv.visualizacoes}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {mv.leads_count}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {mv.favoritos_count}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      to={`/veiculo/${mv.slug}`}
                      className="rounded-full border border-border px-4 py-1.5 text-micro font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
                    >
                      Ver
                    </Link>
                    <button className="rounded-full border border-border px-4 py-1.5 text-micro font-medium text-text-secondary hover:bg-surface-secondary transition-colors">
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent leads */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 text-text-primary">Leads recentes</h2>
            <Link to="/minha-conta/leads" className="text-small text-brand hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {leadsRecentes.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-6 text-center">
              <p className="text-body text-text-secondary">Nenhum lead ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leadsRecentes.map((l) => {
                const nome = l.nome;
                const status = l.status;
                const veiculoNome = USE_REAL_DATA
                  ? (() => {
                      const rl = l as (typeof leadsReais)[number];
                      return rl.veiculos
                        ? `${rl.veiculos.marca} ${rl.veiculos.modelo}`
                        : "Veículo";
                    })()
                  : (l as (typeof MOCK_RECENT_LEADS)[number]).veiculo_nome;

                return (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                    <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
                      <span className="text-micro font-bold text-brand">{nome.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-medium text-text-primary truncate">{nome}</p>
                      <p className="text-micro text-text-muted truncate">{veiculoNome}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${STATUS_COLORS[status] ?? ""}`}>
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <button className="rounded-full bg-brand p-2 text-primary-foreground hover:brightness-90 transition-all">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* AI Suggestions */}
        <section>
          <h2 className="text-h3 text-text-primary mb-4">
            <Sparkles className="w-4 h-4 text-brand inline mr-1.5" />
            Sugestões da IA
          </h2>
          <div className="space-y-3">
            {AI_SUGGESTIONS.map((s, i) => (
              <div key={i} className="rounded-xl border border-brand/20 bg-brand-light/50 p-4">
                <p className="text-body text-text-primary mb-3">{s.text}</p>
                <button className="rounded-full bg-brand text-primary-foreground px-4 py-1.5 text-micro font-medium hover:brightness-90 transition-all">
                  {s.action}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Alerts */}
      {alertasDisplay.length > 0 && (
        <section>
          <h2 className="text-h3 text-text-primary mb-4">Alertas ativos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertasDisplay.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                <Bell className="w-4 h-4 text-brand flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium text-text-primary truncate">{a.nome}</p>
                  <p className="text-micro text-text-muted">{a.total_matches} encontrados</p>
                </div>
                <div
                  className={`w-8 h-5 rounded-full flex items-center transition-colors cursor-pointer ${
                    a.ativa ? "bg-brand justify-end" : "bg-border justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow mx-0.5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state: no alerts in real mode */}
      {USE_REAL_DATA && alertasDisplay.length === 0 && (
        <section>
          <h2 className="text-h3 text-text-primary mb-4">Alertas ativos</h2>
          <div className="rounded-xl border border-border bg-background p-6 text-center">
            <Bell className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-body text-text-secondary">Você não tem alertas de busca configurados.</p>
          </div>
        </section>
      )}
    </div>
  );
}
