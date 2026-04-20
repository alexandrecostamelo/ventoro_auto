import { useState, useRef, useCallback } from 'react'
import {
  Megaphone, Sparkles, Download, Copy, Check, Loader2,
  Target, Users, MapPin, Image as ImageIcon,
} from 'lucide-react'
import { useMinhaGaragem } from '@/hooks/useMinhaGaragem'
import { useVeiculosGaragem } from '@/hooks/useVeiculosGaragem'
import { formatarPreco } from '@/utils/formatters'
import { supabase } from '@/lib/supabase'
import CriativoAds, { downloadAdCanvas, type AdFormato, type AdDados } from '@/components/CriativoAds'

// ── Tipos ──

interface Segmentacao {
  idade_min?: number
  idade_max?: number
  genero?: string
  interesses?: string[]
  raio_km?: number
  localizacao?: string
}

interface CriativoGerado {
  formato: AdFormato
  copy_primaria: string
  copy_secundaria: string
  cta: string
  segmentacao: Segmentacao
  foto_url: string | null
  veiculo: {
    marca: string; modelo: string; versao?: string | null; ano: number
    preco_formatado: string; km_formatado: string
    cidade: string; estado: string; preco_status: string
    score_confianca: number; ipva_pago: boolean
    selo_studio_ia: boolean; selo_inspecao: boolean; slug: string
  }
  url_destino: string
}

const FORMATOS: { id: AdFormato; label: string; desc: string; size: string }[] = [
  { id: 'feed', label: 'Feed', desc: 'Facebook / Instagram', size: '1080×1080' },
  { id: 'stories', label: 'Stories', desc: 'Instagram / Facebook', size: '1080×1920' },
  { id: 'google_display', label: 'Display', desc: 'Google Display Network', size: '300×250' },
]

// ── Componente principal ──

export default function GarageMarketing() {
  const { garagem } = useMinhaGaragem()
  const { veiculos, loading } = useVeiculosGaragem(garagem?.id ?? null)
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null)
  const [selectedFormato, setSelectedFormato] = useState<AdFormato>('feed')
  const [criativo, setCriativo] = useState<CriativoGerado | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const ativos = veiculos.filter(v => v.status === 'publicado')
  const selectedVeiculo = ativos.find(v => v.id === selectedVeiculoId) ?? null

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas
  }, [])

  const gerarCriativo = async () => {
    if (!selectedVeiculoId) return
    setGenerating(true)
    setError(null)
    setCriativo(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const { data, error: fnError } = await supabase.functions.invoke('gerar-criativo-ads', {
        body: { veiculo_id: selectedVeiculoId, formato: selectedFormato },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      setCriativo(data as CriativoGerado)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar criativo')
    } finally {
      setGenerating(false)
    }
  }

  const copiarCopy = async () => {
    if (!criativo) return
    const text = `${criativo.copy_secundaria}\n\n${criativo.copy_primaria}\n\n${criativo.cta}\n${criativo.url_destino}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const baixarImagem = () => {
    if (!canvasRef.current || !criativo) return
    const name = `ventoro-ad-${selectedFormato}-${criativo.veiculo.marca}-${criativo.veiculo.modelo}.png`
      .toLowerCase().replace(/\s+/g, '-')
    downloadAdCanvas(canvasRef.current, name)
  }

  // Build AdDados from criativo
  const adDados: AdDados | null = criativo ? {
    fotoUrl: criativo.foto_url,
    marca: criativo.veiculo.marca,
    modelo: criativo.veiculo.modelo,
    versao: criativo.veiculo.versao,
    ano: criativo.veiculo.ano,
    precoFormatado: criativo.veiculo.preco_formatado,
    kmFormatado: criativo.veiculo.km_formatado,
    cidade: criativo.veiculo.cidade,
    estado: criativo.veiculo.estado,
    precoStatus: criativo.veiculo.preco_status as 'abaixo' | 'na_media' | 'acima',
    copyPrimaria: criativo.copy_primaria,
    copySecundaria: criativo.copy_secundaria,
    cta: criativo.cta,
  } : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 text-text-primary flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-brand" />
          Criativos para Ads
        </h1>
        <p className="text-small text-text-muted mt-1">
          Gere imagens e copy prontos para Meta Ads e Google Ads
        </p>
      </div>

      {/* Step 1: Selecionar veículo */}
      <div className="rounded-xl border border-border bg-background p-5">
        <h2 className="text-h4 text-text-primary mb-3">1. Selecione o veículo</h2>

        {loading ? (
          <div className="h-20 flex items-center justify-center text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando veículos...
          </div>
        ) : ativos.length === 0 ? (
          <p className="text-small text-text-muted py-4">Nenhum veículo ativo para gerar criativos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ativos.map(v => {
              const foto = [...v.fotos_veiculo].sort((a, b) => {
                if (a.is_capa !== b.is_capa) return a.is_capa ? -1 : 1
                return a.ordem - b.ordem
              })[0]
              const fotoUrl = foto?.url_processada ?? foto?.url_original ?? '/placeholder-car.jpg'
              const isSelected = selectedVeiculoId === v.id

              return (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVeiculoId(v.id); setCriativo(null) }}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-brand bg-brand-light shadow-md'
                      : 'border-border hover:border-brand/50 hover:bg-surface-secondary'
                  }`}
                >
                  <img src={fotoUrl} alt={v.modelo} className="w-16 h-12 rounded-md object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-small font-medium text-text-primary truncate">
                      {v.marca} {v.modelo} {v.ano}
                    </p>
                    <p className="text-micro text-text-muted">{formatarPreco(v.preco)}</p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-brand flex-shrink-0 ml-auto" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Step 2: Selecionar formato */}
      {selectedVeiculoId && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h2 className="text-h4 text-text-primary mb-3">2. Escolha o formato</h2>
          <div className="flex gap-3">
            {FORMATOS.map(f => (
              <button
                key={f.id}
                onClick={() => { setSelectedFormato(f.id); setCriativo(null) }}
                className={`flex-1 rounded-lg border p-4 text-center transition-all ${
                  selectedFormato === f.id
                    ? 'border-brand bg-brand-light shadow-md'
                    : 'border-border hover:border-brand/50'
                }`}
              >
                <ImageIcon className={`h-6 w-6 mx-auto mb-2 ${selectedFormato === f.id ? 'text-brand' : 'text-text-muted'}`} />
                <p className="text-small font-semibold text-text-primary">{f.label}</p>
                <p className="text-micro text-text-muted">{f.desc}</p>
                <p className="text-micro text-text-muted mt-0.5">{f.size}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-center mt-4">
            <button
              onClick={gerarCriativo}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-full bg-brand text-primary-foreground px-6 py-2.5 text-body font-medium hover:brightness-90 transition-all disabled:opacity-50"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gerando criativo...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Gerar criativo {FORMATOS.find(f => f.id === selectedFormato)?.label}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-small text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Step 3: Preview + ações */}
      {criativo && adDados && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h2 className="text-h4 text-text-primary mb-3">Preview</h2>
            <div className="flex justify-center">
              <CriativoAds dados={adDados} formato={selectedFormato} onReady={handleCanvasReady} />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={baixarImagem}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-small font-medium text-text-primary hover:bg-surface-secondary transition-colors"
              >
                <Download className="h-4 w-4" /> Baixar PNG
              </button>
              <button
                onClick={copiarCopy}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-small font-medium text-text-primary hover:bg-surface-secondary transition-colors"
              >
                {copied ? (
                  <><Check className="h-4 w-4 text-trust-high" /> Copiada!</>
                ) : (
                  <><Copy className="h-4 w-4" /> Copiar copy</>
                )}
              </button>
            </div>
          </div>

          {/* Copy + Segmentação */}
          <div className="space-y-4">
            {/* Copy */}
            <div className="rounded-xl border border-border bg-background p-5">
              <h3 className="text-h4 text-text-primary mb-3">Copy do anúncio</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-micro text-text-muted uppercase tracking-wider mb-1">Headline</p>
                  <p className="text-body font-semibold text-text-primary">{criativo.copy_secundaria}</p>
                </div>
                <div>
                  <p className="text-micro text-text-muted uppercase tracking-wider mb-1">Texto principal</p>
                  <p className="text-small text-text-secondary whitespace-pre-wrap">{criativo.copy_primaria}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-micro text-text-muted uppercase tracking-wider mb-1">CTA</p>
                    <span className="inline-block rounded-full bg-brand text-primary-foreground px-4 py-1.5 text-small font-medium">
                      {criativo.cta}
                    </span>
                  </div>
                  <div className="ml-auto">
                    <p className="text-micro text-text-muted uppercase tracking-wider mb-1">URL destino</p>
                    <p className="text-micro text-brand font-mono truncate max-w-[200px]">{criativo.url_destino}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Segmentação */}
            <div className="rounded-xl border border-border bg-background p-5">
              <h3 className="text-h4 text-text-primary mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-brand" />
                Segmentação sugerida
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {criativo.segmentacao.idade_min && criativo.segmentacao.idade_max && (
                  <div className="rounded-lg bg-surface-secondary p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="h-3.5 w-3.5 text-text-muted" />
                      <p className="text-micro text-text-muted">Idade</p>
                    </div>
                    <p className="text-small font-medium text-text-primary">
                      {criativo.segmentacao.idade_min}–{criativo.segmentacao.idade_max} anos
                    </p>
                  </div>
                )}
                {criativo.segmentacao.genero && (
                  <div className="rounded-lg bg-surface-secondary p-3">
                    <p className="text-micro text-text-muted mb-1">Gênero</p>
                    <p className="text-small font-medium text-text-primary capitalize">
                      {criativo.segmentacao.genero}
                    </p>
                  </div>
                )}
                {criativo.segmentacao.localizacao && (
                  <div className="rounded-lg bg-surface-secondary p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-text-muted" />
                      <p className="text-micro text-text-muted">Localização</p>
                    </div>
                    <p className="text-small font-medium text-text-primary">
                      {criativo.segmentacao.localizacao}
                    </p>
                  </div>
                )}
                {criativo.segmentacao.raio_km && (
                  <div className="rounded-lg bg-surface-secondary p-3">
                    <p className="text-micro text-text-muted mb-1">Raio</p>
                    <p className="text-small font-medium text-text-primary">
                      {criativo.segmentacao.raio_km} km
                    </p>
                  </div>
                )}
              </div>
              {criativo.segmentacao.interesses && criativo.segmentacao.interesses.length > 0 && (
                <div className="mt-3">
                  <p className="text-micro text-text-muted mb-1.5">Interesses sugeridos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {criativo.segmentacao.interesses.map((i, idx) => (
                      <span key={idx} className="rounded-full bg-brand/10 text-brand px-2.5 py-0.5 text-micro font-medium">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-micro text-text-muted mt-3">
                Use estas sugestões como ponto de partida no Meta Ads Manager ou Google Ads.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      {!criativo && !generating && selectedVeiculoId && (
        <div className="rounded-xl border border-border bg-surface-secondary p-5 text-center">
          <Megaphone className="h-8 w-8 text-text-muted mx-auto mb-3" />
          <p className="text-body text-text-secondary">
            Selecione o formato e clique em "Gerar criativo" para criar seu anúncio.
          </p>
          <p className="text-small text-text-muted mt-1">
            A IA gera a imagem, copy e segmentação. Você baixa e sobe no gerenciador de anúncios.
          </p>
        </div>
      )}
    </div>
  )
}
