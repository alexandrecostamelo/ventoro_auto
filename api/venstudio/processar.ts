import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// ── Config ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
const STABILITY_API_KEY = process.env.STABILITY_API_KEY || ''

const STABILITY_ENDPOINT = 'https://api.stability.ai/v2beta/stable-image/edit/replace-background-and-relight'

function getServiceClient() { return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) }

async function verifyUser(authHeader: string | null) {
  if (!authHeader) return null
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error } = await c.auth.getUser()
  return error || !user ? null : user
}

// ── Cenários válidos ──
const CENARIOS_VALIDOS = ['showroom', 'deserto', 'neve', 'garagem_luxo'] as const
type CenarioId = (typeof CENARIOS_VALIDOS)[number]

const CENARIO_PROMPTS: Record<CenarioId, { prompt: string; light_direction: string; light_strength: number; preserve_subject: number }> = {
  showroom: {
    prompt: 'Premium car dealership showroom interior, polished white marble floor with mirror reflections, warm recessed ceiling spotlights, dark walnut wood accent walls, floor-to-ceiling glass windows showing soft golden hour cityscape, minimalist modern furniture in background, clean luxurious atmosphere',
    light_direction: 'above',
    light_strength: 0.7,
    preserve_subject: 0.95,
  },
  deserto: {
    prompt: 'Empty desert highway at golden hour, warm orange sand dunes on both sides, dramatic long shadows on smooth asphalt road, clear blue sky fading to warm orange at horizon, distant rocky mountains, cinematic wide landscape, professional automotive photography',
    light_direction: 'left',
    light_strength: 0.8,
    preserve_subject: 0.95,
  },
  neve: {
    prompt: 'Scenic mountain road in winter, fresh white snow covering pine trees and ground, crisp clear blue sky, soft morning sunlight reflecting off snow, majestic snow-capped peaks in background, clean plowed asphalt road, peaceful cold atmosphere, professional automotive photography',
    light_direction: 'above',
    light_strength: 0.6,
    preserve_subject: 0.95,
  },
  garagem_luxo: {
    prompt: 'Underground private luxury garage, smooth dark epoxy floor with subtle reflections, exposed concrete ceiling with industrial pendant lights, matte black walls with LED strip accent lighting along the edges, vintage racing posters slightly blurred in background, single warm spotlight highlighting center of space, exclusive private car collection atmosphere',
    light_direction: 'above',
    light_strength: 0.75,
    preserve_subject: 0.95,
  },
}

// ── CORS ──
function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const startTime = Date.now()

  try {
    // ── Auth ──
    const user = await verifyUser(req.headers.authorization ?? null)
    if (!user) return res.status(401).json({ error: 'Não autenticado' })

    // ── Input ──
    const { foto_url, cenario_id, veiculo_id, light_direction, light_strength, preserve_subject } = req.body || {}

    if (!foto_url || !cenario_id || !veiculo_id) {
      return res.status(400).json({ error: 'foto_url, cenario_id e veiculo_id são obrigatórios' })
    }

    if (!CENARIOS_VALIDOS.includes(cenario_id)) {
      return res.status(400).json({ error: `cenario_id inválido. Válidos: ${CENARIOS_VALIDOS.join(', ')}` })
    }

    if (!STABILITY_API_KEY) {
      return res.status(500).json({ error: 'STABILITY_API_KEY não configurada' })
    }

    const cenario = CENARIO_PROMPTS[cenario_id as CenarioId]
    const db = getServiceClient()

    // ── Baixar foto original ──
    const fotoResp = await fetch(foto_url)
    if (!fotoResp.ok) return res.status(400).json({ error: 'Não foi possível baixar a foto original' })
    const fotoBuffer = Buffer.from(await fotoResp.arrayBuffer())

    // ── Calcular pHash original (lazy import sharp) ──
    const sharp = (await import('sharp')).default
    const { bmvbhash } = await import('blockhash-core')

    const originalResized = await sharp(fotoBuffer).resize(256, 256, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const originalHash = bmvbhash({ data: new Uint8Array(originalResized.data), width: 256, height: 256 }, 16)

    // ── Inserir processamento como 'processando' ──
    const { data: proc, error: procErr } = await db
      .from('processamentos_ia')
      .insert({
        veiculo_id,
        tipo: 'venstudio',
        cenario: cenario_id,
        modelo_ia: 'stability_replace_bg_relight',
        engine_used: 'stability',
        status: 'processando',
        fingerprint_original: originalHash,
        light_direction: light_direction ?? cenario.light_direction,
        light_strength: light_strength ?? cenario.light_strength,
        preserve_subject: preserve_subject ?? cenario.preserve_subject,
        pipeline_versao: 'v2_stability',
        custo_estimado: 0.08,
      })
      .select('id')
      .single()

    if (procErr || !proc) {
      return res.status(500).json({ error: 'Erro ao registrar processamento', details: procErr?.message })
    }

    const processamentoId = proc.id

    // ── Chamar Stability AI ──
    const FormData = (await import('form-data')).default
    const formData = new FormData()
    formData.append('image', fotoBuffer, { filename: 'foto.jpg', contentType: 'image/jpeg' })
    formData.append('background_prompt', cenario.prompt)
    formData.append('preserve_original_subject', String(preserve_subject ?? cenario.preserve_subject))
    formData.append('light_source_direction', light_direction ?? cenario.light_direction)
    formData.append('light_source_strength', String(light_strength ?? cenario.light_strength))
    formData.append('output_format', 'jpeg')

    const stabilityResp = await fetch(STABILITY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Accept': 'application/json',
        ...formData.getHeaders(),
      },
      body: formData.getBuffer(),
    })

    // ── Resultado síncrono (200) ──
    if (stabilityResp.status === 200) {
      const result = await stabilityResp.json() as { image?: string; finish_reason?: string }

      if (!result.image) {
        await db.from('processamentos_ia').update({ status: 'erro', erro: 'Sem imagem no response' }).eq('id', processamentoId)
        return res.status(500).json({ error: 'Stability AI não retornou imagem' })
      }

      const resultBuffer = Buffer.from(result.image, 'base64')
      return await finalizarProcessamento(db, sharp, bmvbhash, processamentoId, veiculo_id, resultBuffer, originalHash, startTime, res)
    }

    // ── Resultado assíncrono (202) ──
    if (stabilityResp.status === 202) {
      const asyncResult = await stabilityResp.json() as { id: string }

      await db.from('processamentos_ia').update({
        generation_id: asyncResult.id,
        status: 'processando',
      }).eq('id', processamentoId)

      return res.status(202).json({
        processamento_id: processamentoId,
        generation_id: asyncResult.id,
        status: 'processando',
      })
    }

    // ── Erro ──
    const errorBody = await stabilityResp.text()
    await db.from('processamentos_ia').update({
      status: 'erro',
      erro: `Stability API ${stabilityResp.status}: ${errorBody.substring(0, 500)}`,
    }).eq('id', processamentoId)

    return res.status(stabilityResp.status).json({
      error: `Stability AI retornou ${stabilityResp.status}`,
      details: errorBody.substring(0, 200),
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: 'Erro interno', details: msg })
  }
}

// ── Finalizar: fingerprint + salvar ──
async function finalizarProcessamento(
  db: ReturnType<typeof getServiceClient>,
  sharp: typeof import('sharp').default,
  bmvbhash: (data: { data: Uint8Array; width: number; height: number }, bits: number) => string,
  processamentoId: string,
  veiculoId: string,
  resultBuffer: Buffer,
  originalHash: string,
  startTime: number,
  res: VercelResponse,
) {
  const tempoMs = Date.now() - startTime

  // pHash do resultado
  const resultResized = await sharp(resultBuffer).resize(256, 256, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const resultHash = bmvbhash({ data: new Uint8Array(resultResized.data), width: 256, height: 256 }, 16)

  // Hamming distance
  let hamming = 0
  for (let i = 0; i < originalHash.length; i++) {
    if (originalHash[i] !== resultHash[i]) hamming++
  }

  const THRESHOLD = parseInt(process.env.VENSTUDIO_PHASH_THRESHOLD || '10', 10)
  const aprovado = hamming <= THRESHOLD

  if (!aprovado) {
    await db.from('processamentos_ia').update({
      status: 'rejeitado',
      fingerprint_processado: resultHash,
      hamming_distance: hamming,
      aprovado: false,
      tempo_processamento_ms: tempoMs,
    }).eq('id', processamentoId)

    return res.status(200).json({
      success: false,
      processamento_id: processamentoId,
      hamming_distance: hamming,
      aprovado: false,
      tempo_ms: tempoMs,
      custo: 0.08,
      engine: 'stability',
      motivo: `Fingerprint rejeitado (hamming ${hamming} > ${THRESHOLD})`,
    })
  }

  // Upload do resultado
  const filename = `processada_stability_${Date.now()}.jpg`
  const storagePath = `${veiculoId}/${filename}`

  const { error: uploadErr } = await db.storage
    .from('fotos-veiculos')
    .upload(storagePath, resultBuffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadErr) {
    await db.from('processamentos_ia').update({ status: 'erro', erro: `Upload falhou: ${uploadErr.message}` }).eq('id', processamentoId)
    return res.status(500).json({ error: 'Erro ao salvar imagem', details: uploadErr.message })
  }

  const { data: urlData } = db.storage.from('fotos-veiculos').getPublicUrl(storagePath)
  const urlProcessada = urlData.publicUrl

  // Atualizar processamento
  await db.from('processamentos_ia').update({
    status: 'concluido',
    url_processada: urlProcessada,
    fingerprint_processado: resultHash,
    hamming_distance: hamming,
    aprovado: true,
    tempo_processamento_ms: tempoMs,
  }).eq('id', processamentoId)

  return res.status(200).json({
    success: true,
    url_processada: urlProcessada,
    processamento_id: processamentoId,
    hamming_distance: hamming,
    aprovado: true,
    tempo_ms: tempoMs,
    custo: 0.08,
    engine: 'stability',
  })
}
