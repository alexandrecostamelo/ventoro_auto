// ============================================================
// Teste Tier B v2 — Sombra adaptativa por cenário
// Reproduz compor-base.ts com novo sistema de sombra
// ============================================================

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const VEICULO_ID = 'c14d50d6-000c-4d30-8987-12a69bcd9b49'
const FOTO_ORIGINAL_URL = `${SUPABASE_URL}/storage/v1/object/public/fotos-veiculos/${VEICULO_ID}/0.jpg`
const SEG_PNG_URL = `${SUPABASE_URL}/storage/v1/object/processamento-ia/${VEICULO_ID}/seg_1776745940085.png`

const FUNDO_W = 1920
const FUNDO_H = 1080
const DEBUG_DIR = path.join(__dirname, 'debug-tierb-v2')

const VARIACOES = {
  showroom_escuro: [1, 3, 4, 5],
  estudio_branco: [1, 2, 3, 4, 5],
  garagem_premium: [1, 2, 3, 4, 5],
  urbano_noturno: [1, 2, 3, 4, 5],
  neutro_gradiente: [1, 2, 3, 4, 5],
}

// ── Config IDÊNTICA a compor-base.ts (com sombra adaptativa) ──
const CENARIO_CONFIG = {
  showroom_escuro: {
    nome: 'Showroom Escuro',
    yRatio: 0.92,
    ajustesVeiculo: { brightness: 1.05, saturation: 1.1, contrast: 1.08, sharpen: 0.8 },
    tintMatrix: [[1.05, 0.02, 0], [0, 1.0, 0], [0, 0, 0.92]],
    sombra: { cor: '#000000', opacidade: 0.65, blur: 50, blend: 'multiply' },
  },
  estudio_branco: {
    nome: 'Estúdio Branco',
    yRatio: 0.92,
    ajustesVeiculo: { brightness: 1.08, saturation: 1.05, contrast: 1.02, sharpen: 0.5 },
    tintMatrix: null,
    sombra: { cor: '#333333', opacidade: 0.35, blur: 40, blend: 'over' },
  },
  garagem_premium: {
    nome: 'Garagem Premium',
    yRatio: 0.92,
    ajustesVeiculo: { brightness: 1.02, saturation: 1.08, contrast: 1.05, sharpen: 0.6 },
    tintMatrix: [[1.05, 0.02, 0], [0, 1.0, 0], [0, 0, 0.92]],
    sombra: { cor: '#1a0f00', opacidade: 0.55, blur: 50, blend: 'multiply' },
  },
  urbano_noturno: {
    nome: 'Urbano Noturno',
    yRatio: 0.92,
    ajustesVeiculo: { brightness: 0.95, saturation: 1.15, contrast: 1.1, sharpen: 0.7 },
    tintMatrix: [[1.05, 0.02, 0], [0, 1.0, 0], [0, 0, 0.92]],
    sombra: { cor: '#000000', opacidade: 0.7, blur: 45, blend: 'multiply' },
  },
  neutro_gradiente: {
    nome: 'Neutro Gradiente',
    yRatio: 0.92,
    ajustesVeiculo: { brightness: 1.03, saturation: 1.02, contrast: 1.05, sharpen: 0.5 },
    tintMatrix: [[0.98, 0, 0.02], [0, 0.98, 0.02], [0, 0, 1.02]],
    sombra: { cor: '#000000', opacidade: 0.45, blur: 55, blend: 'over' },
  },
}

async function downloadBuffer(url, auth) {
  const headers = {}
  if (auth) headers['Authorization'] = `Bearer ${auth}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url.substring(0, 80)}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true })

  console.log('=== Teste Tier B v2 — Sombra Adaptativa ===\n')

  // 1. Baixar assets
  console.log('1. Downloading assets...')
  const [pngBuffer, originalBuffer] = await Promise.all([
    downloadBuffer(SEG_PNG_URL, SERVICE_KEY),
    downloadBuffer(FOTO_ORIGINAL_URL),
  ])
  console.log(`   PNG seg: ${(pngBuffer.length / 1024).toFixed(0)} KB`)

  fs.writeFileSync(path.join(DEBUG_DIR, 'original.jpg'), originalBuffer)

  const veiculoMeta = await sharp(pngBuffer).metadata()
  const vW = veiculoMeta.width
  const vH = veiculoMeta.height

  const targetW = Math.min(1700, Math.max(1400, vW))
  const scale = targetW / vW
  const targetH = Math.round(vH * scale)
  console.log(`   Vehicle: ${vW}x${vH} → ${targetW}x${targetH}\n`)

  const results = []
  const cenarios = Object.keys(CENARIO_CONFIG)

  for (const cenarioId of cenarios) {
    const config = CENARIO_CONFIG[cenarioId]
    const vars = VARIACOES[cenarioId]
    const variacao = vars[0] // primeira variação para consistência
    const fundoUrl = `${SUPABASE_URL}/storage/v1/object/public/fundos-cenarios/${cenarioId}/${String(variacao).padStart(2, '0')}.jpg`

    console.log(`=== ${config.nome} ===`)
    console.log(`   Sombra: cor=${config.sombra.cor} opac=${config.sombra.opacidade} blur=${config.sombra.blur} blend=${config.sombra.blend}`)

    const fundoBuffer = await downloadBuffer(fundoUrl)

    // Processar veículo
    const { brightness, saturation, contrast, sharpen: sharpSigma } = config.ajustesVeiculo
    let pipeline = sharp(pngBuffer)
      .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: false })
      .modulate({ brightness, saturation })
      .linear(contrast, -(128 * (contrast - 1)))

    if (sharpSigma > 0) pipeline = pipeline.sharpen({ sigma: sharpSigma })
    if (config.tintMatrix) pipeline = pipeline.recomb(config.tintMatrix)

    const veiculoFinal = await pipeline.png().toBuffer()

    // Sombra adaptativa (exatamente como compor-base.ts)
    const { cor: sombraCor, opacidade: sombraOpacidade, blur: sombraBlur, blend: sombraBlend } = config.sombra
    const ellipseW = Math.round(targetW * 0.82)
    const ellipseH = Math.round(targetH * 0.14)

    const svgEllipse = Buffer.from(
      `<svg width="${ellipseW}" height="${ellipseH}">` +
      `<ellipse cx="${ellipseW / 2}" cy="${ellipseH / 2}" ` +
      `rx="${Math.round(ellipseW * 0.46)}" ry="${Math.round(ellipseH * 0.42)}" ` +
      `fill="${sombraCor}" fill-opacity="${sombraOpacidade}"/>` +
      `</svg>`
    )

    const sombra = await sharp(svgEllipse)
      .ensureAlpha()
      .blur(Math.max(3, sombraBlur))
      .png()
      .toBuffer()

    // Salvar sombra isolada para debug
    await sharp(sombra).toFile(path.join(DEBUG_DIR, `sombra_${cenarioId}.png`))

    const sombraMeta = await sharp(sombra).metadata()
    const sombraW = sombraMeta.width
    const sombraH = sombraMeta.height

    // Posição
    const xPos = Math.round((FUNDO_W - targetW) / 2)
    const yVeiculo = Math.round(FUNDO_H * config.yRatio - targetH)
    const xSombra = Math.round(xPos + (targetW - sombraW) / 2)
    const ySombra = yVeiculo + targetH - Math.round(sombraH * 0.25)

    const cortadoTopo = yVeiculo < 0

    // Compor
    const resultado = await sharp(fundoBuffer)
      .resize(FUNDO_W, FUNDO_H, { fit: 'cover' })
      .composite([
        {
          input: sombra,
          left: Math.max(0, xSombra),
          top: Math.min(ySombra, FUNDO_H - sombraH),
          blend: sombraBlend,
        },
        {
          input: veiculoFinal,
          left: Math.max(0, xPos),
          top: Math.max(0, yVeiculo),
          blend: 'over',
        },
      ])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer()

    const outFile = `tierb_${cenarioId}.jpg`
    fs.writeFileSync(path.join(DEBUG_DIR, outFile), resultado)
    console.log(`   Output: ${outFile} (${(resultado.length / 1024).toFixed(0)} KB)`)
    if (cortadoTopo) console.log(`   ⚠ Corte topo: ${-yVeiculo}px`)

    results.push({
      cenarioId, nome: config.nome, variacao, file: outFile,
      sizeKb: Math.round(resultado.length / 1024),
      cortadoTopo, yVeiculo,
      sombra: config.sombra,
    })
  }

  // HTML
  console.log('\n=== Generating HTML ===')

  const cards = results.map(r => `
    <div class="card">
      <div class="label">
        ${r.nome}
        <span class="shadow-tag ${r.sombra.blend}">${r.sombra.blend} · ${r.sombra.cor} · opac ${r.sombra.opacidade} · blur ${r.sombra.blur}</span>
      </div>
      <img src="debug-tierb-v2/${r.file}" alt="${r.nome}">
      <div class="info">
        <img src="debug-tierb-v2/sombra_${r.cenarioId}.png" class="shadow-preview" alt="sombra">
        <span>Sombra isolada ↑</span>
        ${r.cortadoTopo ? ` · <span class="warn">Topo: ${-r.yVeiculo}px cortado</span>` : ''}
      </div>
    </div>
  `).join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Tier B v2 — Sombra Adaptativa</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { background: #0a0a0a; color: #e5e5e5; font-family: system-ui, -apple-system, sans-serif; padding: 2rem; }
  h1 { font-size: 1.5rem; color: #f59e0b; margin-bottom: 0.3rem; }
  h2 { font-size: 1.1rem; margin: 1.5rem 0 0.75rem; color: #ccc; }
  .subtitle { color: #888; font-size: 0.85rem; margin-bottom: 2rem; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
  @media (min-width: 1400px) { .grid { grid-template-columns: 1fr 1fr; } }
  .card { background: #141414; border-radius: 12px; overflow: hidden; border: 1px solid #222; }
  .card img { width: 100%; display: block; }
  .card .label { padding: 0.75rem 1rem; font-weight: 600; font-size: 0.95rem; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
  .shadow-tag { font-size: 0.7rem; font-weight: 400; padding: 2px 8px; border-radius: 4px; }
  .shadow-tag.multiply { background: #1e293b; color: #93c5fd; }
  .shadow-tag.over { background: #1c1917; color: #fdba74; }
  .card .info { padding: 0.5rem 1rem; font-size: 0.8rem; color: #888; display: flex; align-items: center; gap: 0.5rem; }
  .shadow-preview { width: 200px !important; height: 30px !important; object-fit: contain; background: #333; border-radius: 4px; }
  .warn { color: #f59e0b; }
  .ok { color: #34d399; }
  .original { max-width: 400px; border-radius: 12px; border: 1px solid #222; margin-bottom: 1.5rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }
  th, td { text-align: left; padding: 0.4rem 0.8rem; border-bottom: 1px solid #222; }
  th { color: #888; font-weight: 500; }
  .panel { background: #141414; border-radius: 12px; padding: 1rem; margin-top: 1.5rem; border: 1px solid #222; }
</style></head>
<body>
<h1>Tier B v2 — Sombra Adaptativa por Cenário</h1>
<p class="subtitle">Honda Fit · ${new Date().toISOString().split('T')[0]} · Cada cenário tem cor, opacidade, blur e blend mode calibrados individualmente</p>

<h2>Foto Original</h2>
<img src="debug-tierb-v2/original.jpg" class="original" alt="Original">

<h2>Composições (5 cenários)</h2>
<div class="grid">
${cards}
</div>

<div class="panel">
  <h2 style="margin-top:0;">Config de Sombra por Cenário</h2>
  <table>
    <tr><th>Cenário</th><th>Cor</th><th>Opacidade</th><th>Blur</th><th>Blend</th><th>Motivo</th></tr>
    <tr><td>Showroom Escuro</td><td>#000000</td><td>0.65</td><td>50px</td><td>multiply</td><td>Fundo escuro: multiply escurece naturalmente</td></tr>
    <tr><td>Estúdio Branco</td><td><strong>#333333</strong></td><td>0.35</td><td>40px</td><td><strong>over</strong></td><td>Fundo branco: cinza escuro com over cria sombra visível</td></tr>
    <tr><td>Garagem Premium</td><td>#1a0f00</td><td>0.55</td><td>50px</td><td>multiply</td><td>Tom warm: sombra com tint âmbar</td></tr>
    <tr><td>Urbano Noturno</td><td>#000000</td><td>0.70</td><td>45px</td><td>multiply</td><td>Asfalto molhado: sombra forte</td></tr>
    <tr><td>Neutro Gradiente</td><td>#000000</td><td>0.45</td><td>55px</td><td><strong>over</strong></td><td>Gradiente escuro: over deposita sombra sobre qualquer luminosidade</td></tr>
  </table>
</div>

<div class="panel">
  <h2 style="margin-top:0;">Checklist de Aprovação</h2>
  <table>
    <tr><td>Showroom Escuro</td><td>Sombra visível no piso polido?</td><td>___</td></tr>
    <tr><td>Estúdio Branco</td><td>Sombra cinza visível no branco? Carro não flutua?</td><td>___</td></tr>
    <tr><td>Garagem Premium</td><td>Sombra warm no concreto?</td><td>___</td></tr>
    <tr><td>Urbano Noturno</td><td>Sombra forte no asfalto?</td><td>___</td></tr>
    <tr><td>Neutro Gradiente</td><td>Sombra visível no gradiente? Carro ancorado?</td><td>___</td></tr>
  </table>
</div>

${results.some(r => r.cortadoTopo) ? `
<div class="panel" style="border-color: #f59e0b;">
  <h2 style="margin-top:0; color: #f59e0b;">⚠ Nota: Corte no topo</h2>
  <p style="font-size:0.85rem;">yRatio=0.92 com veículo de ${targetH}px causa corte de ${-results[0].yVeiculo}px no topo. Será ajustado na Prioridade 2 (reduzir escala ou yRatio).</p>
</div>
` : ''}

</body></html>`

  fs.writeFileSync(path.join(__dirname, 'tierb-v2.html'), html)
  console.log('Saved: tests/tierb-v2.html')
  console.log('\n=== DONE ===')
  console.log('Abra tests/tierb-v2.html no browser pra aprovar.')
}

main().catch(err => { console.error('ERRO:', err); process.exit(1) })
