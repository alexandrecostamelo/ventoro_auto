import { Link, useLocation, Outlet } from "react-router-dom";
import { VentoroLogo } from "@/components/VentoroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { mockUser } from "@/data/mock";
import {
  LayoutDashboard, Megaphone, Users, BarChart3, Camera, Bell, Settings, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/minha-conta" },
  { label: "Meus anúncios", icon: Megaphone, path: "/minha-conta/anuncios" },
  { label: "Leads", icon: Users, path: "/minha-conta/leads" },
  { label: "Métricas", icon: BarChart3, path: "/minha-conta/metricas" },
  { label: "VenStudio IA", icon: Camera, path: "/studio" },
  { label: "Alertas", icon: Bell, path: "/alertas" },
  { label: "Configurações", icon: Settings, path: "/minha-conta/configuracoes" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/minha-conta"
      ? location.pathname === "/minha-conta"
      : location.pathname.startsWith(path);

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-border">
        <Link to="/"><VentoroLogo variant="light" size="sm" /></Link>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-small font-medium transition-colors ${
              isActive(item.path)
                ? "bg-brand text-primary-foreground"
                : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
            }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <img
            src={mockUser.avatar_url}
            alt={mockUser.nome}
            className="w-9 h-9 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-small font-medium text-text-primary truncate">{mockUser.nome}</p>
            <p className="text-micro text-text-muted truncate">{mockUser.email}</p>
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] bg-background border-r border-border fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-background border-r border-border flex flex-col transform transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-text-muted">
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[240px] min-h-screen flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-background border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-surface-secondary">
            <Menu className="w-5 h-5 text-text-primary" />
          </button>
          <VentoroLogo variant="light" size="sm" />
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
