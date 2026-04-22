import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { type CenarioV2Id } from '@/lib/venstudio-cenarios-v2'

// ============================================================
// VenStudio V2 — Hook Stability AI
// Engine: Replace Background and Relight
// ============================================================

export type VenStudioStatus = 'idle' | 'processando' | 'validando' | 'concluido' | 'erro'

export interface FotoResultado {
  fotoUrl: string
  fotoId?: string
  status: VenStudioStatus
  urlProcessada?: string
  hammingDistance?: number
  aprovado?: boolean
  tempoMs?: number
  erro?: string
  processamentoId?: string
}

interface ProcessarOpcoes {
  light_direction?: 'above' | 'left' | 'right' | 'below'
  light_strength?: number
  preserve_subject?: number
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessão expirada')
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export function useVenStudioV2() {
  const [status, setStatus] = useState<VenStudioStatus>('idle')
  const [fotos, setFotos] = useState<FotoResultado[]>([])
  const [progresso, setProgresso] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const canceladoRef = useRef(false)

  const processarFoto = useCallback(async (
    fotoUrl: string,
    cenarioId: CenarioV2Id,
    veiculoId: string,
    fotoId?: string,
    opcoes?: ProcessarOpcoes,
  ): Promise<FotoResultado> => {
    const headers = await getAuthHeaders()

    // POST /api/venstudio/processar
    const resp = await fetch('/api/venstudio/processar', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        foto_url: fotoUrl,
        cenario_id: cenarioId,
        veiculo_id: veiculoId,
        ...opcoes,
      }),
    })

    const data = await resp.json()

    // Resultado síncrono (200 com success)
    if (resp.status === 200 && data.success !== undefined) {
      return {
        fotoUrl,
        fotoId,
        status: data.aprovado ? 'concluido' : 'erro',
        urlProcessada: data.url_processada,
        hammingDistance: data.hamming_distance,
        aprovado: data.aprovado,
        tempoMs: data.tempo_ms,
        processamentoId: data.processamento_id,
        erro: data.aprovado ? undefined : data.motivo,
      }
    }

    // Resultado assíncrono (202) — iniciar polling
    if (resp.status === 202 && data.processamento_id) {
      return await pollarStatus(data.processamento_id, fotoUrl, fotoId, headers)
    }

    // Erro
    return {
      fotoUrl,
      fotoId,
      status: 'erro',
      erro: data.error || `Erro ${resp.status}`,
    }
  }, [])

  const pollarStatus = async (
    processamentoId: string,
    fotoUrl: string,
    fotoId: string | undefined,
    headers: Record<string, string>,
  ): Promise<FotoResultado> => {
    const maxPolls = 30 // 30 × 3s = 90s max
    for (let i = 0; i < maxPolls; i++) {
      if (canceladoRef.current) {
        return { fotoUrl, fotoId, status: 'erro', erro: 'Cancelado pelo usuário' }
      }

      await new Promise(r => setTimeout(r, 3000))

      try {
        const resp = await fetch(`/api/venstudio/status?id=${processamentoId}`, { headers })
        const data = await resp.json()

        if (data.status === 'concluido') {
          return {
            fotoUrl,
            fotoId,
            status: 'concluido',
            urlProcessada: data.url_processada,
            hammingDistance: data.hamming_distance,
            aprovado: data.aprovado,
            processamentoId,
          }
        }

        if (data.status === 'erro' || data.status === 'rejeitado') {
          return {
            fotoUrl,
            fotoId,
            status: 'erro',
            hammingDistance: data.hamming_distance,
            aprovado: false,
            processamentoId,
            erro: data.erro || 'Fingerprint rejeitado',
          }
        }
        // Still processing, continue polling
      } catch {
        // Network error, retry
      }
    }

    return { fotoUrl, fotoId, status: 'erro', erro: 'Timeout — processamento demorou muito' }
  }

  const processarTodas = useCallback(async (
    fotosInput: { url: string; id?: string }[],
    cenarioId: CenarioV2Id,
    veiculoId: string,
    opcoes?: ProcessarOpcoes,
  ) => {
    canceladoRef.current = false
    setStatus('processando')
    setErro(null)
    setProgresso(0)

    const resultados: FotoResultado[] = fotosInput.map(f => ({
      fotoUrl: f.url,
      fotoId: f.id,
      status: 'idle' as VenStudioStatus,
    }))
    setFotos([...resultados])

    for (let i = 0; i < fotosInput.length; i++) {
      if (canceladoRef.current) break

      resultados[i] = { ...resultados[i], status: 'processando' }
      setFotos([...resultados])
      setProgresso(Math.round((i / fotosInput.length) * 100))

      try {
        const resultado = await processarFoto(
          fotosInput[i].url,
          cenarioId,
          veiculoId,
          fotosInput[i].id,
          opcoes,
        )
        resultados[i] = resultado
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        resultados[i] = {
          fotoUrl: fotosInput[i].url,
          fotoId: fotosInput[i].id,
          status: 'erro',
          erro: msg,
        }

        // Retry 1x com tratamento de rate limit
        if (msg.includes('429')) {
          await new Promise(r => setTimeout(r, 5000))
          try {
            const retry = await processarFoto(fotosInput[i].url, cenarioId, veiculoId, fotosInput[i].id, opcoes)
            resultados[i] = retry
          } catch {
            // Keep original error
          }
        }
      }

      setFotos([...resultados])
    }

    setProgresso(100)

    const temErro = resultados.some(r => r.status === 'erro')
    const todasOk = resultados.every(r => r.status === 'concluido')

    setStatus(todasOk ? 'concluido' : temErro ? 'erro' : 'concluido')
    if (temErro && !todasOk) {
      setErro(`${resultados.filter(r => r.status === 'erro').length} foto(s) não puderam ser processadas`)
    }

    return resultados
  }, [processarFoto])

  const cancelar = useCallback(() => {
    canceladoRef.current = true
  }, [])

  const resetar = useCallback(() => {
    setStatus('idle')
    setFotos([])
    setProgresso(0)
    setErro(null)
    canceladoRef.current = false
  }, [])

  return {
    status,
    fotos,
    progresso,
    erro,
    processarFoto,
    processarTodas,
    cancelar,
    resetar,
  }
}
