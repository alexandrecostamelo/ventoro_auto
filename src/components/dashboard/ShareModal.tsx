import { useState, useRef, useCallback } from 'react'
import {
  X, Instagram, MessageCircle, Copy, Download, Check, Sparkles, Loader2,
} from 'lucide-react'
import CriativoInstagram, {
  downloadCanvas, copyImageToClipboard,
  type CriativoDados,
} from '@/components/CriativoInstagram'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type VeiculoRow = Database['public']['Tables']['veiculos']['Row']

interface Props {
  veiculo: VeiculoRow
  fotoUrl: string | null
  onClose: () => void
}

const SITE_URL = 'https://ventoro.com.br'

export default function ShareModal({ veiculo, fotoUrl, onClose }: Props) {
  const [caption, setCaption] = useState('')
  const [captionCurta, setCaptionCurta] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [copied, setCopied] = useState<'caption' | 'image' | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const link = `${SITE_URL}/veiculo/${veiculo.slug}`

  const criativoDados: CriativoDados = {
    fotoUrl,
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    versao: veiculo.versao,
    ano: veiculo.ano,
    precoFormatado: `R$ ${Number(veiculo.preco).toLocaleString('pt-BR')}`,
    kmFormatado: `${Number(veiculo.quilometragem).toLocaleString('pt-BR')} km`,
    cidade: veiculo.cidade,
    estado: veiculo.estado,
    precoStatus: veiculo.preco_status,
    scoreConfianca: veiculo.score_confianca,
    ipvaPago: veiculo.ipva_pago,
    revisoesEmDia: veiculo.revisoes_em_dia,
    semSinistro: veiculo.sem_sinistro,
    seloStudioIa: veiculo.selo_studio_ia,
  }

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas
  }, [])

  const gerarCaption = async () => {
    setGenerating(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const { data, error: fnError } = await supabase.functions.invoke('gerar-criativo-instagram', {
        body: { veiculo_id: veiculo.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      setCaption(data.caption || '')
      setCaptionCurta(data.caption_curta || '')
      setGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar')
    } finally {
      setGenerating(false)
    }
  }

  const copiarCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption)
      setCopied('caption')
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }

  const copiarImagem = async () => {
    if (!canvasRef.current) return
    const ok = await copyImageToClipboard(canvasRef.current)
    if (ok) {
      setCopied('image')
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const baixarImagem = () => {
    if (!canvasRef.current) return
    const filename = `ventoro-${veiculo.marca}-${veiculo.modelo}-${veiculo.ano}.png`
      .toLowerCase().replace(/\s+/g, '-')
    downloadCanvas(canvasRef.current, filename)
  }

  const abrirInstagram = () => {
    // Copiar caption antes de abrir
    navigator.clipboard.writeText(caption).catch(() => {})
    // Deep link — abre app no mobile, feed no desktop
    window.open('https://www.instagram.com/', '_blank')
  }

  const compartilharWhatsapp = () => {
    const texto = captionCurta
      || `🚗 ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} — R$ ${Number(veiculo.preco).toLocaleString('pt-BR')} — ${veiculo.cidade}/${veiculo.estado}\n\n📲 Veja mais: ${link}`
    const url = `https://wa.me/?text=${encodeURIComponent(texto + '\n\n' + link)}`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-h3 text-text-primary flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            Compartilhar anúncio
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Preview do criativo */}
          <div>
            <p className="text-small font-medium text-text-secondary mb-2">Preview do post (1080x1080)</p>
            <div className="flex justify-center">
              <CriativoInstagram dados={criativoDados} onReady={handleCanvasReady} />
            </div>
          </div>

          {/* Ações da imagem */}
          <div className="flex gap-2">
            <button
              onClick={baixarImagem}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-small font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <Download className="w-4 h-4" /> Baixar imagem
            </button>
            <button
              onClick={copiarImagem}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-small font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              {copied === 'image' ? (
                <><Check className="w-4 h-4 text-trust-high" /> Copiada!</>
              ) : (
                <><Copy className="w-4 h-4" /> Copiar imagem</>
              )}
            </button>
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-small font-medium text-text-secondary">Caption</p>
              {!generated && (
                <button
                  onClick={gerarCaption}
                  disabled={generating}
                  className="flex items-center gap-1.5 rounded-full bg-brand text-primary-foreground px-4 py-1.5 text-small font-medium hover:brightness-90 transition-all disabled:opacity-50"
                >
                  {generating ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Gerar com IA</>
                  )}
                </button>
              )}
            </div>

            {error && (
              <p className="text-small text-danger mb-2">{error}</p>
            )}

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-border bg-surface-card px-4 py-3 text-small text-text-primary resize-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              placeholder={generating ? 'Gerando caption com IA...' : 'Clique em "Gerar com IA" ou escreva sua caption...'}
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-micro text-text-muted">{caption.length}/2200 caracteres</p>
              {caption && (
                <button
                  onClick={copiarCaption}
                  className="flex items-center gap-1 text-micro text-brand hover:text-brand-dark transition-colors"
                >
                  {copied === 'caption' ? (
                    <><Check className="w-3 h-3" /> Copiada!</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copiar caption</>
                  )}
                </button>
              )}
            </div>

            {generated && (
              <button
                onClick={gerarCaption}
                disabled={generating}
                className="mt-2 flex items-center gap-1.5 text-small text-brand hover:text-brand-dark transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" /> Gerar novamente
              </button>
            )}
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={abrirInstagram}
              disabled={!caption}
              className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-body font-medium text-primary-foreground transition-all hover:brightness-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
            >
              <Instagram className="w-5 h-5" />
              Copiar e abrir Instagram
            </button>
            <button
              onClick={compartilharWhatsapp}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-body font-medium text-primary-foreground transition-all hover:brightness-90"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </button>
          </div>

          <p className="text-micro text-text-muted text-center">
            Fase A: baixe a imagem e cole a caption no Instagram manualmente.
            Post automático disponível em breve (Fase B).
          </p>
        </div>
      </div>
    </div>
  )
}
