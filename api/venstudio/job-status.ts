import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// VenStudio Premium V2 — Polling de status do job
//
// GET /api/venstudio/job-status?id={jobId}
//
// Retorna status atual do processamento para o frontend.
// Alternativa ao Supabase Realtime quando Realtime não disponível.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

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
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | null
  const cors = corsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Auth
    const user = await verifyUser(req.headers.authorization || null)
    if (!user) return res.status(401).json({ error: 'Não autenticado' })

    // Job ID
    const jobId = req.query.id as string
    if (!jobId) return res.status(400).json({ error: 'Parâmetro id é obrigatório' })

    const supabase = getServiceClient()

    const { data: job, error } = await supabase
      .from('processamentos_ia')
      .select('id, status, aprovado, foto_processada_url, hamming_distance, erro, cenario, preset_id, tentativas, created_at, updated_at, pipeline_versao, veiculo_id')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return res.status(404).json({ error: 'Job não encontrado' })
    }

    // Verificar que o usuário tem acesso ao veículo deste job
    const { data: veiculo } = await supabase
      .from('veiculos')
      .select('anunciante_id, garagem_id')
      .eq('id', job.veiculo_id)
      .single()

    if (veiculo) {
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
    }

    return res.status(200).json({
      id: job.id,
      status: job.status || 'processando',
      aprovado: job.aprovado,
      url_processada: job.foto_processada_url,
      hamming_distance: job.hamming_distance,
      erro: job.erro,
      preset_id: job.preset_id || job.cenario,
      tentativas: job.tentativas || 0,
      created_at: job.created_at,
      updated_at: job.updated_at,
    })

  } catch (err) {
    console.error('[job-status] Error:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
}
