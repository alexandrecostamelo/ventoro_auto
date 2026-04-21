import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { VentoroLogo } from "@/components/VentoroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Megaphone, Users, BarChart3, Camera, Bell, Settings, LogOut, Menu, X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/minha-conta" },
  { label: "Meus anúncios", icon: Megaphone, path: "/minha-conta/anuncios" },
  { label: "Leads", icon: Users, path: "/minha-conta/leads" },
  { label: "Métricas", icon: BarChart3, path: "/minha-conta/metricas" },
  { label: "VenStudio IA", icon: Camera, path: "/studio", disabled: true },
  { label: "Alertas", icon: Bell, path: "/alertas" },
  { label: "Configurações", icon: Settings, path: "/minha-conta/configuracoes" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth guard — redireciona para /entrar se não estiver logado
  // Garagens devem usar /painel
  useEffect(() => {
    if (!loading && !user) navigate("/entrar");
    if (!loading && profile?.tipo === 'garagem') navigate("/painel");
  }, [loading, user, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null; // redirect já disparado, evita flash de conteúdo

  const isActive = (path: string) =>
    path === "/minha-conta"
      ? location.pathname === "/minha-conta"
      : location.pathname.startsWith(path);

  const displayName = profile?.nome ?? user.email ?? "Usuário";
  const displayEmail = user.email ?? "";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-border">
        <Link to="/"><VentoroLogo size="sm" /></Link>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) =>
          (item as { disabled?: boolean }).disabled ? (
            <span
              key={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-small font-medium text-text-muted cursor-not-allowed opacity-50"
              title="Em Breve"
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              <span className="ml-auto text-[10px] uppercase tracking-wider text-amber-500 font-semibold">Em Breve</span>
            </span>
          ) : (
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
          )
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
              <span className="text-small font-bold text-brand">{avatarLetter}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-small font-medium text-text-primary truncate">{displayName}</p>
            <p className="text-micro text-text-muted truncate">{displayEmail}</p>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 mt-3 w-full px-3 py-2 rounded-lg text-micro text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
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
          <VentoroLogo size="sm" />
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
