import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { VeiculoComFotos, VeiculoDetalhe } from '../utils/adapters'

interface FiltrosVeiculo {
  marca?: string
  modelo?: string
  preco_min?: number
  preco_max?: number
  ano_min?: number
  ano_max?: number
  km_max?: number
  combustivel?: string
  cambio?: string
  cidade?: string
  estado?: string
  tipo_anunciante?: 'particular' | 'garagem'
  destaque?: boolean
  ordenar?: 'preco_asc' | 'preco_desc' | 'ano_desc' | 'km_asc' | 'recentes'
  pagina?: number
  por_pagina?: number
}

export function useVeiculos(filtros: FiltrosVeiculo = {}) {
  const [veiculos, setVeiculos] = useState<VeiculoComFotos[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('veiculos')
        .select('*, fotos_veiculo(url_original, url_processada, is_capa, ordem)', { count: 'exact' })
        .eq('status', 'publicado')

      if (filtros.marca) query = query.ilike('marca', `%${filtros.marca}%`)
      if (filtros.modelo) query = query.ilike('modelo', `%${filtros.modelo}%`)
      if (filtros.preco_min) query = query.gte('preco', filtros.preco_min)
      if (filtros.preco_max) query = query.lte('preco', filtros.preco_max)
      if (filtros.ano_min) query = query.gte('ano', filtros.ano_min)
      if (filtros.ano_max) query = query.lte('ano', filtros.ano_max)
      if (filtros.km_max) query = query.lte('quilometragem', filtros.km_max)
      if (filtros.combustivel) query = query.eq('combustivel', filtros.combustivel)
      if (filtros.cambio) query = query.eq('cambio', filtros.cambio)
      if (filtros.cidade) query = query.ilike('cidade', `%${filtros.cidade}%`)
      if (filtros.estado) query = query.eq('estado', filtros.estado)
      if (filtros.tipo_anunciante) query = query.eq('tipo_anunciante', filtros.tipo_anunciante)
      if (filtros.destaque) query = query.eq('destaque', true)

      switch (filtros.ordenar) {
        case 'preco_asc': query = query.order('preco', { ascending: true }); break
        case 'preco_desc': query = query.order('preco', { ascending: false }); break
        case 'ano_desc': query = query.order('ano', { ascending: false }); break
        case 'km_asc': query = query.order('quilometragem', { ascending: true }); break
        default: query = query.order('created_at', { ascending: false })
      }

      const pagina = filtros.pagina ?? 1
      const por_pagina = filtros.por_pagina ?? 24
      query = query.range((pagina - 1) * por_pagina, pagina * por_pagina - 1)

      const { data, error, count } = await query

      if (error) setError(error.message)
      else {
        setVeiculos(data ?? [])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }

    buscar()
  }, [JSON.stringify(filtros)])

  return { veiculos, total, loading, error }
}

export function useVeiculo(slug: string) {
  const [veiculo, setVeiculo] = useState<VeiculoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    async function buscar() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('veiculos')
        .select('*, fotos_veiculo(*), conteudo_ia(*), historico_preco(*), profiles!anunciante_id(*), garagens(*)')
        .eq('slug', slug)
        .eq('status', 'publicado')
        .single()

      if (error) setError(error.message)
      else setVeiculo(data as VeiculoDetalhe)
      setLoading(false)
    }

    buscar()
  }, [slug])

  return { veiculo, loading, error }
}
