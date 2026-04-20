import { useRef, useEffect, useCallback } from 'react'

// ============================================================
// CriativoInstagram — Canvas 1080x1080 para post do Instagram
// Renderiza foto do veículo + overlay com dados + paleta Ventoro
// ============================================================

export interface CriativoDados {
  fotoUrl: string | null
  marca: string
  modelo: string
  versao?: string | null
  ano: number
  precoFormatado: string
  kmFormatado: string
  cidade: string
  estado: string
  precoStatus: 'abaixo' | 'na_media' | 'acima'
  scoreConfianca: number
  ipvaPago: boolean
  revisoesEmDia: boolean
  semSinistro: boolean
  seloStudioIa: boolean
}

interface Props {
  dados: CriativoDados
  onReady?: (canvas: HTMLCanvasElement) => void
}

const SIZE = 1080
const PADDING = 48
const BRAND_GREEN = '#1a9e6d'
const BRAND_DARK = '#0d1b16'
const WHITE = '#ffffff'
const OVERLAY_BG = 'rgba(13, 27, 22, 0.85)'

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  bg: string, fg: string,
): number {
  ctx.font = 'bold 24px Inter, system-ui, sans-serif'
  const m = ctx.measureText(text)
  const pw = 16
  const ph = 8
  const w = m.width + pw * 2
  const h = 32 + ph * 2

  ctx.fillStyle = bg
  roundRect(ctx, x, y, w, h, 20)
  ctx.fill()

  ctx.fillStyle = fg
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + pw, y + h / 2)

  return w + 8
}

export default function CriativoInstagram({ dados, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const render = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')!

    // ── Background ──
    ctx.fillStyle = BRAND_DARK
    ctx.fillRect(0, 0, SIZE, SIZE)

    // ── Foto do veículo ──
    if (dados.fotoUrl) {
      try {
        const img = await loadImage(dados.fotoUrl)
        // Cover fit centralizado
        const ratio = Math.max(SIZE / img.width, SIZE / img.height)
        const w = img.width * ratio
        const h = img.height * ratio
        const x = (SIZE - w) / 2
        const y = (SIZE - h) / 2 - 60 // shift up to leave room for overlay
        ctx.drawImage(img, x, y, w, h)
      } catch {
        // Fallback: gradient
        const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE)
        grad.addColorStop(0, '#0d2818')
        grad.addColorStop(1, '#1a3a2a')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, SIZE, SIZE)
      }
    }

    // ── Gradient overlay bottom ──
    const gradient = ctx.createLinearGradient(0, SIZE * 0.45, 0, SIZE)
    gradient.addColorStop(0, 'rgba(13, 27, 22, 0)')
    gradient.addColorStop(0.4, 'rgba(13, 27, 22, 0.6)')
    gradient.addColorStop(1, 'rgba(13, 27, 22, 0.95)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, SIZE * 0.45, SIZE, SIZE * 0.55)

    // ── Top bar: Logo + badge FIPE ──
    // Logo area
    ctx.fillStyle = OVERLAY_BG
    roundRect(ctx, PADDING, PADDING, 200, 48, 24)
    ctx.fill()

    ctx.font = 'bold 26px Inter, system-ui, sans-serif'
    ctx.fillStyle = BRAND_GREEN
    ctx.textBaseline = 'middle'
    ctx.fillText('VENTORO', PADDING + 20, PADDING + 24)

    // FIPE badge top-right
    const fipeLabel = dados.precoStatus === 'abaixo' ? '▼ Abaixo da FIPE'
      : dados.precoStatus === 'acima' ? '▲ Acima da FIPE'
      : '✓ Preço FIPE'
    const fipeBg = dados.precoStatus === 'abaixo' ? '#16a34a'
      : dados.precoStatus === 'acima' ? '#dc2626'
      : '#d97706'

    ctx.font = 'bold 22px Inter, system-ui, sans-serif'
    const fipeW = ctx.measureText(fipeLabel).width + 32
    ctx.fillStyle = fipeBg
    roundRect(ctx, SIZE - PADDING - fipeW, PADDING, fipeW, 44, 22)
    ctx.fill()
    ctx.fillStyle = WHITE
    ctx.textBaseline = 'middle'
    ctx.fillText(fipeLabel, SIZE - PADDING - fipeW + 16, PADDING + 22)

    // ── Bottom info area ──
    const bottomY = SIZE - 320

    // Marca + Modelo + Versão
    const titulo = `${dados.marca} ${dados.modelo}${dados.versao ? ` ${dados.versao}` : ''}`
    ctx.font = 'bold 52px Inter, system-ui, sans-serif'
    ctx.fillStyle = WHITE
    ctx.textBaseline = 'top'
    ctx.fillText(titulo, PADDING, bottomY, SIZE - PADDING * 2)

    // Ano
    ctx.font = '32px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText(`${dados.ano} · ${dados.kmFormatado}`, PADDING, bottomY + 62)

    // Preço
    ctx.font = 'bold 64px Inter, system-ui, sans-serif'
    ctx.fillStyle = BRAND_GREEN
    ctx.fillText(dados.precoFormatado, PADDING, bottomY + 110)

    // Localização
    ctx.font = '28px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(`📍 ${dados.cidade}, ${dados.estado}`, PADDING, bottomY + 190)

    // ── Badges row ──
    let badgeX = PADDING
    const badgeY = bottomY + 235

    if (dados.ipvaPago) {
      badgeX += drawBadge(ctx, '✅ IPVA pago', badgeX, badgeY, 'rgba(255,255,255,0.15)', WHITE)
    }
    if (dados.revisoesEmDia) {
      badgeX += drawBadge(ctx, '✅ Revisado', badgeX, badgeY, 'rgba(255,255,255,0.15)', WHITE)
    }
    if (dados.semSinistro) {
      badgeX += drawBadge(ctx, '✅ Sem sinistro', badgeX, badgeY, 'rgba(255,255,255,0.15)', WHITE)
    }
    if (dados.seloStudioIa) {
      drawBadge(ctx, '✨ VenStudio IA', badgeX, badgeY, BRAND_GREEN, WHITE)
    }

    // ── Score circle (bottom-right) ──
    const circleX = SIZE - PADDING - 50
    const circleY = bottomY + 140
    const circleR = 44

    ctx.beginPath()
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2)
    ctx.fillStyle = OVERLAY_BG
    ctx.fill()

    // Score arc
    const scoreAngle = (dados.scoreConfianca / 100) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(circleX, circleY, circleR, -Math.PI / 2, -Math.PI / 2 + scoreAngle)
    ctx.strokeStyle = dados.scoreConfianca >= 90 ? '#16a34a' : dados.scoreConfianca >= 75 ? '#d97706' : '#dc2626'
    ctx.lineWidth = 5
    ctx.stroke()

    ctx.font = 'bold 28px Inter, system-ui, sans-serif'
    ctx.fillStyle = WHITE
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(dados.scoreConfianca), circleX, circleY)

    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('SCORE', circleX, circleY + 18)
    ctx.textAlign = 'left' // reset

    onReady?.(canvas)
  }, [dados, onReady])

  useEffect(() => {
    render()
  }, [render])

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[400px] aspect-square rounded-lg"
      style={{ imageRendering: 'auto' }}
    />
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export async function copyImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    })
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
    return true
  } catch {
    return false
  }
}
