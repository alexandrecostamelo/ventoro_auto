import { useState } from "react";
import { vehicles as mockVehicles, formatPrice } from "@/data/mock";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { USE_REAL_DATA } from "@/config/flags";
import { useVeiculosAnunciante } from "@/hooks/useVeiculosAnunciante";
import { formatarPreco } from "@/utils/formatters";

// ─── Period config ────────────────────────────────────────────────────────────

const PERIODS = ["7 dias", "30 dias", "90 dias"] as const;
type Period = (typeof PERIODS)[number];

// ─── Simulated views chart (Option B) ─────────────────────────────────────────

/**
 * Distributes a total view count across days with a realistic weekly curve.
 * Weekend days (Sat/Sun) get higher weight. No historical data is stored,
 * so this is a plausible approximation derived from the real cumulative total.
 */
function gerarViewsSimuladas(total: number, periodo: Period): { day: string; views: number }[] {
  if (total === 0) {
    const labels7 = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    return labels7.map((day) => ({ day, views: 0 }));
  }

  if (periodo === "7 dias") {
    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const weights = [0.10, 0.13, 0.11, 0.16, 0.15, 0.24, 0.18];
    return labels.map((day, i) => ({ day, views: Math.round(total * weights[i]) }));
  }

  if (periodo === "30 dias") {
    const items: { day: string; views: number }[] = [];
    const weights: number[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      const dow = d.getDay();
      weights.push(dow === 0 || dow === 6 ? 1.4 : 0.9);
    }
    const sumW = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      items.push({
        day: `${d.getDate()}/${d.getMonth() + 1}`,
        views: Math.round((total * weights[i]) / sumW),
      });
    }
    return items;
  }

  // 90 dias — aggregate by week (13 weeks)
  const basePerWeek = Math.round(total / 13);
  return Array.from({ length: 13 }, (_, i) => ({
    day: `S${i + 1}`,
    views: basePerWeek,
  }));
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_VIEWS_7D = [
  { day: "Seg", views: 120 }, { day: "Ter", views: 185 },
  { day: "Qua", views: 142 }, { day: "Qui", views: 210 },
  { day: "Sex", views: 198 }, { day: "Sáb", views: 310 },
  { day: "Dom", views: 245 },
];

const MOCK_LEADS_PER_VEHICLE = mockVehicles.slice(0, 5).map((v) => ({
  name: `${v.marca} ${v.modelo}`,
  leads: v.leads_count,
}));

const MOCK_PERFORMANCE = mockVehicles.slice(0, 6).map((v) => ({
  name: `${v.marca} ${v.modelo} ${v.ano}`,
  views: v.visualizacoes,
  leads: v.leads_count,
  favs: v.favoritos_count,
  rate: ((v.leads_count / v.visualizacoes) * 100).toFixed(1) + "%",
}));

const HEATMAP_DATA = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, "0")}h`,
  value:
    h >= 8 && h <= 21
      ? Math.round(20 + Math.random() * 80)
      : Math.round(Math.random() * 20),
}));

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface-secondary animate-pulse"
      style={{ height }}
    />
  );
}

// ─── Tooltip style ────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius-md)",
  fontSize: 13,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardMetrics() {
  const [period, setPeriod] = useState<Period>("7 dias");
  const { veiculos, metricas, loading } = useVeiculosAnunciante();

  // Derived data for real path
  const viewsData = USE_REAL_DATA
    ? gerarViewsSimuladas(metricas.totalViews, period)
    : MOCK_VIEWS_7D;

  const leadsPerVehicle = USE_REAL_DATA
    ? veiculos.slice(0, 5).map((v) => ({
        name: `${v.marca} ${v.modelo}`,
        leads: v.leads_count,
      }))
    : MOCK_LEADS_PER_VEHICLE;

  const performanceTable = USE_REAL_DATA
    ? veiculos.map((v) => ({
        name: `${v.marca} ${v.modelo} ${v.ano}`,
        views: v.visualizacoes,
        leads: v.leads_count,
        favs: v.favoritos_count,
        rate:
          v.visualizacoes > 0
            ? ((v.leads_count / v.visualizacoes) * 100).toFixed(1) + "%"
            : "0.0%",
        preco: v.preco,
      }))
    : MOCK_PERFORMANCE;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-h2 text-text-primary">Métricas</h1>
        <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-1.5 text-micro font-medium transition-colors ${
                period === p
                  ? "bg-background text-text-primary shadow-card"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Views chart */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="text-h4 text-text-primary mb-1">Visualizações ao longo do tempo</h3>
        {USE_REAL_DATA && (
          <p className="text-micro text-text-muted mb-4">
            Estimativa proporcional baseada no total acumulado de visualizações.
          </p>
        )}
        {!USE_REAL_DATA && <div className="mb-4" />}
        {USE_REAL_DATA && loading ? (
          <SkeletonChart height={280} />
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--brand-primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--brand-primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Leads per vehicle */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="text-h4 text-text-primary mb-4">Leads por veículo</h3>
        {USE_REAL_DATA && loading ? (
          <SkeletonChart height={240} />
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsPerVehicle} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={130}
                  stroke="hsl(var(--text-muted))"
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="leads" fill="hsl(var(--brand-primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Performance table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-h4 text-text-primary mb-4">Performance por anúncio</h3>
        </div>
        {USE_REAL_DATA && loading ? (
          <div className="p-6">
            <SkeletonChart height={180} />
          </div>
        ) : performanceTable.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-body text-text-secondary">Nenhum anúncio encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Veículo</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Preço</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Views</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Leads</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Favs</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {performanceTable.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors"
                  >
                    <td className="p-4 text-small text-text-primary font-medium">{row.name}</td>
                    <td className="p-4 text-right text-small text-text-secondary">
                      {USE_REAL_DATA && "preco" in row
                        ? formatarPreco(row.preco)
                        : formatPrice((row as typeof MOCK_PERFORMANCE[0] & { preco?: number }).preco ?? 0)}
                    </td>
                    <td className="p-4 text-right text-small text-text-secondary">
                      {row.views.toLocaleString("pt-BR")}
                    </td>
                    <td className="p-4 text-right text-small text-text-secondary">{row.leads}</td>
                    <td className="p-4 text-right text-small text-text-secondary">{row.favs}</td>
                    <td className="p-4 text-right text-small text-brand font-medium">{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Heatmap — decorative, no real data source */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="text-h4 text-text-primary mb-4">Horários com mais acessos</h3>
        <div className="flex flex-wrap gap-1.5">
          {HEATMAP_DATA.map((h) => {
            const intensity = Math.min(h.value / 100, 1);
            return (
              <div
                key={h.hour}
                className="flex flex-col items-center gap-1"
                title={`${h.hour}: ${h.value} acessos`}
              >
                <div
                  className="w-8 h-8 rounded-md"
                  style={{ backgroundColor: `hsl(157 69% 37% / ${0.08 + intensity * 0.92})` }}
                />
                <span className="text-[9px] text-text-muted">{h.hour}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
