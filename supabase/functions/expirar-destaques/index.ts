import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Esta função é chamada por cron (Supabase Cron Jobs) a cada hora
// Desativa destaques cujo destaque_ate já passou

serve(async (req) => {
  // Aceitar GET (cron) e POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verificar authorization header para segurança (cron usa service role)
  const authHeader = req.headers.get('Authorization')
  const expectedKey = Deno.env.get('CRON_SECRET')

  // Se CRON_SECRET está configurado, validar
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    // Fallback: aceitar se vier do próprio Supabase (cron interno)
    if (!authHeader?.includes('service_role')) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Chamar a função SQL que já criamos na migração 014
  const { data, error } = await supabase.rpc('expirar_destaques')

  if (error) {
    console.error('Erro ao expirar destaques:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const expirados = data ?? 0
  console.log(`Destaques expirados: ${expirados}`)

  return new Response(JSON.stringify({ expirados, timestamp: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
