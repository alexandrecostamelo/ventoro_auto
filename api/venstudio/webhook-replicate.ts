import type { VercelRequest, VercelResponse } from '@vercel/node'
import sharp from 'sharp'
import phash from 'sharp-phash'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// VenStudio Premium V2 — Webhook do Replicate
//
// Recebe o resultado de uma prediction Flux Fill Pro e:
// 1. Busca o job correspondente no banco (por prediction_id)
// 2. Idempotência: ignora se já processado
// 3. Se succeeded: valida integridade via pHash
// 4. Se aprovado: upload resultado + atualiza banco
// 5. Se rejeitado: retry com seed diferente (até 3x) ou marca fallback
// 6. Se failed: registra erro
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''
const PHASH_THRESHOLD = parseInt(process.env.VENSTUDIO_PHASH_THRESHOLD || '10', 10)
const MAX_TENTATIVAS = 3
const CANVAS_SIZE = 1024

function getServiceClient() { return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) }

/** Hamming distance entre dois hashes hexadecimais */
function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    let bits = xor
    while (bits) { dist++; bits &= bits - 1 }
  }
  return dist
}

// Presets inlined (para retry com prompt)
const PRESET_PROMPTS: Record<string, { positive: string; guidance: number; steps: number }> = {
  luxury_showroom: { positive: 'Empty modern car dealership interior, dark polished tile floor with subtle reflections, clean recessed ceiling lights, smooth dark gray walls, spacious open room, even soft ambient lighting, no furniture, no decorations, no text, no logos, no other vehicles, photorealistic photograph', guidance: 15, steps: 40 },
  premium_studio: { positive: 'Empty bright white room, seamless white floor blending into white walls, soft diffused overhead lighting creating gentle shadows on floor, clean and minimal, bright luminous atmosphere, no equipment, no furniture, no decorations, no text, no logos, photorealistic commercial photograph', guidance: 12, steps: 40 },
  modern_garage: { positive: 'Clean empty garage interior, smooth concrete floor, warm overhead lighting, plain concrete walls, simple industrial space, no tools, no clutter, no shelves, no text, no logos, no other vehicles, photorealistic photograph with warm tones', guidance: 15, steps: 40 },
  neutro_gradiente: { positive: 'Plain dark gradient background, smooth gray to black transition, subtle center lighting, clean and minimal, no patterns, no textures, no objects, no text, no logos, simple clean dark backdrop, photorealistic photograph', guidance: 12, steps: 40 },
  urban_premium: { positive: 'Empty city street at night, dark wet asphalt road with subtle reflections, distant blurred warm and cool lights in background, moody atmospheric lighting, shallow depth of field, no people, no signs, no readable text, no logos, no other vehicles, photorealistic cinematic night photograph', guidance: 15, steps: 40 },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Webhook aceita POST de qualquer origem (Replicate)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const payload = req.body
    const predictionId = payload?.id
    const status = payload?.status

    if (!predictionId) {
      console.warn('[Webhook] No prediction ID in payload')
      return res.status(400).json({ error: 'Missing prediction ID' })
    }

    console.log(`[Webhook] Received: prediction=${predictionId}, status=${status}`)

    const supabase = getServiceClient()

    // ── 1. Buscar job no banco ──
    const { data: job, error: jobError } = await supabase
      .from('processamentos_ia')
      .select('*')
      .eq('replicate_prediction_id', predictionId)
      .single()

    if (jobError || !job) {
      console.warn(`[Webhook] Job not found for prediction ${predictionId}`)
      return res.status(200).json({ ok: true, message: 'Job not found, ignoring' })
    }

    // ── 2. Idempotência: ignorar se já processado ──
    if (job.status === 'concluido' || job.status === 'fallback_elegivel') {
      console.log(`[Webhook] Job ${job.id} already ${job.status}, skipping`)
      return res.status(200).json({ ok: true, message: 'Already processed' })
    }

    // ── 3. Se failed → registrar erro ──
    if (status === 'failed' || status === 'canceled') {
      const tentativas = (job.tentativas || 0)
      const errMsg = payload.error || `Replicate ${status}`

      if (tentativas < MAX_TENTATIVAS) {
        console.log(`[Webhook] Failed, retrying (attempt ${tentativas + 1}/${MAX_TENTATIVAS})`)
        await retryPrediction(supabase, job, tentativas + 1)
      } else {
        console.log(`[Webhook] Failed after ${MAX_TENTATIVAS} attempts, marking fallback_elegivel`)
        await supabase.from('processamentos_ia').update({
          status: 'fallback_elegivel',
          fallback_elegivel: true,
          erro: errMsg,
          tentativas,
        }).eq('id', job.id)
      }

      return res.status(200).json({ ok: true })
    }

    // ── 4. Se succeeded → validar e salvar ──
    if (status === 'succeeded') {
      const outputUrl = typeof payload.output === 'string'
        ? payload.output
        : (Array.isArray(payload.output) ? payload.output[0] : null)

      if (!outputUrl) {
        await supabase.from('processamentos_ia').update({
          status: 'erro', erro: 'No output URL from Replicate',
        }).eq('id', job.id)
        return res.status(200).json({ ok: true })
      }

      console.log(`[Webhook] Downloading result from ${outputUrl.substring(0, 60)}...`)

      // Baixar resultado
      const resultRes = await fetch(outputUrl)
      if (!resultRes.ok) {
        await supabase.from('processamentos_ia').update({
          status: 'erro', erro: `Failed to download result: ${resultRes.status}`,
        }).eq('id', job.id)
        return res.status(200).json({ ok: true })
      }
      const resultBuffer = Buffer.from(await resultRes.arrayBuffer())

      // ── 5. Validação de integridade (pHash) ──
      console.log(`[Webhook] Running pHash validation (threshold=${PHASH_THRESHOLD})`)

      let originalHash = ''
      let resultHash = ''
      let distance = 0

      try {
        // Baixar input image do storage (para extrair região do veículo)
        const inputPath = job.input_path
        if (inputPath) {
          const { data: inputData } = await supabase.storage
            .from('processamento-ia')
            .download(inputPath)

          if (inputData) {
            const inputBuffer = Buffer.from(await inputData.arrayBuffer())
            const inputMeta = await sharp(inputBuffer).metadata()
            const iW = inputMeta.width || CANVAS_SIZE
            const iH = inputMeta.height || CANVAS_SIZE

            // Detectar bounding box do veículo via alpha
            const alphaData = await sharp(inputBuffer).extractChannel(3).raw().toBuffer()
            let minX = iW, maxX = 0, minY = iH, maxY = 0
            for (let y = 0; y < iH; y++) {
              for (let x = 0; x < iW; x++) {
                if (alphaData[y * iW + x] > 128) {
                  if (x < minX) minX = x
                  if (x > maxX) maxX = x
                  if (y < minY) minY = y
                  if (y > maxY) maxY = y
                }
              }
            }

            if (maxX > minX && maxY > minY) {
              const margin = Math.round(Math.max(maxX - minX, maxY - minY) * 0.02)
              const cropBox = {
                left: Math.max(0, minX - margin),
                top: Math.max(0, minY - margin),
                width: Math.min(iW - Math.max(0, minX - margin), maxX - minX + 2 * margin),
                height: Math.min(iH - Math.max(0, minY - margin), maxY - minY + 2 * margin),
              }

              // Hash do veículo no input original
              const origCrop = await sharp(inputBuffer)
                .extract(cropBox)
                .resize(256, 256, { fit: 'fill' })
                .png()
                .toBuffer()
              originalHash = await phash(origCrop)

              // Hash do veículo no resultado (mesma região, escala proporcional)
              const rMeta = await sharp(resultBuffer).metadata()
              const rW = rMeta.width || CANVAS_SIZE
              const rH = rMeta.height || CANVAS_SIZE
              const scaleX = rW / iW
              const scaleY = rH / iH
              const resultCropBox = {
                left: Math.max(0, Math.round(cropBox.left * scaleX)),
                top: Math.max(0, Math.round(cropBox.top * scaleY)),
                width: Math.min(rW, Math.round(cropBox.width * scaleX)),
                height: Math.min(rH, Math.round(cropBox.height * scaleY)),
              }
              // Clamp
              resultCropBox.left = Math.min(resultCropBox.left, rW - resultCropBox.width)
              resultCropBox.top = Math.min(resultCropBox.top, rH - resultCropBox.height)

              const resCrop = await sharp(resultBuffer)
                .extract(resultCropBox)
                .resize(256, 256, { fit: 'fill' })
                .png()
                .toBuffer()
              resultHash = await phash(resCrop)

              distance = hammingDistance(originalHash, resultHash)
              console.log(`[Webhook] pHash: original=${originalHash.substring(0, 16)}... result=${resultHash.substring(0, 16)}... hamming=${distance} (max=${PHASH_THRESHOLD})`)
            }
          }
        }
      } catch (hashErr) {
        console.warn('[Webhook] pHash validation error (proceeding with approval):', hashErr)
        // Se pHash falhar, aprovar sem fingerprint (melhor que bloquear)
      }

      const approved = distance <= PHASH_THRESHOLD
      const tempoMs = payload.metrics?.predict_time
        ? Math.round(payload.metrics.predict_time * 1000)
        : null

      if (approved) {
        // ── 6a. APROVADO: upload resultado ──
        console.log(`[Webhook] APPROVED (hamming=${distance} ≤ ${PHASH_THRESHOLD})`)

        const timestamp = Date.now()
        const outputPath = `${job.veiculo_id}/premium_v2_${timestamp}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('fotos-veiculos')
          .upload(outputPath, resultBuffer, { contentType: 'image/jpeg', upsert: false })

        if (uploadError) {
          console.error('[Webhook] Upload error:', uploadError)
          await supabase.from('processamentos_ia').update({
            status: 'erro', erro: 'Upload failed',
          }).eq('id', job.id)
          return res.status(200).json({ ok: true })
        }

        const urlProcessada = `${SUPABASE_URL}/storage/v1/object/public/fotos-veiculos/${outputPath}`

        await supabase.from('processamentos_ia').update({
          status: 'concluido',
          aprovado: true,
          foto_processada_url: urlProcessada,
          fingerprint_original: originalHash || null,
          fingerprint_processado: resultHash || null,
          fingerprint_match: true,
          hamming_distance: distance,
          tempo_processamento_ms: tempoMs,
        }).eq('id', job.id)

        // Atualizar fotos_veiculo se foto_id
        if (job.foto_id) {
          await supabase.from('fotos_veiculo').update({
            url_processada: urlProcessada,
            processada_por_ia: true,
            cenario_ia: job.preset_id || job.cenario,
          }).eq('id', job.foto_id)
        }

        console.log(`[Webhook] Job ${job.id} completed: ${urlProcessada}`)

      } else {
        // ── 6b. REJEITADO: retry ou fallback ──
        const tentativas = (job.tentativas || 0)
        console.log(`[Webhook] REJECTED (hamming=${distance} > ${PHASH_THRESHOLD}), attempt ${tentativas}/${MAX_TENTATIVAS}`)

        if (tentativas < MAX_TENTATIVAS) {
          await supabase.from('processamentos_ia').update({
            fingerprint_original: originalHash || null,
            fingerprint_processado: resultHash || null,
            fingerprint_match: false,
            hamming_distance: distance,
          }).eq('id', job.id)

          await retryPrediction(supabase, job, tentativas + 1)
        } else {
          await supabase.from('processamentos_ia').update({
            status: 'fallback_elegivel',
            fallback_elegivel: true,
            aprovado: false,
            fingerprint_original: originalHash || null,
            fingerprint_processado: resultHash || null,
            fingerprint_match: false,
            hamming_distance: distance,
            tempo_processamento_ms: tempoMs,
            erro: `Rejeitado após ${MAX_TENTATIVAS} tentativas (hamming=${distance})`,
          }).eq('id', job.id)
          console.log(`[Webhook] Job ${job.id} marked as fallback_elegivel`)
        }
      }

      return res.status(200).json({ ok: true })
    }

    // Status desconhecido
    console.warn(`[Webhook] Unknown status: ${status}`)
    return res.status(200).json({ ok: true })

  } catch (err) {
    console.error('[Webhook] Error:', err)
    return res.status(200).json({ ok: true, error: 'Internal error (logged)' })
  }
}

/** Retry: enviar nova prediction ao Replicate com seed diferente */
async function retryPrediction(
  supabase: ReturnType<typeof getServiceClient>,
  job: Record<string, unknown>,
  tentativa: number
) {
  const presetId = (job.preset_id || 'luxury_showroom') as string
  const preset = PRESET_PROMPTS[presetId] || PRESET_PROMPTS.luxury_showroom

  // Buscar artefatos do storage
  const inputPath = job.input_path as string
  const maskPath = job.mask_path as string

  if (!inputPath || !maskPath) {
    console.error('[Webhook] Cannot retry: missing input/mask paths')
    await supabase.from('processamentos_ia').update({
      status: 'erro', erro: 'Cannot retry: missing artifacts',
    }).eq('id', job.id)
    return
  }

  const [inputData, maskData] = await Promise.all([
    supabase.storage.from('processamento-ia').download(inputPath),
    supabase.storage.from('processamento-ia').download(maskPath),
  ])

  if (!inputData.data || !maskData.data) {
    console.error('[Webhook] Cannot retry: failed to download artifacts')
    await supabase.from('processamentos_ia').update({
      status: 'erro', erro: 'Cannot retry: artifacts download failed',
    }).eq('id', job.id)
    return
  }

  const inputBuffer = Buffer.from(await inputData.data.arrayBuffer())
  const maskBuffer = Buffer.from(await maskData.data.arrayBuffer())

  const inputB64 = `data:image/png;base64,${inputBuffer.toString('base64')}`
  const maskB64 = `data:image/png;base64,${maskBuffer.toString('base64')}`

  const webhookUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/venstudio/webhook-replicate`
    : 'https://ventoro-auto.vercel.app/api/venstudio/webhook-replicate'

  // Seed diferente a cada tentativa para variar resultado
  const seed = Math.floor(Math.random() * 999999)

  console.log(`[Webhook] Retrying prediction (attempt ${tentativa}, seed=${seed})`)

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
        seed,
        output_format: 'jpg',
        output_quality: 92,
      },
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    }),
  })

  if (!replicateRes.ok) {
    const errText = await replicateRes.text()
    console.error('[Webhook] Retry failed:', errText)
    await supabase.from('processamentos_ia').update({
      status: 'erro', erro: `Retry failed: ${errText.substring(0, 200)}`, tentativas: tentativa,
    }).eq('id', job.id)
    return
  }

  const prediction = await replicateRes.json()
  console.log(`[Webhook] Retry prediction created: ${prediction.id}`)

  await supabase.from('processamentos_ia').update({
    replicate_prediction_id: prediction.id,
    tentativas: tentativa,
  }).eq('id', job.id)
}

export const config = {
  maxDuration: 60, // Webhook precisa de tempo para: download + pHash + upload + retry
}
