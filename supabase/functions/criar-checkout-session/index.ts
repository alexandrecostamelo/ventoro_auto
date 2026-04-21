import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

const ALLOWED_ORIGINS = new Set([
  'https://ventoro.com.br',
  'https://www.ventoro.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
  // TODO: substituir pelo domínio real após deploy Vercel
  'https://ventoro-auto.vercel.app',
])

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://ventoro.com.br'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    })
  }

  try {
    // Autenticar usuário via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }

    const { priceId, garagemId, plano, mode } = await req.json()

    if (!priceId || !garagemId || !plano) {
      return new Response(JSON.stringify({ error: 'priceId, garagemId e plano são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }

    // Buscar ou criar Stripe Customer
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verificar se a garagem já tem stripe_customer_id
    const { data: assinatura } = await supabaseAdmin
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('garagem_id', garagemId)
      .maybeSingle()

    let customerId = assinatura?.stripe_customer_id

    if (!customerId) {
      // Buscar info da garagem para criar customer
      const { data: garagem } = await supabaseAdmin
        .from('garagens')
        .select('nome, email')
        .eq('id', garagemId)
        .single()

      const customer = await stripe.customers.create({
        email: garagem?.email ?? user.email,
        name: garagem?.nome ?? 'Garagem',
        metadata: {
          garagem_id: garagemId,
          user_id: user.id,
          supabase_project: 'ventoro',
        },
      })
      customerId = customer.id

      // Salvar stripe_customer_id na assinatura
      await supabaseAdmin
        .from('assinaturas')
        .update({ stripe_customer_id: customerId })
        .eq('garagem_id', garagemId)
    }

    // Determinar mode: subscription para planos, payment para destaque
    const checkoutMode = mode === 'payment' ? 'payment' : 'subscription'

    const baseUrl = origin ?? 'https://ventoro.com.br'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: checkoutMode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/painel/planos?sucesso=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/painel/planos?cancelado=true`,
      metadata: {
        garagem_id: garagemId,
        user_id: user.id,
        plano,
      },
      locale: 'pt-BR',
      payment_method_types: ['card'],
    }

    // Adicionar trial para subscriptions se ainda não teve
    if (checkoutMode === 'subscription' && !assinatura?.stripe_customer_id) {
      sessionParams.subscription_data = {
        trial_period_days: 14,
        metadata: {
          garagem_id: garagemId,
          plano,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Erro ao criar checkout session:', err)
    return new Response(JSON.stringify({ error: 'Erro interno ao criar sessão de pagamento' }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    })
  }
})
