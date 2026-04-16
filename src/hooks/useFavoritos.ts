import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { veiculoDbParaMock } from '../utils/adapters'
import type { VeiculoComFotos } from '../utils/adapters'
import type { Vehicle } from '../data/mock'
import type { Database } from '../types/database.types'

// Tipo do JOIN favoritos → veiculos → fotos_veiculo
type FavoritoComJoin = Database['public']['Tables']['favoritos']['Row'] & {
  veiculos: VeiculoComFotos | null
}

export interface FavoritoEnriquecido {
  id: string
  veiculo_id: string
  savedAt: string
  lista_nome: string
  vehicle: Vehicle
  priceDiff: number  // sempre 0 — coluna price_at_save não existe no banco ainda
}

export function useFavoritos() {
  const { user } = useAuth()
  const [veiculoIds, setVeiculoIds] = useState<string[]>([])
  const [favoritosEnriquecidos, setFavoritosEnriquecidos] = useState<FavoritoEnriquecido[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!user) {
      setVeiculoIds([])
      setFavoritosEnriquecidos([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('favoritos')
      .select('*, veiculos(*, fotos_veiculo(url_original, url_processada, is_capa, ordem))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else if (data) {
      const rows = data as unknown as FavoritoComJoin[]
      const comVeiculo = rows.filter(f => f.veiculos != null)

      setVeiculoIds(comVeiculo.map(f => f.veiculo_id))
      setFavoritosEnriquecidos(
        comVeiculo.map(f => ({
          id: f.id,
          veiculo_id: f.veiculo_id,
          savedAt: f.created_at,
          lista_nome: f.lista_nome,
          vehicle: veiculoDbParaMock(f.veiculos as VeiculoComFotos),
          priceDiff: 0,
        }))
      )
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    carregar()
  }, [carregar])

  function isFavorito(veiculoId: string): boolean {
    return veiculoIds.includes(veiculoId)
  }

  async function toggleFavorito(veiculoId: string): Promise<void> {
    if (!user) return
    const wasFav = veiculoIds.includes(veiculoId)

    // Optimistic update — coração reage imediatamente
    if (wasFav) {
      setVeiculoIds(prev => prev.filter(id => id !== veiculoId))
      setFavoritosEnriquecidos(prev => prev.filter(f => f.veiculo_id !== veiculoId))
    } else {
      setVeiculoIds(prev => [...prev, veiculoId])
    }

    if (wasFav) {
      const { error: delError } = await supabase
        .from('favoritos')
        .delete()
        .eq('user_id', user.id)
        .eq('veiculo_id', veiculoId)

      if (delError) {
        // Revert: recarga do estado real
        await carregar()
      }
    } else {
      const { error: insError } = await supabase
        .from('favoritos')
        .insert({ user_id: user.id, veiculo_id: veiculoId, lista_nome: 'Sem categoria' })

      if (insError) {
        // Revert optimistic
        setVeiculoIds(prev => prev.filter(id => id !== veiculoId))
      } else {
        // Recarrega para obter dados completos do veículo na lista
        await carregar()
      }
    }
  }

  return { favoritosEnriquecidos, isFavorito, toggleFavorito, loading, error }
}
