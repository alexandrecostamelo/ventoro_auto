import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database.types'

type LeadRow = Database['public']['Tables']['leads']['Row']

export type LeadAnunciante = LeadRow & {
  veiculos: { marca: string; modelo: string } | null
}

export function useLeadsAnunciante() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<LeadAnunciante[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('leads')
      .select('*, veiculos(marca, modelo)')
      .eq('anunciante_id', user.id)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setLeads((data ?? []) as LeadAnunciante[])
  }, [user])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function atualizarStatus(id: string, status: LeadRow['status']) {
    const { error: err } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
    if (!err) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    }
    return { error: err }
  }

  return { leads, atualizarStatus, loading, error }
}
