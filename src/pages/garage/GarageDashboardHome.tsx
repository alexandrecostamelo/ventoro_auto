import { Link } from "react-router-dom";
import {
  Car, Users, TrendingUp, Eye, Heart, Star,
  ArrowUpRight, Sparkles, ChevronRight, AlertTriangle,
} from "lucide-react";
import { useMinhaGaragem } from "@/hooks/useMinhaGaragem";
import { useVeiculosGaragem, fotoCapa } from "@/hooks/useVeiculosGaragem";
import { useLeadsGaragem } from "@/hooks/useLeadsGaragem";

const STAGE_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  proposta: "Proposta",
  visita: "Visita",
  vendido: "Vendido",
};
const FUNNEL_STAGES = ["novo", "em_contato", "proposta", "visita", "vendido"];

// Ranking decorativo — dados de equipe reais virão na Fase 3
const teamRanking = [
  { name: "Carlos Silva", leads: 18, conversions: 5 },
  { name: "Ana Oliveira", leads: 15, conversions: 4 },
  { name: "Pedro Santos", leads: 14, conversions: 3 },
];

function diasDesde(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function GarageDashboardHome() {
  const { garagem, loading: gLoading } = useMinhaGaragem();
  const { veiculos, metricas, contagens, loading: vLoading } = useVeiculosGaragem(garagem?.id ?? null);
  const { leads, loading: lLoading } = useLeadsGaragem(garagem?.id ?? null);

  const loading = gLoading || vLoading || lLoading;

  if (loading || !garagem) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-garage border-t-transparent animate-spin" />
      </div>
    );
  }

  const metrics = [
    { label: "Veículos ativos", value: String(contagens.publicado), icon: Car },
    { label: "Leads totais", value: String(leads.length), icon: Users },
    { label: "Taxa de contato", value: `${metricas.taxaContato}%`, icon: TrendingUp },
    { label: "Visualizações", value: metricas.totalViews.toLocaleString("pt-BR"), icon: Eye },
    { label: "Favoritos", value: String(metricas.totalFavs), icon: Heart },
    { label: "Avaliação", value: garagem.avaliacao ? garagem.avaliacao.toFixed(1) : "—", icon: Star },
  ];

  // Funnel de leads por status
  const funnelCounts = FUNNEL_STAGES.map((s) => leads.filter((l) => l.status === s).length);
  const maxFunnel = Math.max(...funnelCounts, 1);
  const funnelStages = FUNNEL_STAGES.map((s, i) => ({
    label: STAGE_LABELS[s],
    count: funnelCounts[i],
    pct: Math.round((funnelCounts[i] / maxFunnel) * 100),
  }));

  // Top performers por visualizações
  const topPerformers = [...veiculos]
    .sort((a, b) => b.visualizacoes - a.visualizacoes)
    .slice(0, 3);

  // Estoque crítico: publicado há mais de 30 dias
  const criticalStock = veiculos
    .filter((v) => v.status === "publicado" && diasDesde(v.publicado_em) > 30)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 text-text-primary">{garagem.nome}</h1>
        <p className="text-body text-text-secondary mt-1">Visão geral da sua garagem</p>
      </div>

      {/* AI Alert — decorativo */}
      {criticalStock.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="rounded-lg bg-warning/10 p-2 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-small font-medium text-text-primary">
              ✦ {criticalStock.length} {criticalStock.length === 1 ? "veículo está parado" : "veículos estão parados"} há mais de 30 dias.
            </p>
            <p className="text-micro text-text-muted">
              A IA sugere ajustes de preço para acelerar as vendas.
            </p>
          </div>
          <Link
            to="/painel/estoque"
            className="rounded-full bg-warning text-white px-4 py-1.5 text-micro font-medium hover:brightness-90 transition-all flex-shrink-0"
          >
            Ver estoque
          </Link>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-background p-4">
            <m.icon className="w-4 h-4 text-garage mb-2" />
            <p className="font-display text-[22px] font-bold text-text-primary">{m.value}</p>
            <p className="text-micro text-text-muted">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <section className="rounded-xl border border-border bg-background p-6">
        <h2 className="text-h3 text-text-primary mb-5">Funil de leads</h2>
        {leads.length === 0 ? (
          <p className="text-small text-text-muted text-center py-8">Nenhum lead registrado ainda.</p>
        ) : (
          <div className="flex items-end gap-2">
            {funnelStages.map((s, i) => (
              <div key={s.label} className="flex-1 text-center">
                <p className="font-display text-lg font-bold text-text-primary">{s.count}</p>
                <div
                  className="mx-auto rounded-t-md bg-garage/80 transition-all"
                  style={{ height: `${Math.max(s.pct * 1.5, 20)}px`, width: "100%" }}
                />
                <p className="text-micro text-text-muted mt-2">{s.label}</p>
                {i < funnelStages.length - 1 && s.count > 0 && (
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {Math.round((funnelStages[i + 1].count / s.count) * 100)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top performers */}
        <section className="rounded-xl border border-border bg-background p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 text-text-primary">Top performers</h2>
            <Link to="/painel/estoque" className="text-small text-garage hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {topPerformers.length === 0 ? (
            <p className="text-small text-text-muted py-4">Nenhum veículo cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((v, i) => {
                const foto = fotoCapa(v);
                return (
                  <div key={v.id} className="flex items-center gap-3">
                    <span className="font-display text-lg font-bold text-garage w-6">{i + 1}</span>
                    <img
                      src={foto}
                      alt={v.modelo}
                      className="w-14 h-10 object-cover rounded-md flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-medium text-text-primary truncate">
                        {v.marca} {v.modelo}
                      </p>
                      <p className="text-micro text-text-muted">
                        {v.leads_count} leads · {v.visualizacoes.toLocaleString("pt-BR")} views
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Team ranking — decorativo (Fase 3) */}
        <section className="rounded-xl border border-border bg-background p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 text-text-primary">Performance da equipe</h2>
            <Link to="/painel/equipe" className="text-small text-garage hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {teamRanking.map((t, i) => (
              <div key={t.name} className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-garage w-6">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-garage-light flex items-center justify-center">
                  <span className="text-micro font-bold text-garage">{t.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-small font-medium text-text-primary">{t.name}</p>
                  <p className="text-micro text-text-muted">{t.leads} leads · {t.conversions} vendas</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Critical stock */}
      {criticalStock.length > 0 && (
        <section className="rounded-xl border border-warning/30 bg-background p-6">
          <h2 className="text-h3 text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Estoque crítico
          </h2>
          <div className="space-y-3">
            {criticalStock.map((v) => {
              const foto = fotoCapa(v);
              const dias = diasDesde(v.publicado_em);
              return (
                <div key={v.id} className="flex items-center gap-4 rounded-lg bg-warning/5 p-3">
                  <img
                    src={foto}
                    alt={v.modelo}
                    className="w-16 h-12 object-cover rounded-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-medium text-text-primary">
                      {v.marca} {v.modelo} {v.versao}
                    </p>
                    <p className="text-micro text-warning">
                      Parado há {dias} dias
                    </p>
                  </div>
                  <Link
                    to="/painel/estoque"
                    className="rounded-full bg-warning text-white px-4 py-1.5 text-micro font-medium hover:brightness-90 transition-all flex-shrink-0"
                  >
                    Ver
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
