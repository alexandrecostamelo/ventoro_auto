import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ============================================================
// Cenários disponíveis para processamento VenStudio IA
// ============================================================

export const CENARIOS_VENSTUDIO = [
  { id: 'showroom_escuro', nome: 'Showroom Premium', desc: 'Fundo preto, iluminação lateral dramática', gradient: 'from-slate-800 to-slate-900' },
  { id: 'estudio_branco', nome: 'Estúdio Branco', desc: 'Fundo limpo, luz difusa profissional', gradient: 'from-gray-200 to-gray-300' },
  { id: 'garagem_premium', nome: 'Garagem Premium', desc: 'Concreto aparente, luz quente', gradient: 'from-stone-700 to-stone-800' },
  { id: 'urbano_noturno', nome: 'Urbano Noturno', desc: 'Rua moderna, asfalto molhado, neon', gradient: 'from-blue-900 to-indigo-900' },
  { id: 'neutro_gradiente', nome: 'Fundo Neutro', desc: 'Gradiente cinza, catálogo profissional', gradient: 'from-gray-400 to-gray-500' },
] as const

export type CenarioId = typeof CENARIOS_VENSTUDIO[number]['id']

// ============================================================
// Estado de processamento por foto
// ============================================================

export interface FotoProcessamento {
  fotoUrl: string       // URL original (ou preview blob)
  fotoId?: string       // ID no banco (se já salva)
  status: 'pendente' | 'processando' | 'concluido' | 'erro'
  urlProcessada?: string
  erro?: string
  tempoMs?: number
}

export interface UseVenStudioResult {
  fotos: FotoProcessamento[]
  cenario: CenarioId
  melhorarQualidade: boolean
  processando: boolean
  progresso: number       // 0-100
  fotosProcessadas: number
  totalFotos: number

  setCenario: (c: CenarioId) => void
  setMelhorarQualidade: (v: boolean) => void
  setFotos: (fotos: FotoProcessamento[]) => void

  processarFoto: (index: number, veiculoId: string) => Promise<void>
  processarTodas: (veiculoId: string) => Promise<void>
  reverterFoto: (index: number) => void

  usoHoje: number | null
  usoMes: number | null
  limiteAtingido: boolean
  carregarUso: () => Promise<void>
}

// ============================================================
// Hook
// ============================================================

export function useVenStudio(): UseVenStudioResult {
  const { user } = useAuth()
  const [fotos, setFotos] = useState<FotoProcessamento[]>([])
  const [cenario, setCenario] = useState<CenarioId>('showroom_escuro')
  const [melhorarQualidade, setMelhorarQualidade] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [usoHoje, setUsoHoje] = useState<number | null>(null)
  const [usoMes, setUsoMes] = useState<number | null>(null)

  const fotosProcessadas = fotos.filter(f => f.status === 'concluido').length
  const totalFotos = fotos.length
  const progresso = totalFotos > 0
    ? Math.round((fotos.filter(f => f.status === 'concluido' || f.status === 'erro').length / totalFotos) * 100)
    : 0

  const limiteAtingido = usoHoje !== null && usoHoje >= 20

  // Refs para evitar stale closures no processamento sequencial
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos
  const cenarioRef = useRef(cenario)
  cenarioRef.current = cenario
  const melhorarRef = useRef(melhorarQualidade)
  melhorarRef.current = melhorarQualidade

  const carregarUso = useCallback(async () => {
    if (!user) return
    const [{ data: hoje }, { data: mes }] = await Promise.all([
      supabase.rpc('contar_uso_ia_hoje', { p_user_id: user.id }),
      supabase.rpc('contar_uso_ia_mes', { p_user_id: user.id }),
    ])
    setUsoHoje(hoje ?? 0)
    setUsoMes(mes ?? 0)
  }, [user])

  const processarFoto = useCallback(async (index: number, veiculoId: string) => {
    if (!user) return

    // Ler do ref para evitar stale closure
    const currentFotos = fotosRef.current
    const foto = currentFotos[index]
    if (!foto || foto.status === 'processando' || foto.status === 'concluido') return

    // Marcar como processando
    setFotos(prev => prev.map((f, i) => i === index ? { ...f, status: 'processando' as const, erro: undefined } : f))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const { data, error } = await supabase.functions.invoke('processar-foto-veiculo', {
        body: {
          foto_url: foto.fotoUrl,
          foto_id: foto.fotoId || null,
          cenario: cenarioRef.current,
          veiculo_id: veiculoId,
          melhorar_qualidade: melhorarRef.current,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) {
        // FunctionsHttpError tem context com o body da resposta
        let msg = error.message || 'Erro ao processar foto'
        try {
          if ('context' in error && typeof (error as any).context?.json === 'function') {
            const ctx = await (error as any).context.json()
            msg = ctx?.error || ctx?.detalhe || msg
          }
        } catch { /* ignore parse errors */ }
        console.error('[VenStudio] Edge Function erro:', msg)
        throw new Error(msg)
      }

      if (data?.error) {
        console.error('[VenStudio] Resposta com erro:', data.error)
        throw new Error(data.error)
      }

      setFotos(prev => prev.map((f, i) =>
        i === index
          ? { ...f, status: 'concluido' as const, urlProcessada: data.url_processada, tempoMs: data.tempo_ms }
          : f
      ))

      // Atualizar contadores
      setUsoHoje(prev => (prev ?? 0) + 1)
      setUsoMes(prev => (prev ?? 0) + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setFotos(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'erro' as const, erro: msg } : f
      ))
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
    setFotos(prev => prev.map((f, i) =>
      i === index ? { ...f, status: 'pendente' as const, urlProcessada: undefined, erro: undefined } : f
    ))
  }, [])

  return {
    fotos,
    cenario,
    melhorarQualidade,
    processando,
    progresso,
    fotosProcessadas,
    totalFotos,
    setCenario,
    setMelhorarQualidade,
    setFotos,
    processarFoto,
    processarTodas,
    reverterFoto,
    usoHoje,
    usoMes,
    limiteAtingido,
    carregarUso,
  }
}
