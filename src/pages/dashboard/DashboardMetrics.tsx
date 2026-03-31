import { vehicles, formatPrice } from "@/data/mock";
import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Eye, Users, Heart, TrendingUp } from "lucide-react";

const periods = ["7 dias", "30 dias", "90 dias"] as const;

const viewsData = [
  { day: "Seg", views: 120 }, { day: "Ter", views: 185 },
  { day: "Qua", views: 142 }, { day: "Qui", views: 210 },
  { day: "Sex", views: 198 }, { day: "Sáb", views: 310 },
  { day: "Dom", views: 245 },
];

const leadsPerVehicle = vehicles.slice(0, 5).map((v) => ({
  name: `${v.marca} ${v.modelo}`,
  leads: v.leads_count,
}));

const heatmapData = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, "0")}h`,
  value: h >= 8 && h <= 21
    ? Math.round(20 + Math.random() * 80)
    : Math.round(Math.random() * 20),
}));

const performanceTable = vehicles.slice(0, 6).map((v) => ({
  name: `${v.marca} ${v.modelo} ${v.ano}`,
  views: v.visualizacoes,
  leads: v.leads_count,
  favs: v.favoritos_count,
  rate: ((v.leads_count / v.visualizacoes) * 100).toFixed(1) + "%",
  response: "12 min",
}));

export default function DashboardMetrics() {
  const [period, setPeriod] = useState<(typeof periods)[number]>("7 dias");

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-h2 text-text-primary">Métricas</h1>
        <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-1.5 text-micro font-medium transition-colors ${
                period === p ? "bg-background text-text-primary shadow-card" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Views chart */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="text-h4 text-text-primary mb-4">Visualizações ao longo do tempo</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--brand-primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--brand-primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leads per vehicle */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="text-h4 text-text-primary mb-4">Leads por veículo</h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadsPerVehicle} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} stroke="hsl(var(--text-muted))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="leads" fill="hsl(var(--brand-primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-h4 text-text-primary mb-4">Performance por anúncio</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Veículo</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Views</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Leads</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Favs</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Taxa</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Resposta</th>
              </tr>
            </thead>
            <tbody>
              {performanceTable.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
                  <td className="p-4 text-small text-text-primary font-medium">{row.name}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{row.views.toLocaleString("pt-BR")}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{row.leads}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{row.favs}</td>
                  <td className="p-4 text-right text-small text-brand font-medium">{row.rate}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{row.response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="text-h4 text-text-primary mb-4">Horários com mais acessos</h3>
        <div className="flex flex-wrap gap-1.5">
          {heatmapData.map((h) => {
            const intensity = Math.min(h.value / 100, 1);
            return (
              <div key={h.hour} className="flex flex-col items-center gap-1" title={`${h.hour}: ${h.value} acessos`}>
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
