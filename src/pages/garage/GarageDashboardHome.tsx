import { vehicles, leads, garages, formatPrice, formatKm } from "@/data/mock";
import { Link } from "react-router-dom";
import {
  Car, Users, TrendingUp, Clock, DollarSign, RotateCcw,
  ArrowUpRight, Sparkles, ChevronRight, Eye, AlertTriangle,
} from "lucide-react";

const garage = garages[0];
const garageVehicles = vehicles.slice(0, 6);

const metrics = [
  { label: "Veículos ativos", value: "18", icon: Car, change: "+2" },
  { label: "Leads este mês", value: "47", icon: Users, change: "+12%" },
  { label: "Taxa de conversão", value: "18%", icon: TrendingUp, change: "+3%" },
  { label: "Tempo médio de venda", value: "22 dias", icon: Clock, change: "-4d" },
  { label: "Receita estimada", value: "R$ 1.2M", icon: DollarSign, change: "+8%" },
  { label: "Giro de estoque", value: "34 dias", icon: RotateCcw, change: "-6d" },
];

const funnelStages = [
  { label: "Novo", count: 18, pct: 100 },
  { label: "Em contato", count: 12, pct: 67 },
  { label: "Proposta", count: 7, pct: 39 },
  { label: "Visita", count: 5, pct: 28 },
  { label: "Vendido", count: 3, pct: 17 },
];

const topPerformers = garageVehicles.slice(0, 3);
const criticalStock = garageVehicles.filter((v) => v.quilometragem > 40000).slice(0, 2);

const teamRanking = [
  { name: "Carlos Silva", leads: 18, conversions: 5 },
  { name: "Ana Oliveira", leads: 15, conversions: 4 },
  { name: "Pedro Santos", leads: 14, conversions: 3 },
];

export default function GarageDashboardHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 text-text-primary">{garage.nome}</h1>
        <p className="text-body text-text-secondary mt-1">Visão geral da sua garagem</p>
      </div>

      {/* AI Alert */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="rounded-lg bg-warning/10 p-2 flex-shrink-0">
          <Sparkles className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1">
          <p className="text-small font-medium text-text-primary">✦ 3 veículos estão parados há mais de 60 dias.</p>
          <p className="text-micro text-text-muted">A IA sugere ajustes de preço para acelerar as vendas.</p>
        </div>
        <Link to="/painel/estoque" className="rounded-full bg-warning text-white px-4 py-1.5 text-micro font-medium hover:brightness-90 transition-all flex-shrink-0">
          Ver sugestões
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-background p-4">
            <m.icon className="w-4 h-4 text-garage mb-2" />
            <p className="font-display text-[22px] font-bold text-text-primary">{m.value}</p>
            <p className="text-micro text-text-muted">{m.label}</p>
            <span className="text-micro text-trust-high flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" /> {m.change}
            </span>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <section className="rounded-xl border border-border bg-background p-6">
        <h2 className="text-h3 text-text-primary mb-5">Funil de leads</h2>
        <div className="flex items-end gap-2">
          {funnelStages.map((s, i) => (
            <div key={s.label} className="flex-1 text-center">
              <p className="font-display text-lg font-bold text-text-primary">{s.count}</p>
              <div
                className="mx-auto rounded-t-md bg-garage/80 transition-all"
                style={{ height: `${Math.max(s.pct * 1.5, 20)}px`, width: "100%" }}
              />
              <p className="text-micro text-text-muted mt-2">{s.label}</p>
              {i < funnelStages.length - 1 && (
                <p className="text-[10px] text-text-muted mt-0.5">
                  {Math.round((funnelStages[i + 1].count / s.count) * 100)}%
                </p>
              )}
            </div>
          ))}
        </div>
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
          <div className="space-y-3">
            {topPerformers.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-garage w-6">{i + 1}</span>
                <img src={v.fotos[0]} alt={v.modelo} className="w-14 h-10 object-cover rounded-md" />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium text-text-primary truncate">{v.marca} {v.modelo}</p>
                  <p className="text-micro text-text-muted">{v.leads_count} leads · {v.visualizacoes} views</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team ranking */}
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
            {criticalStock.map((v) => (
              <div key={v.id} className="flex items-center gap-4 rounded-lg bg-warning/5 p-3">
                <img src={v.fotos[0]} alt={v.modelo} className="w-16 h-12 object-cover rounded-md" />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium text-text-primary">{v.marca} {v.modelo} {v.versao}</p>
                  <p className="text-micro text-warning">Parado há 67 dias · IA sugere reduzir R$ 5.000</p>
                </div>
                <button className="rounded-full bg-warning text-white px-4 py-1.5 text-micro font-medium hover:brightness-90 transition-all flex-shrink-0">
                  Aplicar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
