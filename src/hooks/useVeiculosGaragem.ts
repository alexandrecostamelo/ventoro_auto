import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'
import type { VeiculoAnunciante, MetricasAnunciante, ContagensStatus } from './useVeiculosAnunciante'
import { fotoCapa } from './useVeiculosAnunciante'

export type { VeiculoAnunciante, MetricasAnunciante, ContagensStatus }
export { fotoCapa }

type VeiculoRow = Database['public']['Tables']['veiculos']['Row']

export function useVeiculosGaragem(garagemId: string | null) {
  const [veiculos, setVeiculos] = useState<VeiculoAnunciante[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!garagemId) {
      setVeiculos([])
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('veiculos')
      .select('*, fotos_veiculo(url_original, url_processada, is_capa, ordem)')
      .eq('garagem_id', garagemId)
      .eq('tipo_anunciante', 'garagem')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setVeiculos((data ?? []) as VeiculoAnunciante[])
  }, [garagemId])

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
