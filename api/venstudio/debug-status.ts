import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  // Simple auth check - only allow with a secret param
  if (req.query.secret !== 'ventoro2026') {
    return res.status(403).json({ error: 'forbidden' })
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await db
    .from('processamentos_ia')
    .select('id, status, erro, cenario, engine_used, created_at, foto_original_url, url_foto_original, foto_processada_url, light_direction, preserve_subject, generation_id')
    .order('created_at', { ascending: false })
    .limit(15)

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({
    count: data.length,
    stability_key_set: !!process.env.STABILITY_API_KEY,
    service_role_set: !!SUPABASE_SERVICE_ROLE_KEY,
    records: data,
  })
}
