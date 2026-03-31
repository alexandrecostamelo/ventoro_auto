import { useState } from "react";
import { vehicles, Vehicle, formatPrice, formatKm } from "@/data/mock";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { X, Plus, Search, Check, Sparkles, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function ComparePage() {
  const [selected, setSelected] = useState<(Vehicle | null)[]>([null, null, null]);
  const [searchOpen, setSearchOpen] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const addVehicle = (slotIndex: number, vehicle: Vehicle) => {
    const next = [...selected];
    next[slotIndex] = vehicle;
    setSelected(next);
    setSearchOpen(null);
    setSearchQuery("");
  };

  const removeVehicle = (slotIndex: number) => {
    const next = [...selected];
    next[slotIndex] = null;
    setSelected(next);
  };

  const filledCount = selected.filter(Boolean).length;
  const filled = selected.filter(Boolean) as Vehicle[];
  const usedIds = new Set(filled.map((v) => v.id));
  const searchResults = vehicles
    .filter((v) => !usedIds.has(v.id))
    .filter((v) =>
      searchQuery === "" ||
      `${v.marca} ${v.modelo} ${v.versao} ${v.ano}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Comparison sections
  type Row = { label: string; key: string; format?: (v: any) => string; winner?: "lower" | "higher" };
  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Visão geral",
      rows: [
        { label: "Preço", key: "preco", format: formatPrice, winner: "lower" },
        { label: "Score de confiança", key: "score_confianca", winner: "higher" },
        { label: "Status do preço", key: "preco_status", format: (v: string) => v === "abaixo" ? "▼ Abaixo" : v === "na_media" ? "= Na média" : "▲ Acima" },
        { label: "Localização", key: "_location", format: () => "" },
      ],
    },
    {
      title: "Dados principais",
      rows: [
        { label: "Ano", key: "ano", winner: "higher" },
        { label: "Quilometragem", key: "quilometragem", format: formatKm, winner: "lower" },
        { label: "Câmbio", key: "cambio" },
        { label: "Combustível", key: "combustivel" },
        { label: "Cor", key: "cor" },
      ],
    },
    {
      title: "Motor",
      rows: [
        { label: "Potência", key: "potencia" },
        { label: "Torque", key: "torque" },
      ],
    },
    {
      title: "Eficiência",
      rows: [
        { label: "Consumo cidade", key: "consumo_cidade" },
        { label: "Consumo estrada", key: "consumo_estrada" },
      ],
    },
    {
      title: "Custo estimado",
      rows: [
        { label: "Financiamento (48x)", key: "_financing", format: () => "" },
        { label: "Seguro mensal", key: "_insurance", format: () => "" },
        { label: "Custo total mensal", key: "_total", format: () => "", winner: "lower" },
      ],
    },
  ];

  function getCellValue(vehicle: Vehicle, key: string): any {
    if (key === "_location") return `${vehicle.cidade}, ${vehicle.estado}`;
    if (key === "_financing") return formatPrice(Math.round(vehicle.preco * 0.7 / 48));
    if (key === "_insurance") return formatPrice(Math.round(vehicle.preco * 0.04 / 12));
    if (key === "_total") return Math.round(vehicle.preco * 0.7 / 48) + Math.round(vehicle.preco * 0.04 / 12) + 380;
    return (vehicle as any)[key];
  }

  function getWinnerVal(row: Row): number | null {
    if (!row.winner || filledCount < 2) return null;
    const vals = filled.map((v) => {
      const raw = getCellValue(v, row.key);
      return typeof raw === "number" ? raw : null;
    }).filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return row.winner === "lower" ? Math.min(...vals) : Math.max(...vals);
  }

  // AI recommendation
  const bestValue = filled.length >= 2
    ? filled.reduce((best, v) => {
        const score = v.score_confianca - (v.preco / 10000) - (v.quilometragem / 10000);
        const bestScore = best.score_confianca - (best.preco / 10000) - (best.quilometragem / 10000);
        return score > bestScore ? v : best;
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-small text-text-muted mb-6">
          <Link to="/" className="hover:text-brand transition-colors">Home</Link>
          <span>/</span>
          <span className="text-text-primary">Comparar veículos</span>
        </div>

        <h1 className="text-h1 text-text-primary mb-2">Comparar veículos</h1>
        <p className="text-body text-text-secondary mb-10">Selecione até 3 veículos para comparar lado a lado.</p>

        {/* Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {selected.map((vehicle, i) => (
            <div key={i} className="relative">
              {vehicle ? (
                <div className="rounded-xl border-2 border-brand bg-surface-card p-4 text-center">
                  <button
                    onClick={() => removeVehicle(i)}
                    className="absolute top-2 right-2 rounded-full bg-surface-secondary p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <img src={vehicle.fotos[0]} alt={vehicle.modelo} className="w-full h-32 object-cover rounded-lg mb-3" />
                  <p className="text-h4 text-text-primary truncate">{vehicle.marca} {vehicle.modelo}</p>
                  <p className="text-micro text-text-muted">{vehicle.versao} · {vehicle.ano}</p>
                  <p className="font-display text-lg font-bold text-brand mt-1">{formatPrice(vehicle.preco)}</p>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(i)}
                  className="w-full rounded-xl border-2 border-dashed border-border bg-surface-secondary hover:border-brand/50 hover:bg-brand-light/30 transition-colors p-8 flex flex-col items-center justify-center min-h-[220px]"
                >
                  <div className="rounded-full bg-surface-tertiary p-3 mb-3">
                    <Plus className="w-5 h-5 text-text-muted" />
                  </div>
                  <p className="text-small font-medium text-text-secondary">Adicionar veículo</p>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Search modal */}
        {searchOpen !== null && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { setSearchOpen(null); setSearchQuery(""); }} />
            <div className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[480px] z-50 bg-background rounded-2xl border border-border shadow-elevated max-h-[70vh] flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-2.5">
                  <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar marca, modelo..."
                    className="flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {searchResults.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => addVehicle(searchOpen, v)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-secondary transition-colors text-left"
                  >
                    <img src={v.fotos[0]} alt={v.modelo} className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-medium text-text-primary truncate">{v.marca} {v.modelo} {v.versao}</p>
                      <p className="text-micro text-text-muted">{v.ano} · {formatKm(v.quilometragem)} · {formatPrice(v.preco)}</p>
                    </div>
                    <span className="font-mono text-micro text-brand">{v.score_confianca}</span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <p className="text-center text-small text-text-muted py-8">Nenhum veículo encontrado.</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Comparison table */}
        {filledCount >= 2 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="rounded-xl border border-border bg-background overflow-hidden mb-10">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-4 w-[160px]" />
                      {filled.map((v, i) => (
                        <th key={v.id} className={`p-4 text-center ${i === 0 ? "bg-brand-light/40" : ""}`}>
                          <img src={v.fotos[0]} alt={v.modelo} className="w-20 h-14 object-cover rounded-lg mx-auto mb-2" />
                          <p className={`text-small font-semibold ${i === 0 ? "text-brand" : "text-text-primary"}`}>
                            {v.marca} {v.modelo}
                          </p>
                          <p className="text-micro text-text-muted">{v.versao} · {v.ano}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <>
                        <tr key={`section-${section.title}`}>
                          <td colSpan={filled.length + 1} className="bg-surface-secondary px-4 py-2.5">
                            <span className="text-micro font-semibold text-text-primary uppercase tracking-wider">{section.title}</span>
                          </td>
                        </tr>
                        {section.rows.map((row, ri) => {
                          const winVal = getWinnerVal(row);
                          return (
                            <tr key={row.key} className={`border-b border-border ${ri % 2 === 1 ? "bg-surface-secondary/30" : ""}`}>
                              <td className="p-4 text-small text-text-secondary">{row.label}</td>
                              {filled.map((v, i) => {
                                const raw = getCellValue(v, row.key);
                                const display = row.format ? row.format(raw) : String(raw ?? "—");
                                const numVal = typeof raw === "number" ? raw : null;
                                const isWinner = winVal !== null && numVal !== null && numVal === winVal;
                                return (
                                  <td key={v.id} className={`p-4 text-center text-body ${i === 0 ? "bg-brand-light/20" : ""} ${isWinner ? "text-brand font-semibold" : "text-text-primary"}`}>
                                    {isWinner && <Check className="w-3.5 h-3.5 inline mr-1 text-brand" />}
                                    {display}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </>
                    ))}

                    {/* Opcionais */}
                    <tr>
                      <td colSpan={filled.length + 1} className="bg-surface-secondary px-4 py-2.5">
                        <span className="text-micro font-semibold text-text-primary uppercase tracking-wider">Opcionais</span>
                      </td>
                    </tr>
                    {(() => {
                      const allOpts = [...new Set(filled.flatMap((v) => v.opcionais))].sort();
                      return allOpts.map((opt, oi) => (
                        <tr key={opt} className={`border-b border-border ${oi % 2 === 1 ? "bg-surface-secondary/30" : ""}`}>
                          <td className="p-4 text-small text-text-secondary">{opt}</td>
                          {filled.map((v, i) => {
                            const has = v.opcionais.includes(opt);
                            return (
                              <td key={v.id} className={`p-4 text-center ${i === 0 ? "bg-brand-light/20" : ""}`}>
                                {has ? (
                                  <Check className="w-4 h-4 text-brand mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-text-muted/40 mx-auto" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Recommendation */}
            {bestValue && (
              <motion.div
                className="rounded-xl border border-brand/30 bg-brand-light/50 p-6 md:p-8"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="rounded-lg bg-brand/10 p-2">
                    <Sparkles className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-h3 text-text-primary">Recomendação Ventoro IA</h3>
                    <p className="text-micro text-text-muted mt-0.5">Análise baseada em preço, quilometragem e score de confiança</p>
                  </div>
                </div>
                <p className="text-body-lg text-text-secondary leading-relaxed">
                  Considerando o equilíbrio entre preço, quilometragem e confiabilidade, o{" "}
                  <strong className="text-brand">{bestValue.marca} {bestValue.modelo} {bestValue.versao} {bestValue.ano}</strong>{" "}
                  apresenta o melhor custo-benefício entre os veículos comparados. Com score de confiança de{" "}
                  <strong className="text-brand">{bestValue.score_confianca}/100</strong> e preço{" "}
                  {bestValue.preco_status === "abaixo" ? "abaixo da média do mercado" : "dentro da faixa de mercado"},{" "}
                  é a opção mais equilibrada para quem busca segurança na compra.
                  {filled.length === 3 && (
                    <> Para perfis que priorizam menor quilometragem, o{" "}
                    {filled.reduce((a, b) => a.quilometragem < b.quilometragem ? a : b).marca}{" "}
                    {filled.reduce((a, b) => a.quilometragem < b.quilometragem ? a : b).modelo} pode ser mais adequado.</>
                  )}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {filledCount < 2 && (
          <div className="text-center py-16">
            <p className="text-body text-text-muted">Selecione ao menos 2 veículos para iniciar a comparação.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
