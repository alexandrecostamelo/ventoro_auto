import { vehicles, formatPrice, formatKm } from "@/data/mock";
import { Link } from "react-router-dom";
import { Eye, Users, Heart, Plus, Pause, Play, Trash2, Sparkles, Search, Check } from "lucide-react";
import { useState } from "react";

const stockVehicles = vehicles.slice(0, 8);

export default function GarageInventory() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = stockVehicles.filter((v) =>
    search === "" || `${v.marca} ${v.modelo} ${v.versao}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 text-text-primary">Gestão de estoque</h1>
          <p className="text-small text-text-muted mt-1">{stockVehicles.length} veículos no estoque</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-border px-4 py-2 text-micro font-medium text-text-secondary hover:bg-surface-secondary transition-colors" disabled>
            Importar lote (em breve)
          </button>
          <Link to="/anunciar" className="inline-flex items-center gap-2 rounded-full bg-garage text-white px-5 py-2 text-small font-medium hover:brightness-90 transition-all">
            <Plus className="w-4 h-4" /> Adicionar veículo
          </Link>
        </div>
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no estoque..." className="flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <button className="rounded-full bg-warning text-white px-4 py-2 text-micro font-medium">
              Pausar ({selectedIds.size})
            </button>
            <button className="rounded-full bg-garage text-white px-4 py-2 text-micro font-medium">
              Destaque ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
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
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4 hidden lg:table-cell">Leads</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4 hidden xl:table-cell">Views</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4 hidden xl:table-cell">Dias</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const hasSuggestion = i === 2 || i === 5;
                return (
                  <>
                    <tr key={v.id} className="border-b border-border hover:bg-surface-secondary/50 transition-colors">
                      <td className="p-4">
                        <button onClick={() => toggleSelect(v.id)} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.has(v.id) ? "bg-garage border-garage" : "border-border"}`}>
                          {selectedIds.has(v.id) && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={v.fotos[0]} alt={v.modelo} className="w-16 h-11 object-cover rounded-md flex-shrink-0" />
                          <div>
                            <p className="text-small font-medium text-text-primary">{v.marca} {v.modelo} {v.versao}</p>
                            <p className="text-micro text-text-muted">{v.ano} · {v.cambio}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-display font-bold text-text-primary">{formatPrice(v.preco)}</td>
                      <td className="p-4 text-right text-small text-text-secondary hidden md:table-cell">{formatKm(v.quilometragem)}</td>
                      <td className="p-4 text-center hidden lg:table-cell">
                        <span className="rounded-full px-2.5 py-0.5 text-micro font-medium bg-trust-high/10 text-trust-high">Ativo</span>
                      </td>
                      <td className="p-4 text-right text-small text-text-secondary hidden lg:table-cell">{v.leads_count}</td>
                      <td className="p-4 text-right text-small text-text-secondary hidden xl:table-cell">{v.visualizacoes}</td>
                      <td className="p-4 text-right text-small text-text-secondary hidden xl:table-cell">{Math.floor(Math.random() * 60 + 5)}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg border border-border p-1.5 text-text-muted hover:text-warning hover:border-warning transition-colors">
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                          <button className="rounded-lg border border-border p-1.5 text-text-muted hover:text-danger hover:border-danger transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      </div>
    </div>
  );
}
