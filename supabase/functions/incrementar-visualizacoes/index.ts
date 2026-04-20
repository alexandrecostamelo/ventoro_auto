import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Rate limit: 1 incremento por (IP + veiculo_id) a cada 60 segundos
const rateLimit = new Map<string, number>()
const RATE_LIMIT_MS = 60_000

const ALLOWED_ORIGINS = new Set([
  'https://ventoro.com.br',
  'https://www.ventoro.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
  // TODO: substituir pelo domínio real após deploy Vercel
  'https://ventoro.vercel.app',
])

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://ventoro.com.br'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  const origin = req.headers.get('origin')

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return json({ error: 'método não permitido' }, 405, origin)
  }

  // Proteção mínima: bots sem User-Agent bloqueados
  if (!req.headers.get('user-agent')) {
    return json({ error: 'user-agent obrigatório' }, 400, origin)
  }

  // Parse do body com tratamento de erro
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'body deve ser JSON válido' }, 400, origin)
  }

  const { veiculo_id } = body

  // Validação de UUID
  if (!veiculo_id || typeof veiculo_id !== 'string' || !UUID_REGEX.test(veiculo_id)) {
    return json({ error: 'veiculo_id deve ser um UUID válido' }, 400, origin)
  }

  // Rate limiting: 1 req por (IP + veiculo_id) a cada 60s
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rateLimitKey = `${ip}:${veiculo_id}`
  const lastRequest = rateLimit.get(rateLimitKey)
  const now = Date.now()

  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    console.log(JSON.stringify({
      event: 'rate_limited', veiculo_id, ip,
      timestamp: new Date().toISOString(),
    }))
    return json({ error: 'muitas requisições — aguarde 60 segundos' }, 429, origin)
  }

  rateLimit.set(rateLimitKey, now)

  // Limpeza periódica do Map (evita crescimento ilimitado entre reciclagens)
  if (rateLimit.size > 10_000) {
    for (const [key, ts] of rateLimit) {
      if (now - ts > RATE_LIMIT_MS) rateLimit.delete(key)
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: novoTotal, error } = await supabase.rpc(
    'incrementar_visualizacao_veiculo',
    { p_veiculo_id: veiculo_id },
  )

  if (error) {
    console.log(JSON.stringify({
      event: 'rpc_error', veiculo_id, ip,
      error: error.message, timestamp: new Date().toISOString(),
    }))
    return json({ error: 'erro interno' }, 500, origin)
  }

  if (novoTotal === null) {
    return json({ error: 'veículo não encontrado' }, 404, origin)
  }

  console.log(JSON.stringify({
    event: 'visualizacao_incrementada', veiculo_id, ip,
    total: novoTotal, timestamp: new Date().toISOString(),
  }))

  return json({ success: true, total_visualizacoes: novoTotal }, 200, origin)
})
