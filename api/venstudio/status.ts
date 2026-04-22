import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
const STABILITY_API_KEY = process.env.STABILITY_API_KEY || ''

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const user = await verifyUser(req.headers.authorization ?? null)
  if (!user) return res.status(401).json({ error: 'Não autenticado' })

  const processamentoId = req.query.id as string
  if (!processamentoId) return res.status(400).json({ error: 'id é obrigatório' })

  const db = getServiceClient()

  // Buscar processamento
  const { data: proc, error: procErr } = await db
    .from('processamentos_ia')
    .select('*')
    .eq('id', processamentoId)
    .single()

  if (procErr || !proc) return res.status(404).json({ error: 'Processamento não encontrado' })

  // Se já finalizado, retornar direto
  if (['concluido', 'erro', 'rejeitado'].includes(proc.status)) {
    return res.status(200).json({
      status: proc.status,
      url_processada: proc.url_processada,
      hamming_distance: proc.hamming_distance,
      aprovado: proc.aprovado,
      erro: proc.erro,
    })
  }

  // Se está processando e tem generation_id, pollar Stability
  if (proc.status === 'processando' && proc.generation_id) {
    try {
      const pollResp = await fetch(
        `https://api.stability.ai/v2beta/stable-image/edit/result/${proc.generation_id}`,
        {
          headers: {
            'Authorization': `Bearer ${STABILITY_API_KEY}`,
            'Accept': 'application/json',
          },
        }
      )

      if (pollResp.status === 202) {
        return res.status(200).json({ status: 'processando' })
      }

      if (pollResp.status === 200) {
        const result = await pollResp.json() as { image?: string; finish_reason?: string }

        if (!result.image) {
          await db.from('processamentos_ia').update({ status: 'erro', erro: 'Sem imagem no resultado' }).eq('id', processamentoId)
          return res.status(200).json({ status: 'erro', erro: 'Sem imagem no resultado' })
        }

        const resultBuffer = Buffer.from(result.image, 'base64')

        // Fingerprint
        const sharp = (await import('sharp')).default
        const { bmvbhash } = await import('blockhash-core')

        const resultResized = await sharp(resultBuffer).resize(256, 256, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        const resultHash = bmvbhash({ data: new Uint8Array(resultResized.data), width: 256, height: 256 }, 16)

        let hamming = 0
        const origHash = proc.fingerprint_original || ''
        for (let i = 0; i < origHash.length && i < resultHash.length; i++) {
          if (origHash[i] !== resultHash[i]) hamming++
        }

        const THRESHOLD = parseInt(process.env.VENSTUDIO_PHASH_THRESHOLD || '10', 10)
        const aprovado = hamming <= THRESHOLD

        if (!aprovado) {
          await db.from('processamentos_ia').update({
            status: 'rejeitado',
            fingerprint_processado: resultHash,
            hamming_distance: hamming,
            aprovado: false,
            tempo_processamento_ms: Date.now() - new Date(proc.created_at).getTime(),
          }).eq('id', processamentoId)

          return res.status(200).json({
            status: 'rejeitado',
            hamming_distance: hamming,
            aprovado: false,
          })
        }

        // Upload
        const filename = `processada_stability_${Date.now()}.jpg`
        const storagePath = `${proc.veiculo_id}/${filename}`

        await db.storage.from('fotos-veiculos').upload(storagePath, resultBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

        const { data: urlData } = db.storage.from('fotos-veiculos').getPublicUrl(storagePath)

        await db.from('processamentos_ia').update({
          status: 'concluido',
          url_processada: urlData.publicUrl,
          fingerprint_processado: resultHash,
          hamming_distance: hamming,
          aprovado: true,
          tempo_processamento_ms: Date.now() - new Date(proc.created_at).getTime(),
        }).eq('id', processamentoId)

        return res.status(200).json({
          status: 'concluido',
          url_processada: urlData.publicUrl,
          hamming_distance: hamming,
          aprovado: true,
        })
      }

      // Stability error
      const errText = await pollResp.text()
      await db.from('processamentos_ia').update({
        status: 'erro',
        erro: `Stability poll ${pollResp.status}: ${errText.substring(0, 500)}`,
      }).eq('id', processamentoId)

      return res.status(200).json({ status: 'erro', erro: errText.substring(0, 200) })

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return res.status(200).json({ status: 'processando', erro_poll: msg })
    }
  }

  return res.status(200).json({ status: proc.status })
}
