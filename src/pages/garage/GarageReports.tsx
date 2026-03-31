import { vehicles, formatPrice } from "@/data/mock";
import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Download, Users, TrendingUp, DollarSign, Clock, Target } from "lucide-react";

const periods = ["7 dias", "30 dias", "90 dias"] as const;

const leadsOverTime = [
  { week: "Sem 1", leads: 8 }, { week: "Sem 2", leads: 12 },
  { week: "Sem 3", leads: 15 }, { week: "Sem 4", leads: 11 },
  { week: "Sem 5", leads: 18 }, { week: "Sem 6", leads: 22 },
];

const funnelData = [
  { stage: "Novo", count: 47 },
  { stage: "Em contato", count: 32 },
  { stage: "Proposta", count: 18 },
  { stage: "Visita", count: 12 },
  { stage: "Vendido", count: 8 },
];

const kpis = [
  { label: "Leads totais", value: "47", icon: Users },
  { label: "Conversões", value: "8", icon: Target },
  { label: "Taxa de conversão", value: "17%", icon: TrendingUp },
  { label: "Ticket médio", value: "R$ 168k", icon: DollarSign },
  { label: "Tempo médio de venda", value: "22 dias", icon: Clock },
];

const vehiclePerformance = vehicles.slice(0, 6).map((v) => ({
  name: `${v.marca} ${v.modelo} ${v.ano}`,
  views: v.visualizacoes,
  leads: v.leads_count,
  favs: v.favoritos_count,
  rate: ((v.leads_count / v.visualizacoes) * 100).toFixed(1) + "%",
}));

const vendorPerformance = [
  { name: "Carlos Silva", leads: 18, conversions: 5, rate: "28%", ticket: "R$ 172k" },
  { name: "Ana Oliveira", leads: 15, conversions: 4, rate: "27%", ticket: "R$ 165k" },
  { name: "Pedro Santos", leads: 14, conversions: 3, rate: "21%", ticket: "R$ 158k" },
];

export default function GarageReports() {
  const [period, setPeriod] = useState<(typeof periods)[number]>("30 dias");

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-h2 text-text-primary">Relatórios</h1>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
            {periods.map((p) => (
              <button
                key={p} onClick={() => setPeriod(p)}
                className={`rounded-lg px-4 py-1.5 text-micro font-medium transition-colors ${period === p ? "bg-background text-text-primary shadow-card" : "text-text-muted"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="rounded-full border border-border px-4 py-1.5 text-micro font-medium text-text-secondary hover:bg-surface-secondary transition-colors flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-background p-4 text-center">
            <k.icon className="w-4 h-4 text-garage mx-auto mb-2" />
            <p className="font-display text-xl font-bold text-text-primary">{k.value}</p>
            <p className="text-micro text-text-muted">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Leads over time */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="text-h4 text-text-primary mb-4">Evolução de leads</h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={leadsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius-md)", fontSize: 13 }} />
              <Line type="monotone" dataKey="leads" stroke="hsl(var(--garage-primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--garage-primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h3 className="text-h4 text-text-primary mb-4">Funil de conversão</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--text-muted))" />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={100} stroke="hsl(var(--text-muted))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius-md)", fontSize: 13 }} />
              <Bar dataKey="count" fill="hsl(var(--garage-primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vehicle performance table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-6 pb-0"><h3 className="text-h4 text-text-primary mb-4">Performance por veículo</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {["Veículo", "Views", "Leads", "Favs", "Taxa"].map((h) => (
                  <th key={h} className={`text-micro font-medium text-text-muted uppercase tracking-wider p-4 ${h === "Veículo" ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehiclePerformance.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
                  <td className="p-4 text-small text-text-primary font-medium">{r.name}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{r.views.toLocaleString("pt-BR")}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{r.leads}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{r.favs}</td>
                  <td className="p-4 text-right text-small text-garage font-medium">{r.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor performance table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-6 pb-0"><h3 className="text-h4 text-text-primary mb-4">Performance por vendedor</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {["Vendedor", "Leads", "Conversões", "Taxa", "Ticket médio"].map((h) => (
                  <th key={h} className={`text-micro font-medium text-text-muted uppercase tracking-wider p-4 ${h === "Vendedor" ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendorPerformance.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
                  <td className="p-4 text-small text-text-primary font-medium">{r.name}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{r.leads}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{r.conversions}</td>
                  <td className="p-4 text-right text-small text-garage font-medium">{r.rate}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{r.ticket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
