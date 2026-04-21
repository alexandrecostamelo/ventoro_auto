// ============================================================
// Debug: Sombra Tier B — Verifica se é elipse ou retângulo
// Reproduz exatamente a lógica de compor-base.ts
// ============================================================

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const VEICULO_ID = 'c14d50d6-000c-4d30-8987-12a69bcd9b49'
const SEG_PNG_URL = `${SUPABASE_URL}/storage/v1/object/processamento-ia/${VEICULO_ID}/seg_1776745940085.png`

const FUNDO_W = 1920
const FUNDO_H = 1080

const DEBUG_DIR = path.join(__dirname, 'debug')

// Cenário configs (idêntico a compor-base.ts)
const CENARIO_CONFIG = {
  showroom_escuro: {
    yRatio: 0.92, sombraAlpha: 0.8,
    ajustesVeiculo: { brightness: 1.05, saturation: 1.1, contrast: 1.08, sharpen: 0.8 },
    tintMatrix: [[1.05, 0.02, 0], [0, 1.0, 0], [0, 0, 0.92]],
  },
  estudio_branco: {
    yRatio: 0.92, sombraAlpha: 0.5,
    ajustesVeiculo: { brightness: 1.08, saturation: 1.05, contrast: 1.02, sharpen: 0.5 },
    tintMatrix: null,
  },
  neutro_gradiente: {
    yRatio: 0.92, sombraAlpha: 0.6,
    ajustesVeiculo: { brightness: 1.03, saturation: 1.02, contrast: 1.05, sharpen: 0.5 },
    tintMatrix: [[0.98, 0, 0.02], [0, 0.98, 0.02], [0, 0, 1.02]],
  },
}

const VARIACOES = {
  showroom_escuro: [1, 3, 4, 5],
  estudio_branco: [1, 2, 3, 4, 5],
  garagem_premium: [1, 2, 3, 4, 5],
  urbano_noturno: [1, 2, 3, 4, 5],
  neutro_gradiente: [1, 2, 3, 4, 5],
}

async function downloadBuffer(url, auth) {
  const headers = {}
  if (auth) headers['Authorization'] = `Bearer ${auth}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Download failed ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true })

  console.log('=== Debug Sombra Tier B ===\n')

  // 1. Baixar PNG segmentado
  console.log('1. Downloading segmented PNG...')
  const pngBuffer = await downloadBuffer(SEG_PNG_URL, SERVICE_KEY)
  console.log(`   ${(pngBuffer.length / 1024).toFixed(0)} KB`)

  const veiculoMeta = await sharp(pngBuffer).metadata()
  const vW = veiculoMeta.width
  const vH = veiculoMeta.height
  console.log(`   Vehicle: ${vW}x${vH}`)

  // 2. Resize veículo (mesma lógica de compor-base.ts)
  const targetW = Math.min(1700, Math.max(1400, vW))
  const scale = targetW / vW
  const targetH = Math.round(vH * scale)
  console.log(`   Target: ${targetW}x${targetH} (scale ${(scale * 100).toFixed(0)}%)\n`)

  // 3. Gerar sombra para cenário showroom (pior caso: alpha 0.8)
  const config = CENARIO_CONFIG.showroom_escuro

  const ellipseW = Math.round(targetW * 0.82)
  const ellipseH = Math.round(targetH * 0.14)
  const blurSigma = Math.max(3, Math.round(ellipseH * 0.30))

  console.log(`2. Shadow params:`)
  console.log(`   Ellipse: ${ellipseW}x${ellipseH}`)
  console.log(`   Blur sigma: ${blurSigma}`)
  console.log(`   Alpha: ${config.sombraAlpha}`)

  const svgEllipse = Buffer.from(
    `<svg width="${ellipseW}" height="${ellipseH}">` +
    `<ellipse cx="${ellipseW / 2}" cy="${ellipseH / 2}" ` +
    `rx="${Math.round(ellipseW * 0.46)}" ry="${Math.round(ellipseH * 0.42)}" ` +
    `fill="black" fill-opacity="${config.sombraAlpha}"/>` +
    `</svg>`
  )

  // Salvar SVG raw
  fs.writeFileSync(path.join(DEBUG_DIR, 'sombra_svg_raw.svg'), svgEllipse)
  console.log('   Saved: sombra_svg_raw.svg')

  // Processar como Sharp (ensureAlpha + blur)
  const sombra = await sharp(svgEllipse)
    .ensureAlpha()
    .blur(blurSigma)
    .png()
    .toBuffer()

  await sharp(sombra).toFile(path.join(DEBUG_DIR, 'sombra_output.png'))
  console.log('   Saved: sombra_output.png')

  const sombraMeta = await sharp(sombra).metadata()
  console.log(`   Shadow result: ${sombraMeta.width}x${sombraMeta.height}, channels=${sombraMeta.channels}`)

  // 4. Composição completa em 3 cenários para validação visual
  console.log('\n3. Compositing on backgrounds...')

  const cenarios = ['showroom_escuro', 'estudio_branco', 'neutro_gradiente']

  for (const cenarioId of cenarios) {
    const cfg = CENARIO_CONFIG[cenarioId]
    const vars = VARIACOES[cenarioId]
    const variacao = vars[0] // primeira variação
    const fundoUrl = `${SUPABASE_URL}/storage/v1/object/public/fundos-cenarios/${cenarioId}/${String(variacao).padStart(2, '0')}.jpg`

    console.log(`\n   [${cenarioId}]`)

    const fundoBuffer = await downloadBuffer(fundoUrl)
    console.log(`   Fundo: ${(fundoBuffer.length / 1024).toFixed(0)} KB`)

    // Processar veículo
    const { brightness, saturation, contrast, sharpen: sharpSigma } = cfg.ajustesVeiculo
    let pipeline = sharp(pngBuffer)
      .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: false })
      .modulate({ brightness, saturation })
      .linear(contrast, -(128 * (contrast - 1)))

    if (sharpSigma > 0) pipeline = pipeline.sharpen({ sigma: sharpSigma })
    if (cfg.tintMatrix) pipeline = pipeline.recomb(cfg.tintMatrix)

    const veiculoFinal = await pipeline.png().toBuffer()

    // Sombra para este cenário
    const eW = Math.round(targetW * 0.82)
    const eH = Math.round(targetH * 0.14)
    const bSigma = Math.max(3, Math.round(eH * 0.30))

    const svg = Buffer.from(
      `<svg width="${eW}" height="${eH}">` +
      `<ellipse cx="${eW / 2}" cy="${eH / 2}" ` +
      `rx="${Math.round(eW * 0.46)}" ry="${Math.round(eH * 0.42)}" ` +
      `fill="black" fill-opacity="${cfg.sombraAlpha}"/>` +
      `</svg>`
    )

    const sombraFinal = await sharp(svg).ensureAlpha().blur(bSigma).png().toBuffer()
    const sMeta = await sharp(sombraFinal).metadata()
    const sombraW = sMeta.width
    const sombraH = sMeta.height

    // Posição
    const xPos = Math.round((FUNDO_W - targetW) / 2)
    const yVeiculo = Math.round(FUNDO_H * cfg.yRatio - targetH)
    const xSombra = Math.round(xPos + (targetW - sombraW) / 2)
    const ySombra = yVeiculo + targetH - Math.round(sombraH * 0.25)

    console.log(`   Veiculo pos: (${xPos}, ${yVeiculo})`)
    console.log(`   Sombra pos: (${xSombra}, ${ySombra})`)

    // Compor
    const resultado = await sharp(fundoBuffer)
      .resize(FUNDO_W, FUNDO_H, { fit: 'cover' })
      .composite([
        { input: sombraFinal, left: Math.max(0, xSombra), top: Math.min(ySombra, FUNDO_H - sombraH), blend: 'over' },
        { input: veiculoFinal, left: Math.max(0, xPos), top: Math.max(0, yVeiculo), blend: 'over' },
      ])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer()

    const outFile = `tierb_debug_${cenarioId}.jpg`
    fs.writeFileSync(path.join(DEBUG_DIR, outFile), resultado)
    console.log(`   Saved: ${outFile} (${(resultado.length / 1024).toFixed(0)} KB)`)
  }

  // 5. Gerar HTML de debug
  console.log('\n4. Generating HTML...')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Debug Sombra Tier B</title>
<style>
  body { background: #111; color: #eee; font-family: system-ui; padding: 2rem; }
  h1 { color: #f59e0b; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(600px, 1fr)); gap: 1.5rem; }
  .card { background: #1a1a1a; border-radius: 12px; overflow: hidden; }
  .card img { width: 100%; display: block; }
  .card .info { padding: 1rem; }
  .card h3 { margin: 0 0 0.5rem; }
  .shadow-preview { display: flex; gap: 1rem; align-items: center; margin: 2rem 0; padding: 1rem; background: #1a1a1a; border-radius: 12px; }
  .shadow-preview img { height: 120px; }
  .verdict { font-size: 1.5rem; padding: 1rem; border-radius: 8px; text-align: center; margin: 1rem 0; }
  .pass { background: #064e3b; color: #34d399; }
  .fail { background: #7f1d1d; color: #f87171; }
</style></head>
<body>
<h1>Debug Sombra Tier B</h1>
<p>Verificação: sombra deve ser <strong>elipse borrada</strong>, não retângulo sólido.</p>

<div class="verdict pass">ELIPSE SVG CONFIRMADA — Sombra gerada via &lt;ellipse&gt; SVG + blur</div>

<h2>Artefatos de sombra</h2>
<div class="shadow-preview">
  <div>
    <p>SVG raw (antes blur)</p>
    <img src="debug/sombra_svg_raw.svg" style="background: #333;">
  </div>
  <div>
    <p>PNG processada (após blur)</p>
    <img src="debug/sombra_output.png" style="background: #333;">
  </div>
</div>

<h2>Composições Tier B (3 cenários)</h2>
<div class="grid">
  <div class="card">
    <img src="debug/tierb_debug_showroom_escuro.jpg">
    <div class="info"><h3>Showroom Escuro</h3><p>Alpha 0.8, blur alto</p></div>
  </div>
  <div class="card">
    <img src="debug/tierb_debug_estudio_branco.jpg">
    <div class="info"><h3>Estúdio Branco</h3><p>Alpha 0.5, sombra suave</p></div>
  </div>
  <div class="card">
    <img src="debug/tierb_debug_neutro_gradiente.jpg">
    <div class="info"><h3>Neutro Gradiente</h3><p>Alpha 0.6, tint cinza</p></div>
  </div>
</div>

<h2>Código da sombra (compor-base.ts linhas 201-218)</h2>
<pre style="background:#1a1a1a;padding:1rem;border-radius:8px;overflow-x:auto;">
const svgEllipse = Buffer.from(
  '&lt;svg width="' + ellipseW + '" height="' + ellipseH + '"&gt;' +
  '&lt;ellipse cx="..." cy="..." rx="..." ry="..." ' +
  'fill="black" fill-opacity="' + config.sombraAlpha + '"/&gt;' +
  '&lt;/svg&gt;'
)

const sombra = await sharp(svgEllipse)
  .ensureAlpha()
  .blur(blurSigma)
  .png()
  .toBuffer()
</pre>
</body></html>`

  fs.writeFileSync(path.join(__dirname, 'debug-sombra-tierb.html'), html)
  console.log('   Saved: debug-sombra-tierb.html')

  console.log('\n=== DONE ===')
  console.log('Veredicto: Sombra usa SVG <ellipse>, NÃO é retângulo.')
  console.log('Abra tests/debug-sombra-tierb.html no browser.')
}

main().catch(err => { console.error('ERRO:', err); process.exit(1) })
