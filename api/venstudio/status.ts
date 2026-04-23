import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
const STABILITY_API_KEY = process.env.STABILITY_API_KEY || ''

const STABILITY_ENDPOINT = 'https://api.stability.ai/v2beta/stable-image/edit/replace-background-and-relight'

const CENARIO_PROMPTS: Record<string, { prompt: string; light_direction: string; light_strength: number; preserve_subject: number }> = {
  showroom: {
    prompt: 'Dark luxury car dealership showroom at night, polished black granite floor with mirror reflections, dramatic warm spotlights from above creating pools of light, dark charcoal walls with subtle LED accent strips, floor-to-ceiling tinted windows showing distant city lights at night, moody cinematic atmosphere, professional automotive photography',
    light_direction: 'above', light_strength: 0.7, preserve_subject: 1.0,
  },
  estudio: {
    prompt: 'Professional dark photography studio, seamless black backdrop, single dramatic key light from upper left creating sharp highlights and deep shadows, subtle rim light on edges, polished dark concrete floor with faint reflection, high contrast cinematic product photography, dark moody atmosphere',
    light_direction: 'left', light_strength: 0.8, preserve_subject: 1.0,
  },
  garagem_luxo: {
    prompt: 'Underground private luxury garage at night, smooth dark epoxy floor with wet reflections, exposed raw concrete ceiling with single warm pendant spotlight, matte black walls with amber LED strip lighting along base, deep shadows, dramatic contrast, exclusive private car vault atmosphere, cinematic dark mood',
    light_direction: 'above', light_strength: 0.75, preserve_subject: 1.0,
  },
  externo: {
    prompt: 'Dark elegant outdoor scenic road at dusk, smooth clean dark asphalt, dramatic twilight sky with deep purple and orange gradient, distant city skyline silhouette with warm lights, moody atmospheric fog, professional automotive photography, cinematic dark atmosphere',
    light_direction: 'left', light_strength: 0.7, preserve_subject: 1.0,
  },
  urbano: {
    prompt: 'Dark empty city street at night after rain, wet black asphalt with colorful neon reflections, moody purple and orange city lights in blurred background, dramatic fog and mist, no people, no other vehicles, cinematic night photography, dark atmospheric urban scene',
    light_direction: 'right', light_strength: 0.6, preserve_subject: 1.0,
  },
}

function getServiceClient() { return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) }

async function verifyUser(authHeader: string | null) {
  if (!authHeader) return null
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error } = await c.auth.getUser()
  return error || !user ? null : user
}

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// ============================================================
// Pipeline distribuído em polls de ≤10s:
//
// Poll 1: status='pendente'     → baixar foto + enviar Stability
//         Se Stability 200      → upload resultado + status='concluido'
//         Se Stability 202      → salvar generation_id + status='processando'
// Poll 2+: status='processando' → pollar Stability result
//         Se 200                → upload resultado + status='concluido'
//         Se 202                → manter processando
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const user = await verifyUser(req.headers.authorization ?? null)
  if (!user) return res.status(401).json({ error: 'Não autenticado' })

  const processamentoId = req.query.id as string
  if (!processamentoId) return res.status(400).json({ error: 'id é obrigatório' })

  const db = getServiceClient()

  const { data: proc, error: procErr } = await db
    .from('processamentos_ia')
    .select('*')
    .eq('id', processamentoId)
    .single()

  if (procErr || !proc) return res.status(404).json({ error: 'Processamento não encontrado' })

  // ── Já finalizado ──
  if (['concluido', 'erro', 'rejeitado'].includes(proc.status)) {
    return res.status(200).json({
      status: proc.status,
      url_processada: proc.foto_processada_url,
      hamming_distance: proc.hamming_distance,
      aprovado: proc.aprovado,
      erro: proc.erro,
    })
  }

  // ── ETAPA 1: pendente → enviar para Stability ──
  if (proc.status === 'pendente') {
    try {
      const fotoUrl = proc.url_foto_original || proc.foto_original_url
      if (!fotoUrl) {
        await db.from('processamentos_ia').update({ status: 'erro', erro: 'URL da foto não encontrada' }).eq('id', processamentoId)
        return res.status(200).json({ status: 'erro', erro: 'URL da foto não encontrada' })
      }

      // Baixar foto
      const fotoResp = await fetch(fotoUrl)
      if (!fotoResp.ok) {
        await db.from('processamentos_ia').update({ status: 'erro', erro: `Foto download falhou: ${fotoResp.status}` }).eq('id', processamentoId)
        return res.status(200).json({ status: 'erro', erro: 'Não foi possível baixar a foto' })
      }
      const fotoBuffer = Buffer.from(await fotoResp.arrayBuffer())

      // Enviar para Stability (sem pHash — feito depois)
      const cenario = CENARIO_PROMPTS[proc.cenario] || CENARIO_PROMPTS.showroom
      const FormData = (await import('form-data')).default
      const formData = new FormData()
      formData.append('subject_image', fotoBuffer, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      formData.append('background_prompt', cenario.prompt)
      formData.append('background_negative_prompt', 'blurry, low quality, distorted, text, watermark, logo, other vehicles, people, cluttered, messy, unrealistic, cartoon, painting, illustration')
      formData.append('preserve_original_subject', String(proc.preserve_subject ?? cenario.preserve_subject))
      formData.append('light_source_direction', proc.light_direction ?? cenario.light_direction)
      formData.append('light_source_strength', String(proc.light_strength ?? cenario.light_strength))
      formData.append('output_format', 'webp')

      const stabilityResp = await fetch(STABILITY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': '*/*',
          ...formData.getHeaders(),
        },
        body: formData.getBuffer(),
      })

      // Síncrono (200) — resultado imediato, upload e concluir
      if (stabilityResp.status === 200) {
        const contentType = stabilityResp.headers.get('content-type') || ''

        // Se retornou imagem binária diretamente (image/jpeg, image/png, etc.)
        if (contentType.startsWith('image/')) {
          const resultBuffer = Buffer.from(await stabilityResp.arrayBuffer())
          return await salvarResultado(db, proc, processamentoId, resultBuffer, res)
        }

        // Se retornou JSON
        const result = await stabilityResp.json() as { id?: string; image?: string; artifacts?: Array<{ base64?: string }> }

        // Stability pode retornar { id } com status 200 (async) — tratar como 202
        if (result.id && !result.image && !result.artifacts) {
          await db.from('processamentos_ia').update({
            status: 'processando',
            generation_id: result.id,
          }).eq('id', processamentoId)
          return res.status(200).json({ status: 'processando' })
        }

        const base64Image = result.image || result.artifacts?.[0]?.base64
        if (!base64Image) {
          const keys = Object.keys(result).join(', ')
          await db.from('processamentos_ia').update({ status: 'erro', erro: `Stability retornou JSON sem imagem. Keys: ${keys}` }).eq('id', processamentoId)
          return res.status(200).json({ status: 'erro', erro: 'Sem imagem no resultado' })
        }

        return await salvarResultado(db, proc, processamentoId, Buffer.from(base64Image, 'base64'), res)
      }

      // Assíncrono (202)
      if (stabilityResp.status === 202) {
        const asyncResult = await stabilityResp.json() as { id: string }
        await db.from('processamentos_ia').update({
          status: 'processando',
          generation_id: asyncResult.id,
        }).eq('id', processamentoId)

        return res.status(200).json({ status: 'processando' })
      }

      // Erro
      const errText = await stabilityResp.text()
      await db.from('processamentos_ia').update({
        status: 'erro',
        erro: `Stability ${stabilityResp.status}: ${errText.substring(0, 300)}`,
      }).eq('id', processamentoId)
      return res.status(200).json({ status: 'erro', erro: errText.substring(0, 200) })

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      await db.from('processamentos_ia').update({ status: 'erro', erro: msg.substring(0, 500) }).eq('id', processamentoId)
      return res.status(200).json({ status: 'erro', erro: msg.substring(0, 200) })
    }
  }

  // ── ETAPA 2: processando + generation_id → pollar Stability ──
  if (proc.status === 'processando' && proc.generation_id) {
    try {
      const pollResp = await fetch(
        `https://api.stability.ai/v2beta/results/${proc.generation_id}`,
        { headers: { 'Authorization': `Bearer ${STABILITY_API_KEY}`, 'Accept': '*/*' } }
      )

      if (pollResp.status === 202) {
        return res.status(200).json({ status: 'processando' })
      }

      if (pollResp.status === 200) {
        const pollContentType = pollResp.headers.get('content-type') || ''

        // Binário direto (image/jpeg, image/png, etc.)
        if (pollContentType.startsWith('image/')) {
          const resultBuffer = Buffer.from(await pollResp.arrayBuffer())
          return await salvarResultado(db, proc, processamentoId, resultBuffer, res)
        }

        // Pode ser application/octet-stream ou outro binário
        if (!pollContentType.includes('json')) {
          const resultBuffer = Buffer.from(await pollResp.arrayBuffer())
          if (resultBuffer.length > 1000) {
            // Provavelmente uma imagem
            return await salvarResultado(db, proc, processamentoId, resultBuffer, res)
          }
        }

        // JSON fallback
        const result = await pollResp.json() as { image?: string; artifacts?: Array<{ base64?: string }> }
        const base64Image = result.image || result.artifacts?.[0]?.base64
        if (!base64Image) {
          const keys = Object.keys(result).join(', ')
          const ct = pollContentType
          await db.from('processamentos_ia').update({ status: 'erro', erro: `Async sem imagem. CT: ${ct} Keys: ${keys}` }).eq('id', processamentoId)
          return res.status(200).json({ status: 'erro', erro: 'Sem imagem' })
        }

        return await salvarResultado(db, proc, processamentoId, Buffer.from(base64Image, 'base64'), res)
      }

      const errText = await pollResp.text()
      await db.from('processamentos_ia').update({
        status: 'erro',
        erro: `Poll ${pollResp.status}: ${errText.substring(0, 300)}`,
      }).eq('id', processamentoId)
      return res.status(200).json({ status: 'erro', erro: errText.substring(0, 200) })

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return res.status(200).json({ status: 'processando', erro_poll: msg })
    }
  }

  return res.status(200).json({ status: proc.status })
}

// ── Upload resultado para Storage e marcar concluído ──
async function salvarResultado(
  db: ReturnType<typeof getServiceClient>,
  proc: any,
  processamentoId: string,
  resultBuffer: Buffer,
  res: VercelResponse,
) {
  const tempoMs = Date.now() - new Date(proc.created_at).getTime()
  const filename = `processada_stability_${Date.now()}.webp`
  const storagePath = `${proc.veiculo_id}/${filename}`

  const { error: uploadErr } = await db.storage
    .from('fotos-veiculos')
    .upload(storagePath, resultBuffer, { contentType: 'image/webp', upsert: true })

  if (uploadErr) {
    await db.from('processamentos_ia').update({ status: 'erro', erro: `Upload: ${uploadErr.message}` }).eq('id', processamentoId)
    return res.status(200).json({ status: 'erro', erro: uploadErr.message })
  }

  const { data: urlData } = db.storage.from('fotos-veiculos').getPublicUrl(storagePath)

  await db.from('processamentos_ia').update({
    status: 'concluido',
    foto_processada_url: urlData.publicUrl,
    aprovado: true,
    tempo_processamento_ms: tempoMs,
  }).eq('id', processamentoId)

  return res.status(200).json({
    status: 'concluido',
    url_processada: urlData.publicUrl,
    aprovado: true,
  })
}
