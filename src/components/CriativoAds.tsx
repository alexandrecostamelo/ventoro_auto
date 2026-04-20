import { useRef, useEffect, useCallback } from 'react'

// ============================================================
// CriativoAds — Canvas multi-formato para criativos de ads
// Formatos: feed (1080x1080), stories (1080x1920), display (300x250)
// ============================================================

export type AdFormato = 'feed' | 'stories' | 'google_display'

export interface AdDados {
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
  copyPrimaria: string
  copySecundaria: string
  cta: string
}

interface Props {
  dados: AdDados
  formato: AdFormato
  onReady?: (canvas: HTMLCanvasElement) => void
}

const FORMATO_SIZE: Record<AdFormato, { w: number; h: number }> = {
  feed: { w: 1080, h: 1080 },
  stories: { w: 1080, h: 1920 },
  google_display: { w: 300, h: 250 },
}

const BRAND_GREEN = '#1a9e6d'
const BRAND_DARK = '#0d1b16'
const WHITE = '#ffffff'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath()
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number, maxLines: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length >= maxLines) break
    } else {
      current = test
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines
}

// ── Feed (1080x1080) ──────────────────────────────────────────────────

async function renderFeed(ctx: CanvasRenderingContext2D, dados: AdDados) {
  const W = 1080, H = 1080, P = 48

  ctx.fillStyle = BRAND_DARK
  ctx.fillRect(0, 0, W, H)

  // Photo
  if (dados.fotoUrl) {
    try {
      const img = await loadImage(dados.fotoUrl)
      const ratio = Math.max(W / img.width, H / img.height)
      const iw = img.width * ratio, ih = img.height * ratio
      ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2 - 50, iw, ih)
    } catch { /* fallback gradient */ }
  }

  // Bottom gradient
  const grad = ctx.createLinearGradient(0, H * 0.4, 0, H)
  grad.addColorStop(0, 'rgba(13,27,22,0)')
  grad.addColorStop(0.5, 'rgba(13,27,22,0.7)')
  grad.addColorStop(1, 'rgba(13,27,22,0.95)')
  ctx.fillStyle = grad
  ctx.fillRect(0, H * 0.4, W, H * 0.6)

  // Logo
  ctx.fillStyle = 'rgba(13,27,22,0.85)'
  roundRect(ctx, P, P, 200, 48, 24); ctx.fill()
  ctx.font = 'bold 26px Inter, system-ui, sans-serif'
  ctx.fillStyle = BRAND_GREEN; ctx.textBaseline = 'middle'
  ctx.fillText('VENTORO', P + 20, P + 24)

  // Title
  const bY = H - 340
  const titulo = `${dados.marca} ${dados.modelo} ${dados.ano}`
  ctx.font = 'bold 48px Inter, system-ui, sans-serif'
  ctx.fillStyle = WHITE; ctx.textBaseline = 'top'
  ctx.fillText(titulo, P, bY, W - P * 2)

  // Price
  ctx.font = 'bold 56px Inter, system-ui, sans-serif'
  ctx.fillStyle = BRAND_GREEN
  ctx.fillText(dados.precoFormatado, P, bY + 65)

  // Copy primária
  ctx.font = '24px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  const lines = wrapText(ctx, dados.copyPrimaria, W - P * 2, 30, 3)
  lines.forEach((l, i) => ctx.fillText(l, P, bY + 145 + i * 30))

  // CTA button
  const ctaY = H - 90
  ctx.fillStyle = BRAND_GREEN
  roundRect(ctx, P, ctaY, 260, 50, 25); ctx.fill()
  ctx.font = 'bold 22px Inter, system-ui, sans-serif'
  ctx.fillStyle = WHITE; ctx.textBaseline = 'middle'
  ctx.fillText(dados.cta, P + 30, ctaY + 25)

  // Location
  ctx.font = '20px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(`📍 ${dados.cidade}, ${dados.estado}`, P + 290, ctaY + 25)

  // FIPE badge
  if (dados.precoStatus === 'abaixo') {
    ctx.fillStyle = '#16a34a'
    roundRect(ctx, W - P - 220, P, 220, 44, 22); ctx.fill()
    ctx.font = 'bold 20px Inter, system-ui, sans-serif'
    ctx.fillStyle = WHITE
    ctx.fillText('▼ Abaixo da FIPE', W - P - 200, P + 22)
  }
}

// ── Stories (1080x1920) ───────────────────────────────────────────────

async function renderStories(ctx: CanvasRenderingContext2D, dados: AdDados) {
  const W = 1080, H = 1920, P = 56

  ctx.fillStyle = BRAND_DARK
  ctx.fillRect(0, 0, W, H)

  // Photo (upper 60%)
  if (dados.fotoUrl) {
    try {
      const img = await loadImage(dados.fotoUrl)
      const zone = H * 0.6
      const ratio = Math.max(W / img.width, zone / img.height)
      const iw = img.width * ratio, ih = img.height * ratio
      ctx.drawImage(img, (W - iw) / 2, (zone - ih) / 2, iw, ih)
    } catch { /* */ }
  }

  // Gradient overlay
  const grad = ctx.createLinearGradient(0, H * 0.35, 0, H)
  grad.addColorStop(0, 'rgba(13,27,22,0)')
  grad.addColorStop(0.3, 'rgba(13,27,22,0.8)')
  grad.addColorStop(1, 'rgba(13,27,22,0.98)')
  ctx.fillStyle = grad
  ctx.fillRect(0, H * 0.35, W, H * 0.65)

  // Logo top
  ctx.font = 'bold 30px Inter, system-ui, sans-serif'
  ctx.fillStyle = BRAND_GREEN; ctx.textBaseline = 'middle'
  ctx.fillText('VENTORO', P, 70)

  // Content area
  const cY = H * 0.58

  // Headline
  ctx.font = 'bold 22px Inter, system-ui, sans-serif'
  ctx.fillStyle = BRAND_GREEN; ctx.textBaseline = 'top'
  ctx.fillText(dados.copySecundaria.toUpperCase(), P, cY, W - P * 2)

  // Title
  const titulo = `${dados.marca} ${dados.modelo}`
  ctx.font = 'bold 60px Inter, system-ui, sans-serif'
  ctx.fillStyle = WHITE
  ctx.fillText(titulo, P, cY + 40, W - P * 2)

  // Versão + Ano
  if (dados.versao) {
    ctx.font = '32px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(`${dados.versao} · ${dados.ano}`, P, cY + 110)
  } else {
    ctx.font = '32px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(`${dados.ano} · ${dados.kmFormatado}`, P, cY + 110)
  }

  // Price (big)
  ctx.font = 'bold 72px Inter, system-ui, sans-serif'
  ctx.fillStyle = BRAND_GREEN
  ctx.fillText(dados.precoFormatado, P, cY + 170)

  // Copy
  ctx.font = '26px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  const lines = wrapText(ctx, dados.copyPrimaria, W - P * 2, 34, 2)
  lines.forEach((l, i) => ctx.fillText(l, P, cY + 275 + i * 34))

  // CTA
  const ctaY = H - 200
  ctx.fillStyle = BRAND_GREEN
  roundRect(ctx, P, ctaY, W - P * 2, 70, 35); ctx.fill()
  ctx.font = 'bold 28px Inter, system-ui, sans-serif'
  ctx.fillStyle = WHITE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(`${dados.cta} ↑`, W / 2, ctaY + 35)
  ctx.textAlign = 'left'

  // Location
  ctx.font = '22px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.textAlign = 'center'
  ctx.fillText(`📍 ${dados.cidade}, ${dados.estado}`, W / 2, H - 100)
  ctx.textAlign = 'left'
}

// ── Google Display (300x250) ──────────────────────────────────────────

async function renderDisplay(ctx: CanvasRenderingContext2D, dados: AdDados) {
  const W = 300, H = 250, P = 12

  // Background
  ctx.fillStyle = WHITE
  ctx.fillRect(0, 0, W, H)

  // Photo (top half)
  if (dados.fotoUrl) {
    try {
      const img = await loadImage(dados.fotoUrl)
      const zone = 130
      const ratio = Math.max(W / img.width, zone / img.height)
      const iw = img.width * ratio, ih = img.height * ratio
      ctx.save()
      ctx.rect(0, 0, W, zone); ctx.clip()
      ctx.drawImage(img, (W - iw) / 2, (zone - ih) / 2, iw, ih)
      ctx.restore()
    } catch { /* */ }
  }

  // Dark overlay on photo
  const grad = ctx.createLinearGradient(0, 80, 0, 130)
  grad.addColorStop(0, 'rgba(13,27,22,0)')
  grad.addColorStop(1, 'rgba(13,27,22,0.7)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 80, W, 50)

  // Price on photo
  ctx.font = 'bold 18px Inter, system-ui, sans-serif'
  ctx.fillStyle = WHITE; ctx.textBaseline = 'bottom'
  ctx.fillText(dados.precoFormatado, P, 126)

  // FIPE label
  if (dados.precoStatus === 'abaixo') {
    ctx.font = 'bold 9px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#16a34a'
    const fW = ctx.measureText('ABAIXO FIPE').width + 8
    ctx.fillStyle = '#16a34a'
    roundRect(ctx, W - P - fW, 112, fW, 16, 4); ctx.fill()
    ctx.fillStyle = WHITE; ctx.textBaseline = 'middle'
    ctx.fillText('ABAIXO FIPE', W - P - fW + 4, 120)
  }

  // Info area
  const iY = 138
  ctx.textBaseline = 'top'

  // Title
  const titulo = `${dados.marca} ${dados.modelo} ${dados.ano}`
  ctx.font = 'bold 14px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#1a1a1a'
  ctx.fillText(titulo, P, iY, W - P * 2)

  // Headline
  ctx.font = '11px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#666'
  const headLines = wrapText(ctx, dados.copySecundaria, W - P * 2, 14, 2)
  headLines.forEach((l, i) => ctx.fillText(l, P, iY + 20 + i * 14))

  // Location
  ctx.font = '10px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#999'
  ctx.fillText(`${dados.cidade}, ${dados.estado} · ${dados.kmFormatado}`, P, iY + 52)

  // CTA button
  ctx.fillStyle = BRAND_GREEN
  roundRect(ctx, P, H - 36, 100, 26, 13); ctx.fill()
  ctx.font = 'bold 11px Inter, system-ui, sans-serif'
  ctx.fillStyle = WHITE; ctx.textBaseline = 'middle'
  ctx.fillText(dados.cta, P + 12, H - 23)

  // Logo
  ctx.font = 'bold 11px Inter, system-ui, sans-serif'
  ctx.fillStyle = BRAND_GREEN
  ctx.fillText('VENTORO', W - P - 55, H - 23)

  // Border
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
}

// ── Componente principal ──────────────────────────────────────────────

export default function CriativoAds({ dados, formato, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = FORMATO_SIZE[formato]

  const render = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = size.w
    canvas.height = size.h
    const ctx = canvas.getContext('2d')!

    if (formato === 'feed') await renderFeed(ctx, dados)
    else if (formato === 'stories') await renderStories(ctx, dados)
    else await renderDisplay(ctx, dados)

    onReady?.(canvas)
  }, [dados, formato, size, onReady])

  useEffect(() => { render() }, [render])

  // Scale preview to fit screen
  const maxPreviewW = formato === 'google_display' ? 300 : 360
  const scale = maxPreviewW / size.w
  const previewH = size.h * scale

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-border"
      style={{
        width: `${maxPreviewW}px`,
        height: `${previewH}px`,
        imageRendering: 'auto',
      }}
    />
  )
}

export function downloadAdCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}
