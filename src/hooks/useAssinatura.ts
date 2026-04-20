import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Assinatura {
  id: string
  garagem_id: string
  plano: string
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  trial_ate: string | null
  periodo_inicio: string | null
  periodo_fim: string | null
  proxima_cobranca: string | null
  cancelada_em: string | null
  valor_mensal: number
}

export function useAssinatura(garagemId: string | undefined) {
  const { user } = useAuth()
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    if (!garagemId) {
      setLoading(false)
      return
    }

    async function buscar() {
      setLoading(true)
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('garagem_id', garagemId)
        .maybeSingle()

      if (!error && data) {
        setAssinatura(data as Assinatura)
      }
      setLoading(false)
    }

    buscar()
  }, [garagemId])

  const planoAtivo = assinatura
    ? assinatura.status === 'ativa' || assinatura.status === 'trial'
    : false

  const inadimplente = assinatura?.status === 'inadimplente'

  const diasRestantes = (() => {
    if (!assinatura) return 0
    const fim = assinatura.periodo_fim ?? assinatura.trial_ate
    if (!fim) return 0
    const diff = new Date(fim).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })()

  const iniciarCheckout = useCallback(async (priceId: string, plano: string, mode: 'subscription' | 'payment' = 'subscription') => {
    if (!user || !garagemId) return

    setCheckoutLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await supabase.functions.invoke('criar-checkout-session', {
        body: { priceId, garagemId, plano, mode },
      })

      if (res.error) throw new Error(res.error.message)

      const { url } = res.data
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Erro ao iniciar checkout:', err)
      setCheckoutLoading(false)
    }
  }, [user, garagemId])

  const abrirPortal = useCallback(async () => {
    if (!garagemId) return

    setCheckoutLoading(true)
    try {
      const res = await supabase.functions.invoke('criar-portal-session', {
        body: { garagemId },
      })

      if (res.error) throw new Error(res.error.message)

      const { url } = res.data
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Erro ao abrir portal:', err)
      setCheckoutLoading(false)
    }
  }, [garagemId])

  return {
    assinatura,
    planoAtivo,
    inadimplente,
    diasRestantes,
    loading,
    checkoutLoading,
    iniciarCheckout,
    abrirPortal,
  }
}
