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
const CENARIOS_VALIDOS = ['showroom', 'estudio', 'garagem_luxo', 'externo', 'urbano'] as const
type CenarioId = (typeof CENARIOS_VALIDOS)[number]

const CENARIO_PROMPTS: Record<CenarioId, { prompt: string; light_direction: string; light_strength: number; preserve_subject: number }> = {
  showroom: {
    prompt: 'Dark luxury car dealership showroom at night, polished black granite floor with mirror reflections, dramatic warm spotlights from above creating pools of light, dark charcoal walls with subtle LED accent strips, floor-to-ceiling tinted windows showing distant city lights at night, moody cinematic atmosphere, professional automotive photography',
    light_direction: 'above',
    light_strength: 0.7,
    preserve_subject: 1.0,
  },
  estudio: {
    prompt: 'Professional dark photography studio, seamless black backdrop, single dramatic key light from upper left creating sharp highlights and deep shadows, subtle rim light on edges, polished dark concrete floor with faint reflection, high contrast cinematic product photography, dark moody atmosphere',
    light_direction: 'left',
    light_strength: 0.8,
    preserve_subject: 1.0,
  },
  garagem_luxo: {
    prompt: 'Underground private luxury garage at night, smooth dark epoxy floor with wet reflections, exposed raw concrete ceiling with single warm pendant spotlight, matte black walls with amber LED strip lighting along base, deep shadows, dramatic contrast, exclusive private car vault atmosphere, cinematic dark mood',
    light_direction: 'above',
    light_strength: 0.75,
    preserve_subject: 1.0,
  },
  externo: {
    prompt: 'Dark elegant outdoor scenic road at dusk, smooth clean dark asphalt, dramatic twilight sky with deep purple and orange gradient, distant city skyline silhouette with warm lights, moody atmospheric fog, professional automotive photography, cinematic dark atmosphere',
    light_direction: 'left',
    light_strength: 0.7,
    preserve_subject: 1.0,
  },
  urbano: {
    prompt: 'Dark empty city street at night after rain, wet black asphalt with colorful neon reflections, moody purple and orange city lights in blurred background, dramatic fog and mist, no people, no other vehicles, cinematic night photography, dark atmospheric urban scene',
    light_direction: 'right',
    light_strength: 0.6,
    preserve_subject: 1.0,
  },
}

// ── CORS ──
function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// ============================================================
// Estratégia: NÃO processar aqui. Apenas:
// 1. Validar input
// 2. Inserir registro no DB com status='pendente'
// 3. Salvar foto_url para o status.ts processar
// 4. Retornar 202 imediatamente
//
// O client faz polling em /api/venstudio/status que:
// - Detecta status='pendente'
// - Baixa foto, chama Stability, faz pHash, salva resultado
// Isso distribui o trabalho pesado em múltiplos requests de 10s
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

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

    // ── Inserir processamento como 'pendente' (sem processar nada pesado) ──
    const { data: proc, error: procErr } = await db
      .from('processamentos_ia')
      .insert({
        veiculo_id,
        cenario: cenario_id,
        engine_used: 'stability',
        status: 'pendente',
        foto_original_url: foto_url,
        url_foto_original: foto_url,
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

    // Retorna imediatamente — o trabalho pesado é feito pelo status.ts via polling
    return res.status(202).json({
      processamento_id: proc.id,
      status: 'pendente',
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: 'Erro interno', details: msg })
  }
}
