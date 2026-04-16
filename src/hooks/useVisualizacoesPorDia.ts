// Dados reais a partir da migração 005 (tabela visualizacoes_diarias).
// O RPC incrementar_visualizacao_veiculo (migração 006) alimenta essa tabela.
// NÃO usar dados simulados aqui.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface DiaVisualizacoes {
  data: string
  total: number
}

interface UseVisualizacoesPorDiaOptions {
  anuncianteId?: string
  garagemId?: string
  dias?: number
}

interface UseVisualizacoesPorDiaResult {
  data: DiaVisualizacoes[]
  loading: boolean
  error: Error | null
  temHistoricoSuficiente: boolean
}

function preencherGaps(dados: DiaVisualizacoes[], dias: number): DiaVisualizacoes[] {
  const hoje = new Date()
  const mapaExistente = new Map(dados.map((d) => [d.data, d.total]))
  const resultado: DiaVisualizacoes[] = []

  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje)
    d.setDate(d.getDate() - i)
    const chave = d.toISOString().slice(0, 10)
    resultado.push({ data: chave, total: mapaExistente.get(chave) ?? 0 })
  }

  return resultado
}

export function useVisualizacoesPorDia({
  anuncianteId,
  garagemId,
  dias = 30,
}: UseVisualizacoesPorDiaOptions = {}): UseVisualizacoesPorDiaResult {
  const { user } = useAuth()
  const [data, setData] = useState<DiaVisualizacoes[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const carregar = useCallback(async () => {
    console.log('🔍 [HOOK] carregar() chamado. user:', user?.id, 'anuncianteId:', anuncianteId, 'garagemId:', garagemId)
    
    if (!user) {
      console.log('🔍 [HOOK] Sem user, abortando')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let veiculosQuery = supabase.from('veiculos').select('id')

      if (anuncianteId) {
        veiculosQuery = veiculosQuery.eq('anunciante_id', anuncianteId)
      } else if (garagemId) {
        veiculosQuery = veiculosQuery.eq('garagem_id', garagemId)
      } else {
        veiculosQuery = veiculosQuery.eq('anunciante_id', user.id)
      }

      const { data: veiculos, error: veicError } = await veiculosQuery
      
      console.log('🔍 [HOOK] Query veículos retornou:', { veiculos, veicError })
      
      if (veicError) throw new Error(veicError.message)

      if (!veiculos || veiculos.length === 0) {
        console.log('🔍 [HOOK] Nenhum veículo encontrado, setando empty data')
        setData(preencherGaps([], dias))
        return
      }

      const veiculoIds = veiculos.map((v) => v.id)
      console.log('🔍 [HOOK] IDs dos veículos:', veiculoIds)

      const dataCorte = new Date()
      dataCorte.setDate(dataCorte.getDate() - dias)
      const dataCorteStr = dataCorte.toISOString().slice(0, 10)

      const { data: rows, error: snapError } = await supabase
        .from('visualizacoes_diarias')
        .select('data, total_dia')
        .in('veiculo_id', veiculoIds)
        .gte('data', dataCorteStr)
        .order('data', { ascending: true })

      console.log('🔍 [HOOK] Query snapshots retornou:', { rows, snapError })

      if (snapError) throw new Error(snapError.message)

      const agregado = new Map<string, number>()
      for (const row of rows ?? []) {
        const dataStr = row.data as string
        agregado.set(dataStr, (agregado.get(dataStr) ?? 0) + (row.total_dia as number))
      }

      const dadosAgregados: DiaVisualizacoes[] = Array.from(agregado.entries()).map(
        ([data, total]) => ({ data, total })
      )

      const finalData = preencherGaps(dadosAgregados, dias)
      console.log('🔍 [HOOK] Dados finais com gaps preenchidos:', finalData.filter(d => d.total > 0))
      
      setData(finalData)
    } catch (e) {
      console.log('🔍 [HOOK] Erro:', e)
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [user, anuncianteId, garagemId, dias])

  useEffect(() => {
    carregar()
  }, [carregar])

  const diasComDado = data.filter((d) => d.total > 0).length
  const temHistoricoSuficiente = diasComDado >= 3

  return { data, loading, error, temHistoricoSuficiente }
}