// ============================================================
// Teste Tier B Final — Composição nos 5 cenários aprovados
// Reproduz exatamente a lógica de compor-base.ts
// Gera HTML antes/depois para aprovação visual
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

const DEBUG_DIR = path.join(__dirname, 'debug-tierb')

// ── Cenário configs (IDÊNTICO a compor-base.ts) ──
const VARIACOES = {
  showroom_escuro: [1, 3, 4, 5],
  estudio_branco: [1, 2, 3, 4, 5],
  garagem_premium: [1, 2, 3, 4, 5],
  urbano_noturno: [1, 2, 3, 4, 5],
  neutro_gradiente: [1, 2, 3, 4, 5],
}

const CENARIO_CONFIG = {
  showroom_escuro: {
    nome: 'Showroom Escuro',
    yRatio: 0.92, sombraAlpha: 0.8,
    ajustesVeiculo: { brightness: 1.05, saturation: 1.1, contrast: 1.08, sharpen: 0.8 },
    tintMatrix: [[1.05, 0.02, 0], [0, 1.0, 0], [0, 0, 0.92]],
  },
  estudio_branco: {
    nome: 'Estúdio Branco',
    yRatio: 0.92, sombraAlpha: 0.5,
    ajustesVeiculo: { brightness: 1.08, saturation: 1.05, contrast: 1.02, sharpen: 0.5 },
    tintMatrix: null,
  },
  garagem_premium: {
    nome: 'Garagem Premium',
    yRatio: 0.92, sombraAlpha: 0.75,
    ajustesVeiculo: { brightness: 1.02, saturation: 1.08, contrast: 1.05, sharpen: 0.6 },
    tintMatrix: [[1.05, 0.02, 0], [0, 1.0, 0], [0, 0, 0.92]],
  },
  urbano_noturno: {
    nome: 'Urbano Noturno',
    yRatio: 0.92, sombraAlpha: 0.8,
    ajustesVeiculo: { brightness: 0.95, saturation: 1.15, contrast: 1.1, sharpen: 0.7 },
    tintMatrix: [[1.05, 0.02, 0], [0, 1.0, 0], [0, 0, 0.92]],
  },
  neutro_gradiente: {
    nome: 'Neutro Gradiente',
    yRatio: 0.92, sombraAlpha: 0.6,
    ajustesVeiculo: { brightness: 1.03, saturation: 1.02, contrast: 1.05, sharpen: 0.5 },
    tintMatrix: [[0.98, 0, 0.02], [0, 0.98, 0.02], [0, 0, 1.02]],
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

  console.log('=== Teste Tier B Final — 5 Cenários ===\n')

  // 1. Baixar assets
  console.log('1. Downloading assets...')
  const [pngBuffer, originalBuffer] = await Promise.all([
    downloadBuffer(SEG_PNG_URL, SERVICE_KEY),
    downloadBuffer(FOTO_ORIGINAL_URL),
  ])
  console.log(`   PNG seg: ${(pngBuffer.length / 1024).toFixed(0)} KB`)
  console.log(`   Original: ${(originalBuffer.length / 1024).toFixed(0)} KB`)

  // Salvar original para HTML
  fs.writeFileSync(path.join(DEBUG_DIR, 'original.jpg'), originalBuffer)

  const veiculoMeta = await sharp(pngBuffer).metadata()
  const vW = veiculoMeta.width
  const vH = veiculoMeta.height
  console.log(`   Vehicle: ${vW}x${vH}`)

  const targetW = Math.min(1700, Math.max(1400, vW))
  const scale = targetW / vW
  const targetH = Math.round(vH * scale)
  console.log(`   Target: ${targetW}x${targetH}\n`)

  const results = []

  // 2. Processar cada cenário
  const cenarios = Object.keys(CENARIO_CONFIG)

  for (const cenarioId of cenarios) {
    const config = CENARIO_CONFIG[cenarioId]
    const vars = VARIACOES[cenarioId]
    const variacao = vars[Math.floor(Math.random() * vars.length)]
    const fundoUrl = `${SUPABASE_URL}/storage/v1/object/public/fundos-cenarios/${cenarioId}/${String(variacao).padStart(2, '0')}.jpg`

    console.log(`=== ${config.nome} (${cenarioId}) ===`)

    const fundoBuffer = await downloadBuffer(fundoUrl)
    console.log(`   Fundo var ${variacao}: ${(fundoBuffer.length / 1024).toFixed(0)} KB`)

    // Processar veículo (mesma lógica de compor-base.ts)
    const { brightness, saturation, contrast, sharpen: sharpSigma } = config.ajustesVeiculo
    let pipeline = sharp(pngBuffer)
      .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: false })
      .modulate({ brightness, saturation })
      .linear(contrast, -(128 * (contrast - 1)))

    if (sharpSigma > 0) pipeline = pipeline.sharpen({ sigma: sharpSigma })
    if (config.tintMatrix) pipeline = pipeline.recomb(config.tintMatrix)

    const veiculoFinal = await pipeline.png().toBuffer()

    // Sombra elíptica
    const ellipseW = Math.round(targetW * 0.82)
    const ellipseH = Math.round(targetH * 0.14)
    const blurSigma = Math.max(3, Math.round(ellipseH * 0.30))

    const svgEllipse = Buffer.from(
      `<svg width="${ellipseW}" height="${ellipseH}">` +
      `<ellipse cx="${ellipseW / 2}" cy="${ellipseH / 2}" ` +
      `rx="${Math.round(ellipseW * 0.46)}" ry="${Math.round(ellipseH * 0.42)}" ` +
      `fill="black" fill-opacity="${config.sombraAlpha}"/>` +
      `</svg>`
    )

    const sombra = await sharp(svgEllipse).ensureAlpha().blur(blurSigma).png().toBuffer()
    const sombraMeta = await sharp(sombra).metadata()
    const sombraW = sombraMeta.width
    const sombraH = sombraMeta.height

    // Posição (sem random offset para consistência de teste)
    const xPos = Math.round((FUNDO_W - targetW) / 2)
    const yVeiculo = Math.round(FUNDO_H * config.yRatio - targetH)
    const xSombra = Math.round(xPos + (targetW - sombraW) / 2)
    const ySombra = yVeiculo + targetH - Math.round(sombraH * 0.25)

    console.log(`   Position: car(${xPos}, ${yVeiculo}) shadow(${xSombra}, ${ySombra})`)

    // Verificar se carro fica cortado
    const cortadoTopo = yVeiculo < 0
    const cortadoBaixo = yVeiculo + targetH > FUNDO_H
    if (cortadoTopo) console.log(`   ⚠ CORTE TOPO: ${-yVeiculo}px cortados`)
    if (cortadoBaixo) console.log(`   ⚠ CORTE BAIXO: ${(yVeiculo + targetH) - FUNDO_H}px cortados`)

    // Compor
    const resultado = await sharp(fundoBuffer)
      .resize(FUNDO_W, FUNDO_H, { fit: 'cover' })
      .composite([
        { input: sombra, left: Math.max(0, xSombra), top: Math.min(ySombra, FUNDO_H - sombraH), blend: 'over' },
        { input: veiculoFinal, left: Math.max(0, xPos), top: Math.max(0, yVeiculo), blend: 'over' },
      ])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer()

    const outFile = `tierb_${cenarioId}.jpg`
    fs.writeFileSync(path.join(DEBUG_DIR, outFile), resultado)
    console.log(`   Output: ${outFile} (${(resultado.length / 1024).toFixed(0)} KB)`)

    results.push({
      cenarioId,
      nome: config.nome,
      variacao,
      file: outFile,
      sizeKb: Math.round(resultado.length / 1024),
      cortadoTopo,
      cortadoBaixo,
      yVeiculo,
    })
  }

  // 3. Gerar HTML
  console.log('\n=== Generating HTML ===')

  const cards = results.map(r => `
    <div class="card">
      <div class="label">${r.nome} <span style="opacity:0.5">(var ${r.variacao})</span></div>
      <img src="debug-tierb/${r.file}" alt="${r.nome}">
      <div class="info">
        ${r.cortadoTopo ? `<span class="warn">⚠ Topo cortado (${-r.yVeiculo}px)</span>` : '<span class="ok">✓ Sem corte</span>'}
        · ${r.sizeKb} KB
      </div>
    </div>
  `).join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Tier B Final — 5 Cenários</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { background: #0a0a0a; color: #e5e5e5; font-family: system-ui, -apple-system, sans-serif; padding: 2rem; }
  h1 { font-size: 1.5rem; color: #f59e0b; margin-bottom: 0.5rem; }
  .subtitle { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
  .original-section { margin-bottom: 2rem; padding: 1rem; background: #141414; border-radius: 12px; }
  .original-section img { max-width: 400px; border-radius: 8px; }
  .original-section h2 { font-size: 1rem; margin-bottom: 0.5rem; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
  @media (min-width: 1200px) { .grid { grid-template-columns: 1fr 1fr; } }
  .card { background: #141414; border-radius: 12px; overflow: hidden; border: 1px solid #222; }
  .card img { width: 100%; display: block; }
  .card .label { padding: 0.75rem 1rem; font-weight: 600; font-size: 0.95rem; border-bottom: 1px solid #222; }
  .card .info { padding: 0.5rem 1rem; font-size: 0.8rem; color: #888; }
  .warn { color: #f59e0b; font-weight: 600; }
  .ok { color: #34d399; }
  .summary { margin-top: 2rem; padding: 1rem; background: #141414; border-radius: 12px; }
  .summary h2 { font-size: 1rem; margin-bottom: 0.5rem; }
  .summary table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .summary th, .summary td { text-align: left; padding: 0.4rem 0.8rem; border-bottom: 1px solid #222; }
  .summary th { color: #888; font-weight: 500; }
</style></head>
<body>
<h1>Tier B Final — 5 Cenários Aprovados</h1>
<p class="subtitle">Honda Fit · Composição Sharp determinística · Sombra SVG ellipse · ${new Date().toISOString().split('T')[0]}</p>

<div class="original-section">
  <h2>Foto Original</h2>
  <img src="debug-tierb/original.jpg" alt="Original">
</div>

<div class="grid">
${cards}
</div>

<div class="summary">
  <h2>Resumo</h2>
  <table>
    <tr><th>Cenário</th><th>Variação</th><th>Tamanho</th><th>Corte?</th></tr>
    ${results.map(r => `<tr>
      <td>${r.nome}</td>
      <td>${r.variacao}</td>
      <td>${r.sizeKb} KB</td>
      <td>${r.cortadoTopo ? `<span class="warn">Topo: ${-r.yVeiculo}px</span>` : '<span class="ok">OK</span>'}</td>
    </tr>`).join('\n    ')}
  </table>
</div>

<div class="summary" style="margin-top:1rem;">
  <h2>Diagnóstico Sombra</h2>
  <p style="color:#34d399;">✓ Sombra gerada via SVG &lt;ellipse&gt; + blur. Sem retângulo preto.</p>
  <p style="color:#888; font-size:0.85rem; margin-top:0.5rem;">
    Elipse: ${Math.round(targetW * 0.82)}x${Math.round(targetH * 0.14)}px ·
    Blur: ${Math.max(3, Math.round(Math.round(targetH * 0.14) * 0.30))}px
  </p>
</div>

<div class="summary" style="margin-top:1rem;">
  <h2>Bugs Prioridade 1</h2>
  <table>
    <tr><td>1.1 Retângulo preto Tier B</td><td><span class="ok">✓ CORRIGIDO</span> — SVG ellipse</td></tr>
    <tr><td>1.2 Faixa preta Tier C (Externo)</td><td><span class="ok">✓ RESOLVIDO</span> — sem composite extra; artefato do Flux Fill; cenário removido</td></tr>
    <tr><td>1.3 Cenário Neutro</td><td><span class="ok">✓ RESTAURADO</span> — luxury_outdoor → neutro_gradiente em 5 arquivos</td></tr>
  </table>
</div>

${results.some(r => r.cortadoTopo) ? `
<div class="summary" style="margin-top:1rem; border: 1px solid #f59e0b;">
  <h2 style="color:#f59e0b;">⚠ Nota: Corte no topo</h2>
  <p style="font-size:0.85rem; color:#ccc;">
    Com yRatio=0.92 e veículo de ${targetH}px de altura no canvas 1080px,
    o topo é cortado em ${-results[0].yVeiculo}px.
    Será ajustado na Prioridade 2 (yRatio + escala).
  </p>
</div>
` : ''}

</body></html>`

  fs.writeFileSync(path.join(__dirname, 'tierb-final.html'), html)
  console.log('Saved: tests/tierb-final.html')

  console.log('\n=== DONE ===')
  console.log(`5/5 cenários compostos. ${results.filter(r => r.cortadoTopo).length} com corte no topo (fix na Prioridade 2).`)
  console.log('Abra tests/tierb-final.html no browser.')
}

main().catch(err => { console.error('ERRO:', err); process.exit(1) })
