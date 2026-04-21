import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = {}

  try { await import('sharp'); checks.sharp = 'ok' } catch (e) { checks.sharp = 'FAIL: ' + (e as Error).message }
  try { await import('sharp-phash'); checks.phash = 'ok' } catch (e) { checks.phash = 'FAIL: ' + (e as Error).message }
  try { await import('@supabase/supabase-js'); checks.supabase = 'ok' } catch (e) { checks.supabase = 'FAIL: ' + (e as Error).message }

  checks.env_supabase_url = process.env.SUPABASE_URL ? 'set' : 'MISSING'
  checks.env_service_key = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'
  checks.env_replicate = process.env.REPLICATE_API_TOKEN ? 'set' : 'MISSING'

  return res.status(200).json({ status: 'ok', timestamp: Date.now(), checks })
}
