import { Link, useLocation } from "react-router-dom";
import { VentoroLogo } from "@/components/VentoroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { garages } from "@/data/mock";
import {
  LayoutDashboard, Package, Users, Kanban, Store, UserCog, FileBarChart,
  CreditCard, Settings, LogOut, Menu, X, Sparkles,
} from "lucide-react";
import { useState } from "react";

const garage = garages[0];

const navSections = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/painel" },
      { label: "Estoque", icon: Package, path: "/painel/estoque" },
      { label: "Pipeline CRM", icon: Kanban, path: "/painel/leads" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Vitrine", icon: Store, path: "/painel/vitrine" },
      { label: "Equipe", icon: UserCog, path: "/painel/equipe" },
      { label: "Relatórios", icon: FileBarChart, path: "/painel/relatorios" },
      { label: "Planos", icon: CreditCard, path: "/painel/planos" },
    ],
  },
];

export default function GarageDashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/painel" ? location.pathname === "/painel" : location.pathname.startsWith(path);

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-border">
        <Link to="/"><VentoroLogo size="sm" /></Link>
      </div>

      {/* Plan indicator */}
      <div className="mx-3 mt-4 rounded-lg bg-garage-light p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-micro font-semibold text-garage uppercase">Plano {garage.plano}</span>
          <span className="text-micro text-text-muted">18/30</span>
        </div>
        <div className="h-1.5 bg-garage/20 rounded-full overflow-hidden">
          <div className="h-full bg-garage rounded-full" style={{ width: "60%" }} />
        </div>
        <p className="text-[10px] text-text-muted mt-1">veículos ativos</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 mb-2">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-small font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-garage text-white"
                      : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <img src={garage.logo_url} alt={garage.nome} className="w-9 h-9 rounded-lg" />
          <div className="flex-1 min-w-0">
            <p className="text-small font-medium text-text-primary truncate">{garage.nome}</p>
            <p className="text-micro text-text-muted truncate">{garage.cidade}, {garage.estado}</p>
          </div>
          <ThemeToggle />
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-micro text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-surface-secondary">
      <aside className="hidden lg:flex flex-col w-[250px] bg-background border-r border-border fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[270px] bg-background border-r border-border flex flex-col transform transition-transform duration-200 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-text-muted"><X className="w-5 h-5" /></button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-[250px] min-h-screen flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-background border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-surface-secondary">
            <Menu className="w-5 h-5 text-text-primary" />
          </button>
          <VentoroLogo variant="light" size="sm" />
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
