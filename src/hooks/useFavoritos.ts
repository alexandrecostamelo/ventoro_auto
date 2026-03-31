import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useFavoritos() {
  const { user } = useAuth()
  const [favoritos, setFavoritos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) { setFavoritos([]); return }
    supabase
      .from('favoritos')
      .select('veiculo_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setFavoritos(data.map(f => f.veiculo_id))
      })
  }, [user])

  async function toggleFavorito(veiculoId: string) {
    if (!user) return
    const isFav = favoritos.includes(veiculoId)
    if (isFav) {
      await supabase.from('favoritos').delete().eq('user_id', user.id).eq('veiculo_id', veiculoId)
      setFavoritos(prev => prev.filter(id => id !== veiculoId))
    } else {
      await supabase.from('favoritos').insert({ user_id: user.id, veiculo_id: veiculoId, lista_nome: 'Sem categoria' })
      setFavoritos(prev => [...prev, veiculoId])
    }
  }

  function isFavorito(veiculoId: string) {
    return favoritos.includes(veiculoId)
  }

  return { favoritos, toggleFavorito, isFavorito, loading }
}
