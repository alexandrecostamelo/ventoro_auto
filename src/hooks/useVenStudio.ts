import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CENARIOS_LIST, type CenarioId } from '@/lib/venstudio-cenarios'

// Re-export for backward compat
export { CENARIOS_LIST as CENARIOS_VENSTUDIO }
export type { CenarioId }

// ============================================================
// VenStudio V2 — Hook de processamento
// Orquestra: segmentação (Edge Function) → composição (Vercel API)
// Tier B = Sharp determinístico | Tier C = Flux Fill + fingerprint
// ============================================================

export type Tier = 'B' | 'C'

export interface FotoProcessamento {
  fotoUrl: string       // URL original
  fotoId?: string       // ID no banco (fotos_veiculo)
  status: 'pendente' | 'segmentando' | 'compondo' | 'concluido' | 'erro' | 'rejeitado'
  urlProcessada?: string
  pngUrl?: string       // URL do PNG segmentado (intermediário)
  erro?: string
  tempoMs?: number
  tier?: Tier
  fingerprint?: {
    hamming_distance: number
    aprovado: boolean
  }
}

export interface UseVenStudioResult {
  fotos: FotoProcessamento[]
  cenario: CenarioId
  tier: Tier
  processando: boolean
  progresso: number
  fotosProcessadas: number
  totalFotos: number

  setCenario: (c: CenarioId) => void
  setTier: (t: Tier) => void
  setFotos: (fotos: FotoProcessamento[]) => void

  processarFoto: (index: number, veiculoId: string) => Promise<void>
  processarTodas: (veiculoId: string) => Promise<void>
  reverterFoto: (index: number) => void
}

const VERCEL_BASE = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://ventoro-auto.vercel.app'

export function useVenStudio(): UseVenStudioResult {
  const { user } = useAuth()
  const [fotos, setFotos] = useState<FotoProcessamento[]>([])
  const [cenario, setCenario] = useState<CenarioId>('showroom_escuro')
  const [tier, setTier] = useState<Tier>('B')
  const [processando, setProcessando] = useState(false)

  const fotosProcessadas = fotos.filter(f => f.status === 'concluido').length
  const totalFotos = fotos.length
  const progresso = totalFotos > 0
    ? Math.round((fotos.filter(f => f.status === 'concluido' || f.status === 'erro' || f.status === 'rejeitado').length / totalFotos) * 100)
    : 0

  // Refs para evitar stale closures
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos
  const cenarioRef = useRef(cenario)
  cenarioRef.current = cenario
  const tierRef = useRef(tier)
  tierRef.current = tier

  const updateFoto = (index: number, update: Partial<FotoProcessamento>) => {
    setFotos(prev => prev.map((f, i) => i === index ? { ...f, ...update } : f))
  }

  const processarFoto = useCallback(async (index: number, veiculoId: string) => {
    if (!user) return
    const foto = fotosRef.current[index]
    if (!foto || foto.status === 'compondo' || foto.status === 'segmentando' || foto.status === 'concluido') return

    const currentCenario = cenarioRef.current
    const currentTier = tierRef.current

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')
      const token = session.access_token

      // ── Etapa 1: Segmentação (Edge Function) ──
      updateFoto(index, { status: 'segmentando', erro: undefined })

      const segRes = await supabase.functions.invoke('segmentar-veiculo', {
        body: { foto_url: foto.fotoUrl, veiculo_id: veiculoId },
        headers: { Authorization: `Bearer ${token}` },
      })

      if (segRes.error) {
        let msg = segRes.error.message || 'Erro na segmentação'
        try {
          if ('context' in segRes.error && typeof (segRes.error as any).context?.json === 'function') {
            const ctx = await (segRes.error as any).context.json()
            msg = ctx?.error || msg
          }
        } catch { /* ignore */ }
        throw new Error(msg)
      }

      if (segRes.data?.error) throw new Error(segRes.data.error)

      const pngUrl = segRes.data.png_url
      updateFoto(index, { status: 'compondo', pngUrl })

      // ── Etapa 2: Composição (Vercel Function) ──
      const endpoint = currentTier === 'C'
        ? `${VERCEL_BASE}/api/venstudio/compor-premium`
        : `${VERCEL_BASE}/api/venstudio/compor-base`

      const compRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          veiculo_png_url: pngUrl,
          foto_original_url: foto.fotoUrl,
          cenario_id: currentCenario,
          veiculo_id: veiculoId,
          foto_id: foto.fotoId || null,
        }),
      })

      const compData = await compRes.json()

      if (!compRes.ok) {
        if (compData.error === 'integridade_falhou') {
          updateFoto(index, {
            status: 'rejeitado',
            erro: 'Integridade do veículo não aprovada. Foto descartada por segurança.',
            tier: currentTier,
            fingerprint: {
              hamming_distance: compData.hamming_distance,
              aprovado: false,
            },
          })
          return
        }
        throw new Error(compData.error || `Erro ${compRes.status}`)
      }

      updateFoto(index, {
        status: 'concluido',
        urlProcessada: compData.url_processada,
        tempoMs: compData.tempo_ms,
        tier: currentTier,
        fingerprint: compData.fingerprint || undefined,
      })

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      updateFoto(index, { status: 'erro', erro: msg })
    }
  }, [user])

  const processarTodas = useCallback(async (veiculoId: string) => {
    setProcessando(true)
    const total = fotosRef.current.length
    for (let i = 0; i < total; i++) {
      const f = fotosRef.current[i]
      if (f.status === 'concluido') continue
      await processarFoto(i, veiculoId)
    }
    setProcessando(false)
  }, [processarFoto])

  const reverterFoto = useCallback((index: number) => {
    updateFoto(index, { status: 'pendente', urlProcessada: undefined, erro: undefined, pngUrl: undefined, fingerprint: undefined })
  }, [])

  return {
    fotos, cenario, tier, processando, progresso, fotosProcessadas, totalFotos,
    setCenario, setTier, setFotos, processarFoto, processarTodas, reverterFoto,
  }
}
