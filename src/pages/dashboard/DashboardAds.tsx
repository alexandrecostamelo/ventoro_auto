import { vehicles, formatPrice, formatKm } from "@/data/mock";
import { Link } from "react-router-dom";
import { Eye, Users, Heart, Plus, Pause, Play, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";

type TabKey = "ativos" | "pausados" | "vendidos" | "rascunhos";

const allAds = vehicles.slice(0, 6);

export default function DashboardAds() {
  const [tab, setTab] = useState<TabKey>("ativos");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "ativos", label: "Ativos", count: 4 },
    { key: "pausados", label: "Pausados", count: 1 },
    { key: "vendidos", label: "Vendidos", count: 3 },
    { key: "rascunhos", label: "Rascunhos", count: 1 },
  ];

  const displayed = tab === "ativos" ? allAds.slice(0, 4) : tab === "pausados" ? allAds.slice(4, 5) : tab === "vendidos" ? allAds.slice(2, 5) : allAds.slice(5, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-h2 text-text-primary">Meus anúncios</h1>
        <Link
          to="/anunciar"
          className="inline-flex items-center gap-2 rounded-full bg-brand text-primary-foreground px-5 py-2.5 text-small font-medium hover:brightness-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo anúncio
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-secondary rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-small font-medium transition-colors ${
              tab === t.key ? "bg-background text-text-primary shadow-card" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {t.label} <span className="text-micro opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {displayed.map((v) => (
          <div
            key={v.id}
            className="flex flex-col md:flex-row items-start md:items-center gap-4 rounded-xl border border-border bg-background p-4 hover:shadow-card transition-shadow"
          >
            <img src={v.fotos[0]} alt={v.modelo} className="w-full md:w-28 h-20 object-cover rounded-lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-h4 text-text-primary truncate">
                  {v.marca} {v.modelo} {v.versao}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-micro font-medium ${
                  tab === "ativos" ? "bg-trust-high/10 text-trust-high" :
                  tab === "pausados" ? "bg-warning/10 text-warning" :
                  tab === "vendidos" ? "bg-brand-dark/10 text-brand-dark" :
                  "bg-text-muted/10 text-text-muted"
                }`}>
                  {tab === "ativos" ? "Ativo" : tab === "pausados" ? "Pausado" : tab === "vendidos" ? "Vendido" : "Rascunho"}
                </span>
              </div>
              <p className="text-small text-text-secondary">
                {v.ano} · {formatKm(v.quilometragem)} · Plano Premium · Expira em 45 dias
              </p>
            </div>
            <div className="flex items-center gap-4 text-micro text-text-muted flex-shrink-0">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.visualizacoes}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {v.leads_count}</span>
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {v.favoritos_count}</span>
            </div>
            <div className="flex-shrink-0">
              <p className="font-display text-lg font-bold text-text-primary text-right">{formatPrice(v.preco)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                to={`/veiculo/${v.slug}/landing`}
                className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors"
                title="Ver landing page"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                className="rounded-lg border border-border p-2 text-text-muted hover:text-warning hover:border-warning transition-colors"
                title={tab === "pausados" ? "Ativar" : "Pausar"}
              >
                {tab === "pausados" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                className="rounded-lg border border-border p-2 text-text-muted hover:text-danger hover:border-danger transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
