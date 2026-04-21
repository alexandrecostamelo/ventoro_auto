import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook para verificar se o usuário é admin.
 * Usa profiles.tipo = 'admin' do Supabase.
 */
export function useAdmin() {
  const { user, profile, loading } = useAuth()

  const isAdmin = !!profile && profile.tipo === 'admin'

  return {
    user,
    profile,
    isAdmin,
    loading,
  }
}
