import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database.types'

type VeiculoRow = Database['public']['Tables']['veiculos']['Row']

export type VeiculoAnunciante = VeiculoRow & {
  fotos_veiculo: {
    url_original: string
    url_processada: string | null
    is_capa: boolean
    ordem: number
  }[]
}

export interface MetricasAnunciante {
  totalViews: number
  totalLeads: number
  totalFavs: number
  taxaContato: number
}

export interface ContagensStatus {
  publicado: number
  pausado: number
  vendido: number
  rascunho: number
}

export function fotoCapa(v: VeiculoAnunciante): string {
  const sorted = [...v.fotos_veiculo].sort((a, b) => {
    if (a.is_capa !== b.is_capa) return a.is_capa ? -1 : 1
    return a.ordem - b.ordem
  })
  const f = sorted[0]
  return f ? (f.url_processada ?? f.url_original) : '/placeholder-car.jpg'
}

export function useVeiculosAnunciante() {
  const { user } = useAuth()
  const [veiculos, setVeiculos] = useState<VeiculoAnunciante[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('veiculos')
      .select('*, fotos_veiculo(url_original, url_processada, is_capa, ordem)')
      .eq('anunciante_id', user.id)
      .eq('tipo_anunciante', 'particular')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setVeiculos((data ?? []) as VeiculoAnunciante[])
  }, [user])

  useEffect(() => {
    carregar()
  }, [carregar])

  const metricas: MetricasAnunciante = (() => {
    const totals = veiculos.reduce(
      (acc, v) => ({
        totalViews: acc.totalViews + v.visualizacoes,
        totalLeads: acc.totalLeads + v.leads_count,
        totalFavs: acc.totalFavs + v.favoritos_count,
      }),
      { totalViews: 0, totalLeads: 0, totalFavs: 0 }
    )
    return {
      ...totals,
      taxaContato:
        totals.totalViews > 0
          ? parseFloat(((totals.totalLeads / totals.totalViews) * 100).toFixed(1))
          : 0,
    }
  })()

  const contagens: ContagensStatus = {
    publicado: veiculos.filter((v) => v.status === 'publicado').length,
    pausado: veiculos.filter((v) => v.status === 'pausado').length,
    vendido: veiculos.filter((v) => v.status === 'vendido').length,
    rascunho: veiculos.filter((v) => v.status === 'rascunho').length,
  }

  async function atualizarStatus(id: string, status: VeiculoRow['status']) {
    const { error: err } = await supabase
      .from('veiculos')
      .update({ status })
      .eq('id', id)
    if (!err) {
      setVeiculos((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)))
    }
    return { error: err }
  }

  return { veiculos, metricas, contagens, atualizarStatus, loading, error, recarregar: carregar }
}
