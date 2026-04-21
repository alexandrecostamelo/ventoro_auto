import type { VercelRequest, VercelResponse } from '@vercel/node'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// VenStudio Premium V2 — Composição async com Flux Fill Pro
//
// Fluxo:
// 1. Recebe foto segmentada + preset
// 2. Cria input image (veículo em canvas neutro) + máscara dilatada
// 3. Salva artefatos no storage (para debug/reprocessamento)
// 4. INSERT processamentos_ia com status='processando'
// 5. Envia prediction ao Replicate COM webhook URL
// 6. Retorna jobId imediatamente ao frontend
//
// O Replicate chamará webhook-replicate.ts quando completar.
// ============================================================

// ── Shared (inlined — Vercel bundles each function independently) ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''

function getServiceClient() { return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) }
async function verifyUser(authHeader: string | null) {
  if (!authHeader) return null
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error } = await c.auth.getUser()
  return error || !user ? null : user
}

const ALLOWED_ORIGINS = new Set(['https://ventoro.com.br', 'https://www.ventoro.com.br', 'http://localhost:5173', 'http://localhost:8080', 'https://ventoro-auto.vercel.app'])
function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://ventoro.com.br'
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
}

// ── Presets (inlined para Vercel bundling) ──
const NEGATIVE_PROMPT_BASE =
  'text, words, letters, numbers, writing, caption, title, subtitle, watermark, ' +
  'logo, brand, signature, stamp, label, sign, banner, ' +
  'people, person, human, pedestrian, crowd, ' +
  'other cars, other vehicles, motorcycle, bicycle, ' +
  'distortion, deformation, blurry, out of focus, low quality, artifacts, noise, ' +
  'cartoon, illustration, painting, drawing, anime, CGI, render, ' +
  'oversaturated, neon colors, unrealistic lighting'

const PRESETS_VALIDOS = ['luxury_showroom', 'premium_studio', 'modern_garage', 'neutro_gradiente', 'urban_premium'] as const
type PresetId = (typeof PRESETS_VALIDOS)[number]

const PRESET_PROMPTS: Record<PresetId, { positive: string; negative: string; guidance: number; steps: number }> = {
  luxury_showroom: {
    positive: 'Empty modern car dealership interior, dark polished tile floor with subtle reflections, clean recessed ceiling lights, smooth dark gray walls, spacious open room, even soft ambient lighting, no furniture, no decorations, no text, no logos, no other vehicles, photorealistic photograph',
    negative: NEGATIVE_PROMPT_BASE,
    guidance: 15, steps: 40,
  },
  premium_studio: {
    positive: 'Empty bright white room, seamless white floor blending into white walls, soft diffused overhead lighting creating gentle shadows on floor, clean and minimal, bright luminous atmosphere, no equipment, no furniture, no decorations, no text, no logos, photorealistic commercial photograph',
    negative: NEGATIVE_PROMPT_BASE + ', dark, shadows, gray, dim',
    guidance: 12, steps: 40,
  },
  modern_garage: {
    positive: 'Clean empty garage interior, smooth concrete floor, warm overhead lighting, plain concrete walls, simple industrial space, no tools, no clutter, no shelves, no text, no logos, no other vehicles, photorealistic photograph with warm tones',
    negative: NEGATIVE_PROMPT_BASE + ', messy, dirty, rusty, cluttered, tools',
    guidance: 15, steps: 40,
  },
  neutro_gradiente: {
    positive: 'Plain dark gradient background, smooth gray to black transition, subtle center lighting, clean and minimal, no patterns, no textures, no objects, no text, no logos, simple clean dark backdrop, photorealistic photograph',
    negative: NEGATIVE_PROMPT_BASE + ', bright, colorful, outdoor, indoor, room',
    guidance: 12, steps: 40,
  },
  urban_premium: {
    positive: 'Empty city street at night, dark wet asphalt road with subtle reflections, distant blurred warm and cool lights in background, moody atmospheric lighting, shallow depth of field, no people, no signs, no readable text, no logos, no other vehicles, photorealistic cinematic night photograph',
    negative: NEGATIVE_PROMPT_BASE + ', daytime, bright, sunny, indoor',
    guidance: 15, steps: 40,
  },
}

// ── Constantes de máscara ──
const CANVAS_SIZE = 1024
const DILATION_PX = 12
const FEATHER_SIGMA = 3
const CUSTO_ESTIMADO = 0.05 // USD por geração

// ── Webhook URL ──
function getWebhookUrl(): string {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://ventoro-auto.vercel.app'
  return `${base}/api/venstudio/webhook-replicate`
}

// ============================================================
// Handler principal
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | null
  const cors = corsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const startTime = Date.now()

  try {
    // ── 1. Auth ──
    const user = await verifyUser(req.headers.authorization || null)
    if (!user) return res.status(401).json({ error: 'Não autenticado' })

    // ── 2. Input validation ──
    const { veiculo_png_url, foto_original_url, preset_id, veiculo_id, foto_id } = req.body
    if (!veiculo_png_url || !foto_original_url || !preset_id || !veiculo_id) {
      return res.status(400).json({ error: 'veiculo_png_url, foto_original_url, preset_id e veiculo_id são obrigatórios' })
    }
    if (!PRESETS_VALIDOS.includes(preset_id)) {
      return res.status(400).json({ error: `Preset inválido: ${preset_id}` })
    }

    const preset = PRESET_PROMPTS[preset_id as PresetId]
    const supabase = getServiceClient()

    // ── 3. Ownership check ──
    const { data: veiculo } = await supabase
      .from('veiculos')
      .select('id, anunciante_id, garagem_id')
      .eq('id', veiculo_id)
      .single()

    if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado' })

    const isOwner = veiculo.anunciante_id === user.id
    let isGarageMember = false
    if (!isOwner && veiculo.garagem_id) {
      const { data: membro } = await supabase
        .from('membros_garagem')
        .select('id')
        .eq('garagem_id', veiculo.garagem_id)
        .eq('user_id', user.id)
        .single()
      isGarageMember = !!membro
    }
    if (!isOwner && !isGarageMember) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    // ── 4. Premium plan check ──
    if (veiculo.garagem_id) {
      const { data: garagem } = await supabase
        .from('garagens')
        .select('plano')
        .eq('id', veiculo.garagem_id)
        .single()
      if (garagem?.plano !== 'premium') {
        return res.status(403).json({ error: 'Pipeline V2 disponível apenas para plano Premium' })
      }
    }

    // ── 5. Quota check (50/mês) ──
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const { count: usosEsteMes } = await supabase
      .from('processamentos_ia')
      .select('*', { count: 'exact', head: true })
      .eq('veiculo_id', veiculo_id)
      .eq('pipeline_versao', 'v2_premium_async')
      .gte('created_at', inicioMes.toISOString())

    if ((usosEsteMes ?? 0) >= 50) {
      return res.status(429).json({ error: 'Cota mensal Premium V2 atingida (50/mês)' })
    }

    // ── 6. Baixar PNG segmentado ──
    console.log(`[V2] Downloading segmented PNG for ${veiculo_id}`)
    const pngRes = await fetch(veiculo_png_url, {
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    })
    if (!pngRes.ok) return res.status(502).json({ error: 'Falha ao baixar PNG do veículo' })
    const pngBuffer = Buffer.from(await pngRes.arrayBuffer())

    // ── 7. Criar input image + máscara ──
    console.log(`[V2] Creating input image + mask (dilation=${DILATION_PX}px, feather=${FEATHER_SIGMA})`)
    const veiculoMeta = await sharp(pngBuffer).metadata()
    const vW = veiculoMeta.width || 800
    const vH = veiculoMeta.height || 600

    const scale = Math.min(CANVAS_SIZE * 0.85 / vW, CANVAS_SIZE * 0.85 / vH)
    const scaledW = Math.round(vW * scale)
    const scaledH = Math.round(vH * scale)
    const xOff = Math.round((CANVAS_SIZE - scaledW) / 2)
    const yOff = Math.round((CANVAS_SIZE - scaledH) / 2)

    const veiculoResized = await sharp(pngBuffer)
      .resize(scaledW, scaledH, { fit: 'inside' })
      .png()
      .toBuffer()

    // Input: veículo centrado em canvas neutro
    const inputImage = await sharp({
      create: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4, background: { r: 240, g: 240, b: 240, alpha: 255 } },
    })
      .composite([{ input: veiculoResized, left: xOff, top: yOff, blend: 'over' }])
      .png()
      .toBuffer()

    // Máscara: alpha → binário → dilatar → inverter → feather
    const alphaRaw = await sharp(veiculoResized)
      .extractChannel(3)
      .threshold(128)
      .png()
      .toBuffer()

    const dilated = await sharp(alphaRaw)
      .blur(DILATION_PX)
      .threshold(10)
      .png()
      .toBuffer()

    const maskSmall = await sharp(dilated)
      .negate()
      .blur(FEATHER_SIGMA)
      .png()
      .toBuffer()

    const maskImage = await sharp({
      create: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .composite([{ input: maskSmall, left: xOff, top: yOff, blend: 'over' }])
      .grayscale()
      .png()
      .toBuffer()

    // ── 8. Salvar artefatos no storage (para debug/reprocessamento) ──
    const timestamp = Date.now()
    const inputPath = `${veiculo_id}/v2_input_${timestamp}.png`
    const maskPath = `${veiculo_id}/v2_mask_${timestamp}.png`

    await Promise.all([
      supabase.storage.from('processamento-ia').upload(inputPath, inputImage, { contentType: 'image/png', upsert: false }),
      supabase.storage.from('processamento-ia').upload(maskPath, maskImage, { contentType: 'image/png', upsert: false }),
    ])
    console.log(`[V2] Artifacts saved: ${inputPath}, ${maskPath}`)

    // ── 9. Criar registro no banco (status=processando) ──
    const { data: proc, error: procError } = await supabase
      .from('processamentos_ia')
      .insert({
        veiculo_id,
        foto_id: foto_id || null,
        foto_original_url,
        cenario: preset_id,
        pipeline_versao: 'v2_premium_async',
        status: 'processando',
        preset_id,
        prompt_usado: preset.positive,
        custo_estimado: CUSTO_ESTIMADO,
        tentativas: 1,
        input_path: inputPath,
        mask_path: maskPath,
      })
      .select('id')
      .single()

    if (procError || !proc) {
      console.error('[V2] DB insert error:', procError)
      return res.status(500).json({ error: 'Falha ao criar job no banco' })
    }

    const jobId = proc.id
    console.log(`[V2] Job created: ${jobId}`)

    // ── 10. Enviar prediction ao Replicate (async, com webhook) ──
    const inputB64 = `data:image/png;base64,${inputImage.toString('base64')}`
    const maskB64 = `data:image/png;base64,${maskImage.toString('base64')}`
    const webhookUrl = getWebhookUrl()

    console.log(`[V2] Sending to Replicate (guidance=${preset.guidance}, steps=${preset.steps}, webhook=${webhookUrl})`)

    const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          image: inputB64,
          mask: maskB64,
          prompt: preset.positive,
          guidance: preset.guidance,
          num_inference_steps: preset.steps,
          output_format: 'jpg',
          output_quality: 92,
        },
        webhook: webhookUrl,
        webhook_events_filter: ['completed'],
      }),
    })

    if (!replicateRes.ok) {
      const errText = await replicateRes.text()
      console.error('[V2] Replicate error:', errText)
      await supabase.from('processamentos_ia').update({ status: 'erro', erro: `Replicate ${replicateRes.status}: ${errText.substring(0, 200)}` }).eq('id', jobId)
      return res.status(502).json({ error: 'Falha ao enviar para Replicate' })
    }

    const prediction = await replicateRes.json()
    console.log(`[V2] Prediction created: ${prediction.id}`)

    // ── 11. Atualizar com prediction_id ──
    await supabase
      .from('processamentos_ia')
      .update({ replicate_prediction_id: prediction.id })
      .eq('id', jobId)

    // ── 12. Retornar imediatamente ──
    const tempoSetup = Date.now() - startTime
    console.log(`[V2] Job dispatched in ${tempoSetup}ms. Webhook will handle result.`)

    return res.status(200).json({
      success: true,
      jobId,
      status: 'processando',
      message: 'Processamento iniciado. Acompanhe o status via polling ou realtime.',
      prediction_id: prediction.id,
      setup_ms: tempoSetup,
    })

  } catch (err) {
    console.error('[V2] Error:', err)
    return res.status(500).json({ error: 'Erro interno no pipeline premium V2' })
  }
}

export const config = {
  maxDuration: 30, // Apenas setup + envio ao Replicate (não espera resultado)
}
