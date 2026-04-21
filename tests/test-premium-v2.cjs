// ============================================================
// VenStudio Premium V2 — Teste end-to-end
// Testa o novo pipeline async com os 5 presets
// Simula: create job → poll status → avaliar resultado
// ============================================================

const sharp = require('sharp')
const phash = require('sharp-phash')
const phashDistance = require('sharp-phash/distance')
const fs = require('fs')
const path = require('path')

// ── Config ──
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || ''

const VEICULO_ID = 'c14d50d6-000c-4d30-8987-12a69bcd9b49'
const FOTO_ORIGINAL_URL = `${SUPABASE_URL}/storage/v1/object/public/fotos-veiculos/${VEICULO_ID}/0.jpg`
const SEG_PNG_URL = `${SUPABASE_URL}/storage/v1/object/processamento-ia/${VEICULO_ID}/seg_1776745940085.png`

const CANVAS_SIZE = 1024
const DILATION_PX = 12
const FEATHER_SIGMA = 3
const PHASH_THRESHOLD = 10
const CUSTO_POR_GERACAO = 0.05
const CAMBIO_USD_BRL = 5.80

const DEBUG_DIR = path.join(__dirname, 'debug-v2')

// ── Presets V2 (idênticos ao endpoint) ──
const PRESETS = {
  luxury_showroom: {
    nome: 'Showroom',
    prompt: 'Empty modern car dealership interior, dark polished tile floor with subtle reflections, clean recessed ceiling lights, smooth dark gray walls, spacious open room, even soft ambient lighting, no furniture, no decorations, no text, no logos, no other vehicles, photorealistic photograph',
    guidance: 15, steps: 40,
  },
  premium_studio: {
    nome: 'Estúdio',
    prompt: 'Empty bright white room, seamless white floor blending into white walls, soft diffused overhead lighting creating gentle shadows on floor, clean and minimal, bright luminous atmosphere, no equipment, no furniture, no decorations, no text, no logos, photorealistic commercial photograph',
    guidance: 12, steps: 40,
  },
  modern_garage: {
    nome: 'Garagem',
    prompt: 'Clean empty garage interior, smooth concrete floor, warm overhead lighting, plain concrete walls, simple industrial space, no tools, no clutter, no shelves, no text, no logos, no other vehicles, photorealistic photograph with warm tones',
    guidance: 15, steps: 40,
  },
  neutro_gradiente: {
    nome: 'Neutro',
    prompt: 'Plain dark gradient background, smooth gray to black transition, subtle center lighting, clean and minimal, no patterns, no textures, no objects, no text, no logos, simple clean dark backdrop, photorealistic photograph',
    guidance: 12, steps: 40,
  },
  urban_premium: {
    nome: 'Urbano',
    prompt: 'Empty city street at night, dark wet asphalt road with subtle reflections, distant blurred warm and cool lights in background, moody atmospheric lighting, shallow depth of field, no people, no signs, no readable text, no logos, no other vehicles, photorealistic cinematic night photograph',
    guidance: 15, steps: 40,
  },
}

// ── Helpers ──
async function downloadBuffer(url, auth) {
  const headers = {}
  if (auth) headers['Authorization'] = `Bearer ${auth}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url.substring(0, 80)}`)
  return Buffer.from(await res.arrayBuffer())
}

function bufferToDataUri(buf, mime) {
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function createInputAndMask(segBuffer) {
  const segMeta = await sharp(segBuffer).metadata()
  const vW = segMeta.width || 800
  const vH = segMeta.height || 600

  const scale = Math.min(CANVAS_SIZE * 0.85 / vW, CANVAS_SIZE * 0.85 / vH)
  const scaledW = Math.round(vW * scale)
  const scaledH = Math.round(vH * scale)
  const xOff = Math.round((CANVAS_SIZE - scaledW) / 2)
  const yOff = Math.round((CANVAS_SIZE - scaledH) / 2)

  console.log(`   Vehicle: ${vW}x${vH} → ${scaledW}x${scaledH} (${(scale*100).toFixed(0)}%)`)

  const veiculoResized = await sharp(segBuffer)
    .resize(scaledW, scaledH, { fit: 'inside' })
    .png().toBuffer()

  const inputImage = await sharp({
    create: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4, background: { r: 240, g: 240, b: 240, alpha: 255 } },
  }).composite([{ input: veiculoResized, left: xOff, top: yOff, blend: 'over' }]).png().toBuffer()

  const alphaRaw = await sharp(veiculoResized).extractChannel(3).threshold(128).png().toBuffer()
  const dilated = await sharp(alphaRaw).blur(DILATION_PX).threshold(10).png().toBuffer()
  const maskSmall = await sharp(dilated).negate().blur(FEATHER_SIGMA).png().toBuffer()
  const maskImage = await sharp({
    create: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).composite([{ input: maskSmall, left: xOff, top: yOff, blend: 'over' }]).grayscale().png().toBuffer()

  return { inputImage, maskImage, scaledW, scaledH, xOff, yOff }
}

async function callFluxFillPro(imageDataUri, maskDataUri, prompt, guidance, steps) {
  const body = {
    input: { image: imageDataUri, mask: maskDataUri, prompt, guidance, num_inference_steps: steps, output_format: 'jpg', output_quality: 92 },
  }

  const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json', 'Prefer': 'wait=60' },
    body: JSON.stringify(body),
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Replicate ${createRes.status}: ${errText.substring(0, 200)}`)
  }

  let result = await createRes.json()

  if (result.status !== 'succeeded' && result.status !== 'failed') {
    const pollUrl = result.urls?.get
    if (!pollUrl) throw new Error('No polling URL')
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(pollUrl, { headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` } })
      result = await pollRes.json()
      if (['succeeded', 'failed', 'canceled'].includes(result.status)) break
    }
  }

  if (result.status === 'failed') throw new Error(`Flux failed: ${result.error || 'unknown'}`)
  if (result.status !== 'succeeded') throw new Error('Flux timeout')

  const outputUrl = typeof result.output === 'string' ? result.output : (Array.isArray(result.output) ? result.output[0] : String(result.output))
  return { url: outputUrl, predict_time: result.metrics?.predict_time }
}

// ── Main ──
async function main() {
  console.log('=== VenStudio Premium V2 — Test ===')
  console.log(`Presets: ${Object.keys(PRESETS).join(', ')}`)
  console.log(`Dilation: ${DILATION_PX}px | Feather: ${FEATHER_SIGMA} | Threshold: ${PHASH_THRESHOLD}\n`)

  fs.mkdirSync(DEBUG_DIR, { recursive: true })

  // 1. Download assets
  console.log('1. Downloading assets...')
  const segBuffer = await downloadBuffer(SEG_PNG_URL, SERVICE_KEY)
  console.log(`   Seg: ${(segBuffer.length / 1024).toFixed(0)} KB\n`)

  // 2. Create input + mask
  console.log('2. Creating input + mask...')
  const { inputImage, maskImage, scaledW, scaledH, xOff, yOff } = await createInputAndMask(segBuffer)
  fs.writeFileSync(path.join(DEBUG_DIR, 'input_image.png'), inputImage)
  fs.writeFileSync(path.join(DEBUG_DIR, 'mask.png'), maskImage)
  console.log('   Saved debug artifacts\n')

  // 3. Original pHash
  console.log('3. Computing original pHash...')
  const vehicleCrop = await sharp(inputImage)
    .extract({ left: xOff, top: yOff, width: scaledW, height: scaledH })
    .resize(256, 256, { fit: 'fill' }).png().toBuffer()
  const originalHash = await phash(vehicleCrop)
  console.log(`   Hash: ${originalHash}\n`)

  // 4. Prepare data URIs
  const imageDataUri = bufferToDataUri(inputImage, 'image/png')
  const maskDataUri = bufferToDataUri(maskImage, 'image/png')

  // 5. Process each preset
  const results = []

  for (const presetId of Object.keys(PRESETS)) {
    const preset = PRESETS[presetId]
    const startTime = Date.now()
    console.log(`\n=== ${preset.nome} (${presetId}) ===`)
    console.log(`   Guidance: ${preset.guidance} | Steps: ${preset.steps}`)

    const result = {
      presetId, nome: preset.nome, prompt: preset.prompt,
      tempo_ms: 0, custo_usd: CUSTO_POR_GERACAO, custo_brl: CUSTO_POR_GERACAO * CAMBIO_USD_BRL,
      hashOriginal: originalHash, hashProcessado: null, hammingDistance: null,
      aprovado: false, fluxUrl: null, erro: null,
    }

    try {
      console.log(`   Calling Flux Fill Pro...`)
      const fluxResult = await callFluxFillPro(imageDataUri, maskDataUri, preset.prompt, preset.guidance, preset.steps)
      const resultBuffer = await downloadBuffer(fluxResult.url)
      console.log(`   ${(resultBuffer.length / 1024).toFixed(0)} KB (${(fluxResult.predict_time || 0).toFixed(1)}s)`)

      fs.writeFileSync(path.join(DEBUG_DIR, `flux_${presetId}.jpg`), resultBuffer)

      // Upload
      const timestamp = Date.now()
      const outputPath = `${VEICULO_ID}/v2_${presetId}_${timestamp}.jpg`
      await fetch(`${SUPABASE_URL}/storage/v1/object/fotos-veiculos/${outputPath}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'image/jpeg' },
        body: resultBuffer,
      })
      result.fluxUrl = `${SUPABASE_URL}/storage/v1/object/public/fotos-veiculos/${outputPath}`

      // pHash
      const resultMeta = await sharp(resultBuffer).metadata()
      const rW = resultMeta.width || CANVAS_SIZE
      const rH = resultMeta.height || CANVAS_SIZE
      const resultCrop = await sharp(resultBuffer)
        .extract({
          left: Math.min(Math.round(xOff * rW / CANVAS_SIZE), rW - Math.round(scaledW * rW / CANVAS_SIZE)),
          top: Math.min(Math.round(yOff * rH / CANVAS_SIZE), rH - Math.round(scaledH * rH / CANVAS_SIZE)),
          width: Math.min(Math.round(scaledW * rW / CANVAS_SIZE), rW),
          height: Math.min(Math.round(scaledH * rH / CANVAS_SIZE), rH),
        })
        .resize(256, 256, { fit: 'fill' }).png().toBuffer()

      const resultHash = await phash(resultCrop)
      const distance = phashDistance(originalHash, resultHash)

      result.hashProcessado = resultHash
      result.hammingDistance = distance
      result.tempo_ms = Date.now() - startTime
      result.aprovado = distance <= PHASH_THRESHOLD

      console.log(`   Hamming: ${distance} (threshold: ${PHASH_THRESHOLD}) → ${result.aprovado ? 'APROVADO' : 'REJEITADO'}`)

      // Register in DB
      await fetch(`${SUPABASE_URL}/rest/v1/processamentos_ia`, {
        method: 'POST',
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          veiculo_id: VEICULO_ID, foto_original_url: FOTO_ORIGINAL_URL,
          foto_processada_url: result.aprovado ? result.fluxUrl : null,
          cenario: presetId, pipeline_versao: 'v2_premium_async', status: result.aprovado ? 'concluido' : 'rejeitado',
          preset_id: presetId, prompt_usado: preset.prompt,
          fingerprint_original: originalHash, fingerprint_processado: resultHash,
          fingerprint_match: result.aprovado, hamming_distance: distance,
          aprovado: result.aprovado, custo_estimado: CUSTO_POR_GERACAO,
          tempo_processamento_ms: result.tempo_ms, tentativas: 1,
        }),
      })

    } catch (err) {
      result.tempo_ms = Date.now() - startTime
      result.erro = err.message
      console.log(`   ERROR: ${err.message}`)
    }

    results.push(result)
  }

  // 6. Generate HTML
  console.log('\n\n=== Generating HTML ===')
  generateHTML(results)

  const approved = results.filter(r => r.aprovado).length
  const totalCost = results.reduce((s, r) => s + r.custo_usd, 0)
  console.log(`\nResumo: ${approved}/${results.length} aprovados | $${totalCost.toFixed(2)} (R$ ${(totalCost * CAMBIO_USD_BRL).toFixed(2)})`)
  console.log(`Hamming: ${results.map(r => r.hammingDistance ?? 'ERR').join(', ')}`)
  console.log(`Meta: 3/5 aprovados (60%+)`)
  console.log(`\nAbra tests/venstudio-premium-v2.html no browser.`)
}

function generateHTML(results) {
  const approved = results.filter(r => r.aprovado).length
  const totalCost = results.reduce((s, r) => s + r.custo_usd, 0)

  const cards = results.map(r => {
    const statusColor = r.aprovado ? '#00e676' : '#ff5252'
    const statusText = r.aprovado ? 'APROVADO' : 'REJEITADO'
    return `
    <div class="card">
      <h3>${r.nome} <span style="color:${statusColor}">${statusText}</span></h3>
      <div class="meta">
        <span class="badge" style="background:${statusColor}20;color:${statusColor}">Hamming: ${r.hammingDistance ?? 'N/A'} (max ${PHASH_THRESHOLD})</span>
        <span>${r.tempo_ms}ms</span>
        <span>$${r.custo_usd.toFixed(2)}</span>
      </div>
      <div class="prompt">${r.prompt}</div>
      ${r.fluxUrl ? `<img src="${r.fluxUrl}" />` : `<div style="padding:40px;text-align:center;color:#666;">Erro: ${r.erro}</div>`}
    </div>`
  }).join('\n')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>VenStudio Premium V2 — Test</title>
<style>
  body { background:#0a0a0a; color:#fff; font-family:system-ui; margin:0; padding:20px; }
  h1 { text-align:center; color:#7c4dff; margin-bottom:5px; }
  h2 { text-align:center; color:#888; font-weight:400; margin-top:0; font-size:15px; }
  .summary { max-width:700px; margin:20px auto; padding:16px; background:#1a1a2e; border-radius:12px; border:1px solid #2a2a4e; display:grid; grid-template-columns:repeat(4,1fr); gap:16px; text-align:center; }
  .summary .num { font-size:28px; font-weight:700; }
  .summary .label { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px; }
  .debug-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; max-width:800px; margin:20px auto; }
  .debug-row .item { background:#1a1a1a; border-radius:8px; overflow:hidden; }
  .debug-row .item h3 { margin:0; padding:8px 12px; background:#222; font-size:12px; color:#888; }
  .debug-row .item img { width:100%; display:block; }
  .original { border:2px solid #333; border-radius:12px; overflow:hidden; max-width:500px; margin:20px auto; }
  .original h3 { margin:0; padding:8px 12px; background:#1a1a1a; font-size:13px; }
  .original img { width:100%; display:block; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(550px,1fr)); gap:20px; margin-top:30px; }
  .card { background:#141414; border-radius:12px; overflow:hidden; border:1px solid #222; }
  .card h3 { margin:0; padding:12px 16px; background:#1a1a1a; font-size:14px; display:flex; justify-content:space-between; }
  .card .meta { padding:8px 16px; background:#111; font-size:12px; display:flex; gap:16px; align-items:center; }
  .card .meta .badge { padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px; }
  .card .prompt { padding:4px 16px 8px; background:#111; font-size:10px; color:#444; font-style:italic; border-top:1px solid #1a1a1a; }
  .card img { width:100%; display:block; }
  .stats { text-align:center; color:#555; font-size:12px; margin-top:30px; padding:20px; }
</style>
</head>
<body>
<h1>VenStudio Premium V2</h1>
<h2>Honda Fit — Flux Fill Pro — Novos presets + threshold ${PHASH_THRESHOLD}</h2>

<div class="summary">
  <div><div class="num" style="color:#7c4dff">${results.length}</div><div class="label">Processados</div></div>
  <div><div class="num" style="color:#00e676">${approved}</div><div class="label">Aprovados</div></div>
  <div><div class="num" style="color:#ff9800">${results.length - approved}</div><div class="label">Rejeitados</div></div>
  <div><div class="num" style="color:#fff">$${totalCost.toFixed(2)}</div><div class="label">Custo</div></div>
</div>

<h2 style="margin-top:40px;">Debug: Input + Mascara</h2>
<div class="debug-row">
  <div class="item"><h3>INPUT IMAGE</h3><img src="debug-v2/input_image.png" /></div>
  <div class="item"><h3>MASCARA (dilation ${DILATION_PX}px + feather)</h3><img src="debug-v2/mask.png" /></div>
</div>

<div class="original"><h3>FOTO ORIGINAL</h3><img src="${FOTO_ORIGINAL_URL}" /></div>

<h2 style="margin-top:40px;">Resultados por preset</h2>
<div class="grid">${cards}</div>

<div class="stats">
  Pipeline: Premium V2 (async) | Flux Fill Pro | Threshold: Hamming ≤ ${PHASH_THRESHOLD}<br>
  Dilation: ${DILATION_PX}px | Feather: sigma=${FEATHER_SIGMA}<br>
  Testado: ${new Date().toISOString().split('T')[0]}
</div>
</body>
</html>`

  fs.writeFileSync(path.join(__dirname, 'venstudio-premium-v2.html'), html)
}

main().catch(err => { console.error('\nFATAL:', err); process.exit(1) })
