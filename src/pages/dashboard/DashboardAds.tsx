import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Users, Heart, Plus, Pause, Play, Trash2, ExternalLink, Pencil } from "lucide-react";
import { useVeiculosAnunciante, fotoCapa } from "@/hooks/useVeiculosAnunciante";
import { formatarPreco, formatarKm } from "@/utils/formatters";
import type { Database } from "@/types/database.types";

type TabKey = "ativos" | "pausados" | "vendidos" | "rascunhos";
type StatusVeiculo = Database["public"]["Tables"]["veiculos"]["Row"]["status"];

const TAB_TO_STATUS: Record<TabKey, StatusVeiculo> = {
  ativos: "publicado",
  pausados: "pausado",
  vendidos: "vendido",
  rascunhos: "rascunho",
};

const TAB_LABEL: Record<TabKey, string> = {
  ativos: "Ativo",
  pausados: "Pausado",
  vendidos: "Vendido",
  rascunhos: "Rascunho",
};

const TAB_STATUS_COLOR: Record<TabKey, string> = {
  ativos: "bg-trust-high/10 text-trust-high",
  pausados: "bg-warning/10 text-warning",
  vendidos: "bg-brand-dark/10 text-brand-dark",
  rascunhos: "bg-text-muted/10 text-text-muted",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonAds() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-4 h-24" />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardAds() {
  const [tab, setTab] = useState<TabKey>("ativos");
  const { veiculos, contagens, atualizarStatus, loading } = useVeiculosAnunciante();

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "ativos", label: "Ativos", count: contagens.publicado },
    { key: "pausados", label: "Pausados", count: contagens.pausado },
    { key: "vendidos", label: "Vendidos", count: contagens.vendido },
    { key: "rascunhos", label: "Rascunhos", count: contagens.rascunho },
  ];

  const displayed = veiculos.filter((v) => v.status === TAB_TO_STATUS[tab]);

  async function handleTogglePause(id: string, currentStatus: StatusVeiculo) {
    const next: StatusVeiculo = currentStatus === "publicado" ? "pausado" : "publicado";
    await atualizarStatus(id, next);
  }

  async function handleDelete(id: string) {
    // In a real implementation, show confirmation dialog first.
    // For MVP, just update status to 'expirado' as soft-delete.
    await atualizarStatus(id, "expirado");
  }

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
              tab === t.key
                ? "bg-background text-text-primary shadow-card"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {t.label} <span className="text-micro opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <SkeletonAds />}

      {/* Vehicle list */}
      {!loading && (
        <>
          {displayed.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-10 text-center">
              <p className="text-body text-text-secondary">Nenhum anúncio nesta categoria.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((v) => {
                const diasRestantes = v.validade_ate
                  ? Math.max(0, Math.floor((new Date(v.validade_ate).getTime() - Date.now()) / 86400000))
                  : null;
                const planoLabel = { basico: "Básico", premium: "Premium", turbo: "Turbo" }[v.plano] ?? v.plano;

                return (
                  <div
                    key={v.id}
                    className="flex flex-col md:flex-row items-start md:items-center gap-4 rounded-xl border border-border bg-background p-4 hover:shadow-card transition-shadow"
                  >
                    <img
                      src={fotoCapa(v)}
                      alt={v.modelo}
                      className="w-full md:w-28 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-h4 text-text-primary truncate">
                          {v.marca} {v.modelo} {v.versao}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-micro font-medium ${TAB_STATUS_COLOR[tab]}`}>
                          {TAB_LABEL[tab]}
                        </span>
                      </div>
                      <p className="text-small text-text-secondary">
                        {v.ano} · {formatarKm(v.quilometragem)} · Plano {planoLabel}
                        {diasRestantes !== null ? ` · Expira em ${diasRestantes} dias` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-micro text-text-muted flex-shrink-0">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.visualizacoes}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {v.leads_count}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {v.favoritos_count}</span>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="font-display text-lg font-bold text-text-primary text-right">
                        {formatarPreco(v.preco)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        disabled
                        title="Edição de anúncio em breve"
                        className="rounded-lg border border-border p-2 text-text-muted opacity-40 cursor-not-allowed"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/veiculo/${v.slug}`}
                        className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors"
                        title="Ver anúncio"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {(tab === "ativos" || tab === "pausados") && (
                        <button
                          onClick={() => handleTogglePause(v.id, v.status)}
                          className="rounded-lg border border-border p-2 text-text-muted hover:text-warning hover:border-warning transition-colors"
                          title={tab === "pausados" ? "Ativar" : "Pausar"}
                        >
                          {tab === "pausados" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="rounded-lg border border-border p-2 text-text-muted hover:text-danger hover:border-danger transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
}
