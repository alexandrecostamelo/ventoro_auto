// Dados reais a partir da migração 005 (tabela visualizacoes_diarias).
// O RPC incrementar_visualizacao_veiculo (migração 006) alimenta essa tabela.
// NÃO usar dados simulados aqui.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface DiaVisualizacoes {
  data: string   // 'YYYY-MM-DD' — formato pronto para label do Recharts
  total: number
}

interface UseVisualizacoesPorDiaOptions {
  anuncianteId?: string  // dashboard anunciante particular
  garagemId?: string     // dashboard garagem (Módulo 4E)
  dias?: number          // janela retroativa em dias (default: 30)
}

interface UseVisualizacoesPorDiaResult {
  data: DiaVisualizacoes[]
  loading: boolean
  error: Error | null
  temHistoricoSuficiente: boolean  // true se houver pelo menos 3 dias com dado > 0
}

/**
 * Preenche os dias sem visualização com total=0 para manter o gráfico contínuo,
 * sem gaps que quebrariam a linha no Recharts.
 */
function preencherGaps(dados: DiaVisualizacoes[], dias: number): DiaVisualizacoes[] {
  const hoje = new Date()
  const mapaExistente = new Map(dados.map((d) => [d.data, d.total]))
  const resultado: DiaVisualizacoes[] = []

  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje)
    d.setDate(d.getDate() - i)
    // Formato YYYY-MM-DD sem depender de timezone do cliente
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
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Busca veículos do anunciante/garagem para filtrar snapshots via JOIN
      // RLS na visualizacoes_diarias já garante isolamento — filtro explícito é defense-in-depth
      let veiculosQuery = supabase.from('veiculos').select('id')

      if (anuncianteId) {
        veiculosQuery = veiculosQuery.eq('anunciante_id', anuncianteId)
      } else if (garagemId) {
        veiculosQuery = veiculosQuery.eq('garagem_id', garagemId)
      } else {
        // Fallback: veículos do usuário logado como anunciante particular
        veiculosQuery = veiculosQuery.eq('anunciante_id', user.id)
      }

      const { data: veiculos, error: veicError } = await veiculosQuery
      if (veicError) throw new Error(veicError.message)

      if (!veiculos || veiculos.length === 0) {
        setData(preencherGaps([], dias))
        return
      }

      const veiculoIds = veiculos.map((v) => v.id)

      // Data de corte: N dias atrás
      const dataCorte = new Date()
      dataCorte.setDate(dataCorte.getDate() - dias)
      const dataCorteStr = dataCorte.toISOString().slice(0, 10)

      const { data: rows, error: snapError } = await supabase
        .from('visualizacoes_diarias')
        .select('data, total_dia')
        .in('veiculo_id', veiculoIds)
        .gte('data', dataCorteStr)
        .order('data', { ascending: true })

      if (snapError) throw new Error(snapError.message)

      // Agrega por data (SUM total_dia de todos os veículos por dia)
      const agregado = new Map<string, number>()
      for (const row of rows ?? []) {
        const dataStr = row.data as string
        agregado.set(dataStr, (agregado.get(dataStr) ?? 0) + (row.total_dia as number))
      }

      const dadosAgregados: DiaVisualizacoes[] = Array.from(agregado.entries()).map(
        ([data, total]) => ({ data, total })
      )

      setData(preencherGaps(dadosAgregados, dias))
    } catch (e) {
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
