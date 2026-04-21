import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { VentoroLogo } from '@/components/VentoroLogo'
import { useAuth } from '@/contexts/AuthContext'
import { ShieldCheck, Eye, EyeOff, AlertTriangle } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aguardandoPerfil, setAguardandoPerfil] = useState(false)

  const { signIn, signOut, user, profile, loading } = useAuth()
  const navigate = useNavigate()

  // Quando profile carrega após login, verificar se é admin
  useEffect(() => {
    if (!aguardandoPerfil) return
    if (loading) return

    if (user && profile) {
      if (profile.tipo === 'admin') {
        navigate('/admin/dashboard')
      } else {
        signOut()
        setErro('Acesso restrito a administradores.')
        setCarregando(false)
        setAguardandoPerfil(false)
      }
    }
  }, [aguardandoPerfil, loading, user, profile, navigate, signOut])

  // Se já logado como admin, redirecionar direto
  useEffect(() => {
    if (!loading && user && profile?.tipo === 'admin') {
      navigate('/admin/dashboard')
    }
  }, [loading, user, profile, navigate])

  async function handleLogin() {
    if (!email || !senha) {
      setErro('Preencha email e senha.')
      return
    }
    setErro(null)
    setCarregando(true)

    const { error } = await signIn(email, senha)
    if (error) {
      setErro('Credenciais inválidas.')
      setCarregando(false)
      return
    }

    // Sinalizar que estamos aguardando o profile carregar via AuthContext
    setAguardandoPerfil(true)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin()
  }

  if (loading && !aguardandoPerfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo + Badge */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <VentoroLogo size="lg" />
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">
              Painel Administrativo
            </span>
          </div>
        </div>

        {/* Card de login */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
          <h1 className="text-lg font-semibold text-white mb-6">Acesso Administrativo</h1>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                placeholder="admin@ventoro.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {erro}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={carregando}
              className="w-full rounded-lg bg-red-600 hover:bg-red-700 px-5 py-3 text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {carregando ? 'Verificando...' : 'Entrar como Admin'}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-6">
          Acesso restrito. Apenas administradores autorizados.
        </p>
      </div>
    </div>
  )
}
