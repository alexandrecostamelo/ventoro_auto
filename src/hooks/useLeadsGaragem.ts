import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type LeadRow = Database['public']['Tables']['leads']['Row']

export type LeadGaragem = LeadRow & {
  veiculos: { marca: string; modelo: string } | null
}

export function useLeadsGaragem(garagemId: string | null) {
  const [leads, setLeads] = useState<LeadGaragem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!garagemId) {
      setLeads([])
      return
    }

    setLoading(true)
    setError(null)

    // Busca veículos da garagem para filtrar leads via veiculo_id
    const { data: veiculos, error: vErr } = await supabase
      .from('veiculos')
      .select('id')
      .eq('garagem_id', garagemId)
      .eq('tipo_anunciante', 'garagem')

    if (vErr) {
      setError(vErr.message)
      setLoading(false)
      return
    }

    const veiculoIds = (veiculos ?? []).map((v) => v.id)

    if (veiculoIds.length === 0) {
      setLeads([])
      setLoading(false)
      return
    }

    const { data, error: lErr } = await supabase
      .from('leads')
      .select('*, veiculos(marca, modelo)')
      .in('veiculo_id', veiculoIds)
      .order('created_at', { ascending: false })

    setLoading(false)

    if (lErr) {
      setError(lErr.message)
      return
    }

    setLeads((data ?? []) as LeadGaragem[])
  }, [garagemId])

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

  return { leads, atualizarStatus, loading, error, recarregar: carregar }
}
