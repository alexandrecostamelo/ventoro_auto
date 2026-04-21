import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = {}

  try {
    const sharp = await import('sharp')
    checks.sharp = 'ok: ' + typeof sharp.default
  } catch (e) {
    checks.sharp = 'FAIL: ' + (e instanceof Error ? e.message : String(e))
  }

  try {
    const phash = await import('sharp-phash')
    checks.sharp_phash = 'ok: ' + typeof phash.default
  } catch (e) {
    checks.sharp_phash = 'FAIL: ' + (e instanceof Error ? e.message : String(e))
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    checks.supabase = 'ok: ' + typeof createClient
  } catch (e) {
    checks.supabase = 'FAIL: ' + (e instanceof Error ? e.message : String(e))
  }

  checks.env_supabase_url = process.env.SUPABASE_URL ? 'set' : (process.env.VITE_SUPABASE_URL ? 'VITE set' : 'MISSING')
  checks.env_service_key = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'
  checks.env_replicate = process.env.REPLICATE_API_TOKEN ? 'set' : 'MISSING'

  return res.status(200).json({ status: 'ok', timestamp: Date.now(), checks })
}
