import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VehicleCard } from "@/components/VehicleCard";
import { vehicles as mockVehicles } from "@/data/mock";
import { useVeiculos } from "@/hooks/useVeiculos";
import { veiculoDbParaMock, type VeiculoComFotos } from "@/utils/adapters";
import { USE_REAL_DATA } from "@/config/flags";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal, Grid3X3, List, Bell, Search, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const POR_PAGINA = 12;

const sortOptions = ["Mais relevantes", "Menor preço", "Maior preço", "Mais novo", "Menor km"];
const categoryFilters = ["Todos", "Até R$ 50k", "SUV", "Sedan", "Elétrico", "Pickup", "Hatch", "Esportivo"];

const ordenarMap: Record<string, "preco_asc" | "preco_desc" | "ano_desc" | "km_asc" | "recentes" | undefined> = {
  "Mais relevantes": undefined,
  "Menor preço": "preco_asc",
  "Maior preço": "preco_desc",
  "Mais novo": "ano_desc",
  "Menor km": "km_asc",
};

interface FiltrosState {
  preco_min?: number;
  preco_max?: number;
  marca?: string;
  combustivel?: string;
  cambio?: string;
  ano_min?: number;
  ano_max?: number;
  km_max?: number;
}

export default function SearchPage() {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [activeChip, setActiveChip] = useState("Todos");
  const [sort, setSort] = useState("Mais relevantes");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [filtros, setFiltros] = useState<FiltrosState>({});

  // Hook sempre chamado (regras do React) — dados usados só quando USE_REAL_DATA=true
  const { veiculos: veiculosDB, total, loading: loadingReal, error: errorReal } = useVeiculos(
    USE_REAL_DATA
      ? { ...filtros, ordenar: ordenarMap[sort], pagina: paginaAtual, por_pagina: POR_PAGINA }
      : {}
  );

  const vehiclesList = USE_REAL_DATA
    ? (veiculosDB as VeiculoComFotos[]).map(veiculoDbParaMock)
    : mockVehicles;

  const totalVehicles = USE_REAL_DATA ? total : mockVehicles.length;
  const isLoading = USE_REAL_DATA && loadingReal;
  const hasError = USE_REAL_DATA && !!errorReal;
  const totalPages = Math.ceil(totalVehicles / POR_PAGINA);

  function handleFiltros(novosFiltros: FiltrosState) {
    setFiltros(novosFiltros);
    setPaginaAtual(1);
  }

  function handleChip(chip: string) {
    setActiveChip(chip);
    setPaginaAtual(1);
    if (chip === "Até R$ 50k") {
      setFiltros((f) => ({ ...f, preco_max: 50000, preco_min: undefined }));
    } else if (chip === "Elétrico") {
      setFiltros((f) => ({ ...f, combustivel: "eletrico" }));
    } else if (chip === "Todos") {
      setFiltros({});
    }
    // Outros chips (SUV, Sedan, etc.) precisam de coluna carroceria no banco — decorativos por ora
  }

  function handleSort(valor: string) {
    setSort(valor);
    setPaginaAtual(1);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-4 lg:px-8">
        {/* Breadcrumb */}
        <div className="text-small text-text-muted mb-4">
          <span className="hover:text-brand cursor-pointer">Home</span>
          <span className="mx-2">›</span>
          <span className="text-text-primary">Buscar</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-h2 text-text-primary">
            {isLoading ? (
              <Skeleton className="inline-block h-8 w-48" />
            ) : (
              <>
                <span className="text-brand">{totalVehicles}</span> veículos encontrados
              </>
            )}
          </h1>
          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => handleSort(e.target.value)}
              className="rounded-md border border-border bg-surface-card px-3 py-2 text-small text-text-primary outline-none focus:border-brand"
            >
              {sortOptions.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
            <div className="hidden md:flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setLayout("grid")}
                className={`p-2 ${layout === "grid" ? "bg-brand text-primary-foreground" : "bg-surface-card text-text-secondary"}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLayout("list")}
                className={`p-2 ${layout === "list" ? "bg-brand text-primary-foreground" : "bg-surface-card text-text-secondary"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {}}
              className="md:hidden flex items-center gap-2 rounded-md border border-border bg-surface-card px-3 py-2 text-small"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtrar
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categoryFilters.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-small font-medium transition-all ${
                activeChip === chip
                  ? "bg-brand text-primary-foreground"
                  : "bg-surface-card border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters - desktop */}
          <aside className="hidden md:block w-[280px] flex-shrink-0">
            <FiltersSidebar
              filtros={filtros}
              onChange={handleFiltros}
              onLimpar={() => { setFiltros({}); setPaginaAtual(1); setActiveChip("Todos"); }}
            />
            <div className="mt-6 rounded-lg bg-brand-light p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-brand" />
                <span className="text-small font-medium text-brand-dark">Quer ser notificado?</span>
              </div>
              <p className="text-micro text-text-secondary mb-3">
                Receba alertas de novos anúncios que combinam com sua busca.
              </p>
              <button className="w-full rounded-full bg-brand px-4 py-2 text-small font-medium text-primary-foreground transition-all hover:brightness-90">
                Criar alerta
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {isLoading ? (
              <SkeletonGrid layout={layout} />
            ) : hasError ? (
              <ErrorState message={errorReal!} />
            ) : vehiclesList.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                className={
                  layout === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    : "flex flex-col gap-3"
                }
              >
                {vehiclesList.map((vehicle, i) => (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                  >
                    <VehicleCard vehicle={vehicle} layout={layout} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination — só mostra quando há mais de uma página */}
            {!isLoading && !hasError && totalPages > 1 && (
              <Pagination
                pagina={paginaAtual}
                total={totalPages}
                onChange={(p) => { setPaginaAtual(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              />
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonGrid({ layout }: { layout: "grid" | "list" }) {
  return (
    <div
      className={
        layout === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          : "flex flex-col gap-3"
      }
    >
      {Array.from({ length: POR_PAGINA }).map((_, i) => (
        <VehicleCardSkeleton key={i} layout={layout} />
      ))}
    </div>
  );
}

function VehicleCardSkeleton({ layout }: { layout: "grid" | "list" }) {
  if (layout === "list") {
    return (
      <div className="flex gap-4 rounded-lg border border-border bg-surface-card p-3">
        <Skeleton className="w-[200px] h-[150px] flex-shrink-0 rounded-md" />
        <div className="flex-1 space-y-2 py-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-6 w-1/3 mt-4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="px-4 pt-3.5 pb-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-1/3 mt-2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}

// ─── Empty / Error ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Search className="h-12 w-12 text-text-muted mb-4" />
      <h3 className="font-display text-xl font-semibold text-text-primary mb-2">
        Nenhum veículo encontrado
      </h3>
      <p className="text-body text-text-secondary">
        Tente ajustar os filtros para ver mais resultados.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
      <h3 className="font-display text-xl font-semibold text-text-primary mb-2">
        Erro ao carregar veículos
      </h3>
      <p className="text-small text-text-secondary max-w-sm">{message}</p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  pagina,
  total,
  onChange,
}: {
  pagina: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: Math.min(total, 5) }, (_, i) => {
    // Janela de 5 páginas centrada na página atual
    const start = Math.max(1, Math.min(pagina - 2, total - 4));
    return start + i;
  });

  return (
    <div className="flex justify-center gap-2 mt-10 mb-8">
      <button
        disabled={pagina === 1}
        onClick={() => onChange(pagina - 1)}
        className="rounded-md border border-border bg-surface-card px-4 py-2 text-small text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ← Anterior
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`h-9 w-9 rounded-md text-small font-medium transition-colors ${
            p === pagina
              ? "bg-brand text-primary-foreground"
              : "bg-surface-card border border-border text-text-secondary hover:bg-surface-secondary"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        disabled={pagina === total}
        onClick={() => onChange(pagina + 1)}
        className="rounded-md border border-border bg-surface-card px-4 py-2 text-small text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Próxima →
      </button>
    </div>
  );
}

// ─── Filters Sidebar ──────────────────────────────────────────────────────────

interface FiltersSidebarProps {
  filtros: FiltrosState;
  onChange: (filtros: FiltrosState) => void;
  onLimpar: () => void;
}

function FiltersSidebar({ filtros, onChange, onLimpar }: FiltersSidebarProps) {
  const marcas = ["Toyota", "Honda", "Volkswagen", "Ford", "Chevrolet", "Hyundai", "Jeep", "BMW", "Audi", "Fiat"];
  const combustiveis = ["Flex", "Gasolina", "Diesel", "Elétrico", "Híbrido"];
  const combustivelMap: Record<string, string> = {
    Flex: "flex",
    Gasolina: "gasolina",
    Diesel: "diesel",
    Elétrico: "eletrico",
    Híbrido: "hibrido",
  };
  const cambios = ["Manual", "Automático", "CVT"];
  const cambioMap: Record<string, string> = {
    Manual: "manual",
    Automático: "automatico",
    CVT: "cvt",
  };

  function handlePrecoMin(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value.replace(/\D/g, ""), 10);
    onChange({ ...filtros, preco_min: isNaN(val) ? undefined : val });
  }

  function handlePrecoMax(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value.replace(/\D/g, ""), 10);
    onChange({ ...filtros, preco_max: isNaN(val) ? undefined : val });
  }

  function handleAnoMin(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    onChange({ ...filtros, ano_min: isNaN(val) ? undefined : val });
  }

  function handleAnoMax(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    onChange({ ...filtros, ano_max: isNaN(val) ? undefined : val });
  }

  function handleKmMax(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value.replace(/\D/g, ""), 10);
    onChange({ ...filtros, km_max: isNaN(val) ? undefined : val });
  }

  function toggleMarca(marca: string) {
    onChange({ ...filtros, marca: filtros.marca === marca ? undefined : marca });
  }

  function toggleCombustivel(label: string) {
    const val = combustivelMap[label];
    onChange({ ...filtros, combustivel: filtros.combustivel === val ? undefined : val });
  }

  function handleCambio(label: string) {
    const val = cambioMap[label];
    onChange({ ...filtros, cambio: filtros.cambio === val ? undefined : val });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-text-primary">Filtrar</h3>
        <button onClick={onLimpar} className="text-small text-brand hover:text-brand-dark">
          Limpar tudo
        </button>
      </div>

      {/* Price range */}
      <FilterSection title="Faixa de preço">
        <div className="flex gap-2">
          <input
            placeholder="R$ Mín"
            defaultValue={filtros.preco_min ?? ""}
            onBlur={handlePrecoMin}
            className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand"
          />
          <input
            placeholder="R$ Máx"
            defaultValue={filtros.preco_max ?? ""}
            onBlur={handlePrecoMax}
            className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand"
          />
        </div>
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Marca">
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {marcas.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.marca === m}
                onChange={() => toggleMarca(m)}
                className="rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-small text-text-secondary">{m}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Fuel */}
      <FilterSection title="Combustível">
        <div className="space-y-2">
          {combustiveis.map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.combustivel === combustivelMap[c]}
                onChange={() => toggleCombustivel(c)}
                className="rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-small text-text-secondary">{c}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Transmission */}
      <FilterSection title="Câmbio">
        <div className="space-y-2">
          {cambios.map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cambio"
                checked={filtros.cambio === cambioMap[c]}
                onChange={() => handleCambio(c)}
                className="border-border text-brand focus:ring-brand"
              />
              <span className="text-small text-text-secondary">{c}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Year */}
      <FilterSection title="Ano">
        <div className="flex gap-2">
          <input
            placeholder="De"
            defaultValue={filtros.ano_min ?? ""}
            onBlur={handleAnoMin}
            className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand"
          />
          <input
            placeholder="Até"
            defaultValue={filtros.ano_max ?? ""}
            onBlur={handleAnoMax}
            className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand"
          />
        </div>
      </FilterSection>

      {/* KM */}
      <FilterSection title="Quilometragem">
        <input
          placeholder="Até (km)"
          defaultValue={filtros.km_max ?? ""}
          onBlur={handleKmMax}
          className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand"
        />
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border pb-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-1">
        <span className="text-small font-medium text-text-primary">{title}</span>
        <span className="text-text-muted text-micro">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
