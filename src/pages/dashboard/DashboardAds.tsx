import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Users, Heart, Plus, Pause, Play, Trash2, ExternalLink, Pencil, Star, TrendingDown, TrendingUp, Minus, BarChart3, Share2, Shield, X, Save, Loader2, Camera } from "lucide-react";
import { useVeiculosAnunciante, fotoCapa } from "@/hooks/useVeiculosAnunciante";
import type { VeiculoAnunciante } from "@/hooks/useVeiculosAnunciante";
import { formatarPreco, formatarKm } from "@/utils/formatters";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";
import ShareModal from "@/components/dashboard/ShareModal";
import GerenciarFotosModal from "@/components/dashboard/GerenciarFotosModal";

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
  const { veiculos, contagens, atualizarStatus, atualizarVeiculo, loading, recarregar } = useVeiculosAnunciante();
  const [destaqueLoading, setDestaqueLoading] = useState<string | null>(null);
  const [shareVeiculo, setShareVeiculo] = useState<typeof veiculos[number] | null>(null);
  const [editando, setEditando] = useState<VeiculoAnunciante | null>(null);
  const [fotosVeiculo, setFotosVeiculo] = useState<VeiculoAnunciante | null>(null);

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
    await atualizarStatus(id, "expirado");
  }

  async function handleDestacar(veiculoId: string) {
    setDestaqueLoading(veiculoId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("criar-checkout-destaque", {
        body: { veiculoId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error("Erro ao destacar:", error);
        return;
      }

      if (data.usou_plano) {
        await recarregar();
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Erro ao destacar:", err);
    } finally {
      setDestaqueLoading(null);
    }
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
                        {v.destaque && v.destaque_ate && (
                          <span className="rounded-full px-2 py-0.5 text-micro font-medium bg-warning/10 text-warning flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Destaque até {new Date(v.destaque_ate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </span>
                        )}
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
                      {tab === "ativos" && (
                        <>
                          <Link
                            to={`/inspecionar/${v.slug}`}
                            className={`rounded-lg border p-2 transition-colors ${
                              v.selo_inspecao
                                ? "border-brand text-brand hover:bg-brand/10"
                                : "border-border text-text-muted hover:text-brand hover:border-brand"
                            }`}
                            title={v.selo_inspecao ? "Ver inspeção" : "Inspecionar com IA"}
                          >
                            <Shield className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setShareVeiculo(v)}
                            className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors"
                            title="Compartilhar (Instagram, WhatsApp)"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDestacar(v.id)}
                            disabled={destaqueLoading === v.id}
                            className={`rounded-lg border p-2 transition-colors ${
                              v.destaque
                                ? "border-warning text-warning hover:bg-warning/10"
                                : "border-border text-text-muted hover:text-warning hover:border-warning"
                            } ${destaqueLoading === v.id ? "opacity-50 cursor-wait" : ""}`}
                            title={v.destaque ? "Renovar destaque" : "Destacar anúncio — R$ 29,90 por 7 dias"}
                          >
                            <Star className={`w-4 h-4 ${v.destaque ? "fill-current" : ""}`} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditando(v)}
                        title="Editar anúncio"
                        className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFotosVeiculo(v)}
                        title="Gerenciar fotos"
                        className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors"
                      >
                        <Camera className="w-4 h-4" />
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

      {/* Share Modal */}
      {shareVeiculo && (
        <ShareModal
          veiculo={shareVeiculo}
          fotoUrl={fotoCapa(shareVeiculo)}
          onClose={() => setShareVeiculo(null)}
        />
      )}

      {/* Modal de edição */}
      {editando && (
        <EditarAnuncioModal
          veiculo={editando}
          onClose={() => setEditando(null)}
          onSave={atualizarVeiculo}
        />
      )}

      {/* Modal de fotos */}
      {fotosVeiculo && (
        <GerenciarFotosModal
          veiculoId={fotosVeiculo.id}
          marca={fotosVeiculo.marca}
          modelo={fotosVeiculo.modelo}
          onClose={() => setFotosVeiculo(null)}
          onFotosChanged={recarregar}
          colorTheme="brand"
        />
      )}

      {/* Radar de Mercado FIPE */}
      {!loading && veiculos.filter(v => v.status === "publicado").length > 0 && (
        <div className="rounded-xl border border-border bg-background p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand" />
            <h2 className="text-h4 text-text-primary">Radar de Mercado FIPE</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(() => {
              const ativos = veiculos.filter(v => v.status === "publicado");
              const abaixo = ativos.filter(v => v.preco_status === "abaixo").length;
              const naMedia = ativos.filter(v => v.preco_status === "na_media").length;
              const acima = ativos.filter(v => v.preco_status === "acima").length;
              return (
                <>
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">{abaixo}</p>
                      <p className="text-micro text-green-600/70 dark:text-green-400/70">Abaixo da FIPE</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-3">
                    <Minus className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{naMedia}</p>
                      <p className="text-micro text-amber-600/70 dark:text-amber-400/70">Na faixa FIPE</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{acima}</p>
                      <p className="text-micro text-red-600/70 dark:text-red-400/70">Acima da FIPE</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <p className="text-micro text-text-muted mt-3">
            Baseado na tabela FIPE com ajustes por quilometragem e condição do veículo.
          </p>
        </div>
      )}

    </div>
  );
}

// ─── Modal de edição ──────────────────────────────────────────────────────────

const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico", "Híbrido", "GNV"];
const CAMBIOS = ["Automático", "Manual", "CVT", "Automatizado"];
const CONDICOES = ["Novo", "Seminovo", "Usado"];

function EditarAnuncioModal({
  veiculo,
  onClose,
  onSave,
}: {
  veiculo: VeiculoAnunciante;
  onClose: () => void;
  onSave: (id: string, dados: Partial<VeiculoAnunciante>) => Promise<{ error: unknown }>;
}) {
  const [preco, setPreco] = useState(veiculo.preco);
  const [quilometragem, setQuilometragem] = useState(veiculo.quilometragem);
  const [versao, setVersao] = useState(veiculo.versao ?? "");
  const [cor, setCor] = useState(veiculo.cor ?? "");
  const [combustivel, setCombustivel] = useState(veiculo.combustivel ?? "Flex");
  const [cambio, setCambio] = useState(veiculo.cambio ?? "Automático");
  const [condicao, setCondicao] = useState(veiculo.condicao ?? "Seminovo");
  const [descricao, setDescricao] = useState(veiculo.descricao ?? "");
  const [ipvaPago, setIpvaPago] = useState(veiculo.ipva_pago ?? false);
  const [revisoesEmDia, setRevisoesEmDia] = useState(veiculo.revisoes_em_dia ?? false);
  const [semSinistro, setSemSinistro] = useState(veiculo.sem_sinistro ?? false);
  const [aceitaTroca, setAceitaTroca] = useState(veiculo.aceita_troca ?? false);
  const [salvando, setSalvando] = useState(false);

  async function handleSave() {
    setSalvando(true);
    await onSave(veiculo.id, {
      preco,
      quilometragem,
      versao,
      cor,
      combustivel,
      cambio,
      condicao,
      descricao,
      ipva_pago: ipvaPago,
      revisoes_em_dia: revisoesEmDia,
      sem_sinistro: semSinistro,
      aceita_troca: aceitaTroca,
    });
    setSalvando(false);
    onClose();
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-small text-text-primary focus:border-brand focus:outline-none";
  const labelCls = "block text-micro font-medium text-text-secondary mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h4 text-text-primary">
            Editar — {veiculo.marca} {veiculo.modelo}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Preço (R$)</label>
              <input type="number" value={preco} onChange={(e) => setPreco(+e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Quilometragem</label>
              <input type="number" value={quilometragem} onChange={(e) => setQuilometragem(+e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Versão</label>
              <input value={versao} onChange={(e) => setVersao(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cor</label>
              <input value={cor} onChange={(e) => setCor(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Combustível</label>
              <select value={combustivel} onChange={(e) => setCombustivel(e.target.value)} className={inputCls}>
                {COMBUSTIVEIS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Câmbio</label>
              <select value={cambio} onChange={(e) => setCambio(e.target.value)} className={inputCls}>
                {CAMBIOS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Condição</label>
              <select value={condicao} onChange={(e) => setCondicao(e.target.value)} className={inputCls}>
                {CONDICOES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "IPVA pago", checked: ipvaPago, set: setIpvaPago },
              { label: "Revisões em dia", checked: revisoesEmDia, set: setRevisoesEmDia },
              { label: "Sem sinistro", checked: semSinistro, set: setSemSinistro },
              { label: "Aceita troca", checked: aceitaTroca, set: setAceitaTroca },
            ].map((item) => (
              <label key={item.label} className="flex items-center gap-2 text-small text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.set(e.target.checked)}
                  className="accent-brand"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-small text-text-secondary hover:bg-surface-secondary transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="rounded-lg bg-brand text-primary-foreground px-4 py-2 text-small font-medium hover:brightness-90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
