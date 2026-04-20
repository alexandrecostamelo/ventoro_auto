import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Notificacao {
  id: string
  created_at: string
  user_id: string
  tipo: 'queda_preco' | 'novo_match' | 'alta_procura' | 'vendido'
  titulo: string
  mensagem: string
  veiculo_id: string | null
  busca_salva_id: string | null
  dados: Record<string, unknown>
  lida: boolean
}

export function useNotificacoes() {
  const { user } = useAuth()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [loading, setLoading] = useState(true)

  // Buscar notificações do usuário
  const buscar = useCallback(async () => {
    if (!user) {
      setNotificacoes([])
      setNaoLidas(0)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setNotificacoes(data as Notificacao[])
      setNaoLidas(data.filter((n) => !n.lida).length)
    }
    setLoading(false)
  }, [user])

  // Busca inicial
  useEffect(() => {
    buscar()
  }, [buscar])

  // Realtime subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notificacoes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const nova = payload.new as Notificacao
          setNotificacoes((prev) => [nova, ...prev])
          setNaoLidas((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const marcarComoLida = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id)

    if (!error) {
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      )
      setNaoLidas((prev) => Math.max(0, prev - 1))
    }
  }, [])

  const marcarTodasComoLidas = useCallback(async () => {
    if (!user) return

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false)

    if (!error) {
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
      setNaoLidas(0)
    }
  }, [user])

  const excluir = useCallback(async (id: string) => {
    const notif = notificacoes.find((n) => n.id === id)

    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('id', id)

    if (!error) {
      setNotificacoes((prev) => prev.filter((n) => n.id !== id))
      if (notif && !notif.lida) {
        setNaoLidas((prev) => Math.max(0, prev - 1))
      }
    }
  }, [notificacoes])

  return {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    excluir,
    recarregar: buscar,
  }
}
