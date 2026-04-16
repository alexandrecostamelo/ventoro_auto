import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database.types'

type GaragemRow = Database['public']['Tables']['garagens']['Row']
type AssinaturaRow = Database['public']['Tables']['assinaturas']['Row']

interface UseMinhaGaragemResult {
  garagem: GaragemRow | null
  assinatura: AssinaturaRow | null
  loading: boolean
  error: string | null
  recarregar: () => void
}

export function useMinhaGaragem(): UseMinhaGaragemResult {
  const { user, profile, loading: authLoading } = useAuth()
  const [garagem, setGaragem] = useState<GaragemRow | null>(null)
  const [assinatura, setAssinatura] = useState<AssinaturaRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const garagemId = profile?.garagem_id
    if (!user || !garagemId) {
      setGaragem(null)
      setAssinatura(null)
      return
    }

    setLoading(true)
    setError(null)

    const [{ data: gData, error: gErr }, { data: aData }] = await Promise.all([
      supabase.from('garagens').select('*').eq('id', garagemId).single(),
      supabase.from('assinaturas').select('*').eq('garagem_id', garagemId).maybeSingle(),
    ])

    setLoading(false)

    if (gErr) {
      setError(gErr.message)
      return
    }

    setGaragem(gData)
    setAssinatura(aData ?? null)
  }, [user, profile?.garagem_id])

  useEffect(() => {
    if (!authLoading) carregar()
  }, [authLoading, carregar])

  return { garagem, assinatura, loading, error, recarregar: carregar }
}
