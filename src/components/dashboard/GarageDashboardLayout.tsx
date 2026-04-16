import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { VentoroLogo } from "@/components/VentoroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useMinhaGaragem } from "@/hooks/useMinhaGaragem";
import {
  LayoutDashboard, Package, Kanban, Store, UserCog, FileBarChart,
  CreditCard, LogOut, Menu, X, Building2,
} from "lucide-react";

const PLANO_LIMITE: Record<string, number | null> = {
  starter: 15,
  pro: 30,
  premium: null,
};

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
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { garagem, assinatura, loading: gLoading } = useMinhaGaragem();
  const [mobileOpen, setMobileOpen] = useState(false);

  const loading = authLoading || gLoading;

  // Auth guard — redireciona para /entrar se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) navigate("/entrar");
  }, [authLoading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="w-8 h-8 rounded-full border-2 border-garage border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null; // redirect já disparado

  // Garagem guard — perfil não vinculado a nenhuma garagem
  if (!profile?.garagem_id || !garagem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-garage-light flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-garage" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-2">
            Área exclusiva para garagens
          </h2>
          <p className="text-body text-text-secondary mb-6">
            Seu perfil não está vinculado a nenhuma garagem. Entre em contato com o suporte para configurar seu acesso.
          </p>
          <Link
            to="/"
            className="inline-flex rounded-full bg-garage text-white px-6 py-3 text-small font-medium hover:brightness-90 transition-all"
          >
            Voltar para início
          </Link>
        </div>
      </div>
    );
  }

  const planoAtual = assinatura?.plano ?? garagem.plano;
  const limite = PLANO_LIMITE[planoAtual] ?? null;
  const uso = garagem.total_estoque;
  const pct = limite ? Math.min((uso / limite) * 100, 100) : 0;

  const isActive = (path: string) =>
    path === "/painel" ? location.pathname === "/painel" : location.pathname.startsWith(path);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-border">
        <Link to="/"><VentoroLogo size="sm" /></Link>
      </div>

      {/* Plan indicator */}
      <div className="mx-3 mt-4 rounded-lg bg-garage-light p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-micro font-semibold text-garage uppercase tracking-wide">
            Plano {planoAtual}
          </span>
          <span className="text-micro text-text-muted">
            {uso}/{limite ?? "∞"}
          </span>
        </div>
        <div className="h-1.5 bg-garage/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-garage rounded-full transition-all"
            style={{ width: limite ? `${pct}%` : "0%" }}
          />
        </div>
        <p className="text-[10px] text-text-muted mt-1">veículos ativos</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 mb-2">
              {section.label}
            </p>
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
          {garagem.logo_url ? (
            <img
              src={garagem.logo_url}
              alt={garagem.nome}
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-garage-light flex items-center justify-center flex-shrink-0">
              <span className="text-small font-bold text-garage">{garagem.nome.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-small font-medium text-text-primary truncate">{garagem.nome}</p>
            <p className="text-micro text-text-muted truncate">{garagem.cidade}, {garagem.estado}</p>
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
      <aside className="hidden lg:flex flex-col w-[250px] bg-background border-r border-border fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[270px] bg-background border-r border-border flex flex-col transform transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-text-muted">
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[250px] min-h-screen flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-background border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-surface-secondary">
            <Menu className="w-5 h-5 text-text-primary" />
          </button>
          <VentoroLogo size="sm" />
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
