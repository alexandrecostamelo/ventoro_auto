import { Link } from "react-router-dom";
import { Eye, Users, Heart, Plus, Pause, Play, Trash2, Sparkles, Search, Check, DollarSign } from "lucide-react";
import { useState } from "react";
import { useMinhaGaragem } from "@/hooks/useMinhaGaragem";
import { useVeiculosGaragem, fotoCapa } from "@/hooks/useVeiculosGaragem";
import type { Database } from "@/types/database.types";

type VeiculoStatus = Database["public"]["Tables"]["veiculos"]["Row"]["status"];

const STATUS_LABEL: Record<VeiculoStatus, string> = {
  publicado: "Ativo",
  pausado: "Pausado",
  rascunho: "Rascunho",
  vendido: "Vendido",
  expirado: "Expirado",
};

const STATUS_COLOR: Record<VeiculoStatus, string> = {
  publicado: "bg-trust-high/10 text-trust-high",
  pausado: "bg-warning/10 text-warning",
  rascunho: "bg-text-muted/10 text-text-muted",
  vendido: "bg-info/10 text-info",
  expirado: "bg-danger/10 text-danger",
};

function formatarPreco(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatarKm(v: number) {
  return v.toLocaleString("pt-BR") + " km";
}

function diasPublicado(iso: string | null): string {
  if (!iso) return "—";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  return String(dias);
}

export default function GarageInventory() {
  const { garagem, loading: gLoading } = useMinhaGaragem();
  const { veiculos, contagens, atualizarStatus, loading: vLoading } = useVeiculosGaragem(garagem?.id ?? null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loading = gLoading || vLoading;

  const filtered = veiculos.filter(
    (v) =>
      search === "" ||
      `${v.marca} ${v.modelo} ${v.versao ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  async function handleTogglePause(id: string, status: VeiculoStatus) {
    if (status === "publicado") await atualizarStatus(id, "pausado");
    else if (status === "pausado") await atualizarStatus(id, "publicado");
  }

  async function handleMarkSold(id: string) {
    await atualizarStatus(id, "vendido");
  }

  async function handleDelete(id: string) {
    await atualizarStatus(id, "expirado");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-garage border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 text-text-primary">Gestão de estoque</h1>
          <p className="text-small text-text-muted mt-1">
            {contagens.publicado} ativos · {contagens.pausado} pausados · {contagens.vendido} vendidos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled
            className="rounded-full border border-border px-4 py-2 text-micro font-medium text-text-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Em breve"
          >
            Importar lote
          </button>
          <Link
            to="/anunciar"
            className="inline-flex items-center gap-2 rounded-full bg-garage text-white px-5 py-2 text-small font-medium hover:brightness-90 transition-all"
          >
            <Plus className="w-4 h-4" /> Adicionar veículo
          </Link>
        </div>
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no estoque..."
            className="flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <button className="rounded-full bg-warning/20 text-warning px-4 py-2 text-micro font-medium" disabled>
              Pausar ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {veiculos.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-body text-text-muted">Nenhum veículo cadastrado nesta garagem.</p>
            <Link to="/anunciar" className="inline-flex items-center gap-2 mt-4 rounded-full bg-garage text-white px-5 py-2 text-small font-medium hover:brightness-90 transition-all">
              <Plus className="w-4 h-4" /> Adicionar primeiro veículo
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="p-4 w-10">
                    <div className="w-4 h-4 rounded border border-border" />
                  </th>
                  <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Veículo</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Preço</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4 hidden md:table-cell">KM</th>
                  <th className="text-center text-micro font-medium text-text-muted uppercase tracking-wider p-4 hidden lg:table-cell">Status</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4 hidden lg:table-cell">
                    <Users className="w-3.5 h-3.5 inline" />
                  </th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4 hidden xl:table-cell">
                    <Eye className="w-3.5 h-3.5 inline" />
                  </th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4 hidden xl:table-cell">Dias</th>
                  <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => {
                  const foto = fotoCapa(v);
                  // Sugestão IA decorativa nos índices 2 e 5
                  const hasSuggestion = (i === 2 || i === 5) && v.status === "publicado";
                  const isActive = v.status === "publicado" || v.status === "pausado";

                  return (
                    <>
                      <tr key={v.id} className="border-b border-border hover:bg-surface-secondary/50 transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => toggleSelect(v.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              selectedIds.has(v.id) ? "bg-garage border-garage" : "border-border"
                            }`}
                          >
                            {selectedIds.has(v.id) && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={foto} alt={v.modelo} className="w-16 h-11 object-cover rounded-md flex-shrink-0" />
                            <div>
                              <p className="text-small font-medium text-text-primary">{v.marca} {v.modelo} {v.versao ?? ""}</p>
                              <p className="text-micro text-text-muted">{v.ano} · {v.cambio}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-display font-bold text-text-primary">
                          {formatarPreco(v.preco)}
                        </td>
                        <td className="p-4 text-right text-small text-text-secondary hidden md:table-cell">
                          {formatarKm(v.quilometragem)}
                        </td>
                        <td className="p-4 text-center hidden lg:table-cell">
                          <span className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${STATUS_COLOR[v.status]}`}>
                            {STATUS_LABEL[v.status]}
                          </span>
                        </td>
                        <td className="p-4 text-right text-small text-text-secondary hidden lg:table-cell">{v.leads_count}</td>
                        <td className="p-4 text-right text-small text-text-secondary hidden xl:table-cell">{v.visualizacoes.toLocaleString("pt-BR")}</td>
                        <td className="p-4 text-right text-small text-text-secondary hidden xl:table-cell">{diasPublicado(v.publicado_em)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            {isActive && (
                              <button
                                onClick={() => handleTogglePause(v.id, v.status)}
                                title={v.status === "publicado" ? "Pausar" : "Ativar"}
                                className="rounded-lg border border-border p-1.5 text-text-muted hover:text-warning hover:border-warning transition-colors"
                              >
                                {v.status === "publicado" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {v.status === "publicado" && (
                              <button
                                onClick={() => handleMarkSold(v.id)}
                                title="Marcar como vendido"
                                className="rounded-lg border border-border p-1.5 text-text-muted hover:text-info hover:border-info transition-colors"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {v.status !== "expirado" && v.status !== "vendido" && (
                              <button
                                onClick={() => handleDelete(v.id)}
                                title="Remover anúncio"
                                className="rounded-lg border border-border p-1.5 text-text-muted hover:text-danger hover:border-danger transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {hasSuggestion && (
                        <tr key={`ai-${v.id}`} className="border-b border-border bg-warning/5">
                          <td colSpan={9} className="px-4 py-2">
                            <div className="flex items-center gap-2 text-micro">
                              <Sparkles className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                              <span className="text-warning font-medium">IA sugere reduzir R$ 5.000</span>
                              <span className="text-text-muted">— pode acelerar a venda em até 15 dias</span>
                              <button className="ml-auto rounded-full bg-warning text-white px-3 py-1 text-[11px] font-medium hover:brightness-90 transition-all">
                                Aplicar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
