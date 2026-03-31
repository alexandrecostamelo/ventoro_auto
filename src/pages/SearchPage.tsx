import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VehicleCard } from "@/components/VehicleCard";
import { vehicles } from "@/data/mock";
import { SlidersHorizontal, Grid3X3, List, X, Bell } from "lucide-react";
import { motion } from "framer-motion";

const sortOptions = ["Mais relevantes", "Menor preço", "Maior preço", "Mais novo", "Menor km"];
const categoryFilters = ["Todos", "Até R$ 50k", "SUV", "Sedan", "Elétrico", "Pickup", "Hatch", "Esportivo"];

export default function SearchPage() {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [activeChip, setActiveChip] = useState("Todos");
  const [sort, setSort] = useState("Mais relevantes");
  const [showFilters, setShowFilters] = useState(false);

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
            <span className="text-brand">{vehicles.length}</span> veículos encontrados
          </h1>
          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-md border border-border bg-surface-card px-3 py-2 text-small text-text-primary outline-none focus:border-brand"
            >
              {sortOptions.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
            <div className="hidden md:flex rounded-md border border-border overflow-hidden">
              <button onClick={() => setLayout("grid")} className={`p-2 ${layout === "grid" ? "bg-brand text-primary-foreground" : "bg-surface-card text-text-secondary"}`}>
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button onClick={() => setLayout("list")} className={`p-2 ${layout === "list" ? "bg-brand text-primary-foreground" : "bg-surface-card text-text-secondary"}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="md:hidden flex items-center gap-2 rounded-md border border-border bg-surface-card px-3 py-2 text-small">
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
              onClick={() => setActiveChip(chip)}
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
            <FiltersSidebar />
            {/* Alert banner */}
            <div className="mt-6 rounded-lg bg-brand-light p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-brand" />
                <span className="text-small font-medium text-brand-dark">Quer ser notificado?</span>
              </div>
              <p className="text-micro text-text-secondary mb-3">Receba alertas de novos anúncios que combinam com sua busca.</p>
              <button className="w-full rounded-full bg-brand px-4 py-2 text-small font-medium text-primary-foreground transition-all hover:brightness-90">
                Criar alerta
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className={layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
              {vehicles.map((vehicle, i) => (
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

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-10 mb-8">
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  key={page}
                  className={`h-9 w-9 rounded-md text-small font-medium transition-colors ${
                    page === 1 ? "bg-brand text-primary-foreground" : "bg-surface-card border border-border text-text-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button className="rounded-md border border-border bg-surface-card px-4 py-2 text-small text-text-secondary hover:bg-surface-secondary">
                Próxima →
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function FiltersSidebar() {
  const marcas = ["Toyota", "Honda", "Volkswagen", "Ford", "Chevrolet", "Hyundai", "Jeep", "BMW", "Audi", "Fiat"];
  const combustiveis = ["Flex", "Gasolina", "Diesel", "Elétrico", "Híbrido"];
  const cambios = ["Todos", "Manual", "Automático", "CVT"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-text-primary">Filtrar</h3>
        <button className="text-small text-brand hover:text-brand-dark">Limpar tudo</button>
      </div>

      {/* Price range */}
      <FilterSection title="Faixa de preço">
        <div className="flex gap-2">
          <input placeholder="R$ Mín" className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand" />
          <input placeholder="R$ Máx" className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand" />
        </div>
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Marca">
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {marcas.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-border text-brand focus:ring-brand" />
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
              <input type="checkbox" className="rounded border-border text-brand focus:ring-brand" />
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
              <input type="radio" name="cambio" className="border-border text-brand focus:ring-brand" />
              <span className="text-small text-text-secondary">{c}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Year */}
      <FilterSection title="Ano">
        <div className="flex gap-2">
          <input placeholder="De" className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand" />
          <input placeholder="Até" className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand" />
        </div>
      </FilterSection>

      {/* KM */}
      <FilterSection title="Quilometragem">
        <input placeholder="Até (km)" className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-small outline-none focus:border-brand" />
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
