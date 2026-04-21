import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { PresetId, JobStatusResponse } from '@/lib/venstudio-types-v2'

// ============================================================
// Hook: useVenStudioPremium
// Gerencia o fluxo completo: upload → job → polling → resultado
// ============================================================

export type PremiumState = 'idle' | 'uploading' | 'selecting' | 'processing' | 'success' | 'error'

interface UsePremiumResult {
  state: PremiumState
  previewUrl: string | null
  selectedPreset: PresetId | null
  jobId: string | null
  result: JobStatusResponse | null
  error: string | null
  tentativas: number

  setFile: (file: File | null) => void
  setPreset: (id: PresetId) => void
  startProcessing: (veiculoId: string, pngUrl: string, fotoOriginalUrl: string, fotoId?: string) => Promise<void>
  retry: () => void
  reset: () => void
}

const POLL_INTERVAL = 3000 // 3 seconds
const API_BASE = import.meta.env.PROD
  ? 'https://ventoro-auto.vercel.app'
  : '' // Vite proxy em dev

export function useVenStudioPremium(): UsePremiumResult {
  const [state, setState] = useState<PremiumState>('idle')
  const [file, setFileState] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [result, setResult] = useState<JobStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tentativas, setTentativas] = useState(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastJobRef = useRef<{ veiculoId: string; pngUrl: string; fotoOriginalUrl: string; fotoId?: string } | null>(null)

  // ── File handling ──
  const setFile = useCallback((f: File | null) => {
    setFileState(f)
    if (f) {
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
      setState('selecting')
    } else {
      setPreviewUrl(null)
      setState('idle')
    }
    setResult(null)
    setError(null)
    setJobId(null)
  }, [])

  const setPreset = useCallback((id: PresetId) => {
    setSelectedPreset(id)
  }, [])

  // ── Cleanup polling on unmount ──
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Polling ──
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (!token) return

        const res = await fetch(`${API_BASE}/api/venstudio/job-status?id=${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (!res.ok) return

        const data: JobStatusResponse = await res.json()
        setTentativas(data.tentativas || 0)

        if (data.status === 'concluido' && data.url_processada) {
          setResult(data)
          setState('success')
          if (pollRef.current) clearInterval(pollRef.current)
        } else if (data.status === 'erro' || data.status === 'rejeitado' || data.status === 'fallback_elegivel') {
          setResult(data)
          setError(data.erro || 'Processamento falhou')
          setState('error')
          if (pollRef.current) clearInterval(pollRef.current)
        }
        // status 'processando' → continue polling
      } catch {
        // Ignore polling errors, will retry
      }
    }, POLL_INTERVAL)
  }, [])

  // ── Start processing ──
  const startProcessing = useCallback(async (
    veiculoId: string,
    pngUrl: string,
    fotoOriginalUrl: string,
    fotoId?: string
  ) => {
    if (!selectedPreset) return

    lastJobRef.current = { veiculoId, pngUrl, fotoOriginalUrl, fotoId }
    setState('processing')
    setError(null)
    setResult(null)
    setTentativas(0)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Não autenticado')

      const res = await fetch(`${API_BASE}/api/venstudio/compor-premium-v2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          veiculo_png_url: pngUrl,
          foto_original_url: fotoOriginalUrl,
          preset_id: selectedPreset,
          veiculo_id: veiculoId,
          foto_id: fotoId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erro ${res.status}`)
      }

      const data = await res.json()
      setJobId(data.jobId)
      setTentativas(1)

      // Start polling for result
      startPolling(data.jobId)

      // Also try Supabase Realtime
      const channel = supabase
        .channel(`job-${data.jobId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'processamentos_ia',
          filter: `id=eq.${data.jobId}`,
        }, (payload) => {
          const row = payload.new as Record<string, unknown>
          if (row.status === 'concluido' && row.foto_processada_url) {
            setResult({
              id: row.id as string,
              status: 'concluido',
              aprovado: true,
              url_processada: row.foto_processada_url as string,
              hamming_distance: row.hamming_distance as number | null,
              erro: null,
              preset_id: row.preset_id as string,
              tentativas: row.tentativas as number,
              created_at: row.created_at as string,
              updated_at: row.updated_at as string,
            })
            setState('success')
            if (pollRef.current) clearInterval(pollRef.current)
            channel.unsubscribe()
          } else if (row.status === 'erro' || row.status === 'fallback_elegivel') {
            setError(row.erro as string || 'Processamento falhou')
            setState('error')
            if (pollRef.current) clearInterval(pollRef.current)
            channel.unsubscribe()
          }
        })
        .subscribe()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setState('error')
    }
  }, [selectedPreset, startPolling])

  // ── Retry ──
  const retry = useCallback(() => {
    if (lastJobRef.current && selectedPreset) {
      const { veiculoId, pngUrl, fotoOriginalUrl, fotoId } = lastJobRef.current
      startProcessing(veiculoId, pngUrl, fotoOriginalUrl, fotoId)
    }
  }, [selectedPreset, startProcessing])

  // ── Reset ──
  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setState('idle')
    setFileState(null)
    setPreviewUrl(null)
    setSelectedPreset(null)
    setJobId(null)
    setResult(null)
    setError(null)
    setTentativas(0)
    lastJobRef.current = null
  }, [])

  return {
    state, previewUrl, selectedPreset, jobId, result, error, tentativas,
    setFile, setPreset, startProcessing, retry, reset,
  }
}
