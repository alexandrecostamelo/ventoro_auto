import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { VentoroLogo } from '@/components/VentoroLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAdmin } from '@/hooks/useAdmin'
import {
  LayoutDashboard, Users, Building2, CreditCard, DollarSign,
  ScrollText, Settings, LogOut, Menu, X, ShieldCheck,
} from 'lucide-react'

const navSections = [
  {
    label: 'Visão Geral',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Usuários', icon: Users, path: '/admin/usuarios' },
      { label: 'Garagens', icon: Building2, path: '/admin/garagens' },
      { label: 'Assinaturas', icon: CreditCard, path: '/admin/assinaturas' },
      { label: 'Financeiro', icon: DollarSign, path: '/admin/financeiro' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Logs', icon: ScrollText, path: '/admin/logs' },
      { label: 'Configurações', icon: Settings, path: '/admin/configuracoes' },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, isAdmin, loading } = useAdmin()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate('/admin')
  }, [loading, user, isAdmin, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user || !isAdmin) return null

  const isActive = (path: string) =>
    path === '/admin/dashboard' ? location.pathname === '/admin/dashboard' : location.pathname.startsWith(path)

  async function handleSignOut() {
    const { supabase } = await import('@/lib/supabase')
    await supabase.auth.signOut()
    navigate('/admin')
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <VentoroLogo size="sm" />
        </Link>
      </div>

      {/* Admin badge */}
      <div className="mx-3 mt-4 rounded-lg bg-red-500/10 p-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide">Admin</p>
          <p className="text-[10px] text-text-muted truncate">{profile?.email}</p>
        </div>
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
                      ? 'bg-[var(--color-brand-primary)] text-white'
                      : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
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
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-small font-medium text-text-primary truncate">{profile?.nome || 'Admin'}</p>
            <p className="text-micro text-text-muted">Administrador</p>
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
  )

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
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
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
  )
}
