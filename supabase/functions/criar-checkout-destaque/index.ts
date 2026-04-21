import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

const DESTAQUE_PRICE_ID = Deno.env.get('STRIPE_DESTAQUE_PRICE_ID') ?? 'price_PLACEHOLDER_DESTAQUE'
const DESTAQUE_DIAS = 7

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

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  try {
    // Autenticar
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401, origin)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return json({ error: 'Não autenticado' }, 401, origin)

    const { veiculoId } = await req.json()
    if (!veiculoId) return json({ error: 'veiculoId é obrigatório' }, 400, origin)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verificar que o veículo pertence ao user
    const { data: veiculo } = await supabaseAdmin
      .from('veiculos')
      .select('id, anunciante_id, garagem_id, marca, modelo, ano, destaque, destaque_ate')
      .eq('id', veiculoId)
      .single()

    if (!veiculo) return json({ error: 'Veículo não encontrado' }, 404, origin)
    if (veiculo.anunciante_id !== user.id) return json({ error: 'Sem permissão' }, 403, origin)

    // Se garagem, verificar se tem destaques no plano
    if (veiculo.garagem_id) {
      const { data: assinatura } = await supabaseAdmin
        .from('assinaturas')
        .select('plano, status')
        .eq('garagem_id', veiculo.garagem_id)
        .maybeSingle()

      if (assinatura && (assinatura.status === 'ativa' || assinatura.status === 'trial')) {
        const limites: Record<string, number> = { starter: 0, pro: 5, premium: 999 }
        const limite = limites[assinatura.plano] ?? 0

        if (limite > 0) {
          // Contar destaques usados neste mês
          const inicioMes = new Date()
          inicioMes.setDate(1)
          inicioMes.setHours(0, 0, 0, 0)

          const { count } = await supabaseAdmin
            .from('destaques_garagem')
            .select('*', { count: 'exact', head: true })
            .eq('garagem_id', veiculo.garagem_id)
            .eq('origem', 'plano')
            .gte('created_at', inicioMes.toISOString())

          const usados = count ?? 0

          if (usados < limite) {
            // Usar destaque do plano (sem cobrar)
            const expiraEm = new Date()
            expiraEm.setDate(expiraEm.getDate() + DESTAQUE_DIAS)

            await supabaseAdmin
              .from('veiculos')
              .update({ destaque: true, destaque_ate: expiraEm.toISOString() })
              .eq('id', veiculoId)

            await supabaseAdmin
              .from('destaques_garagem')
              .insert({
                garagem_id: veiculo.garagem_id,
                veiculo_id: veiculoId,
                origem: 'plano',
                expira_em: expiraEm.toISOString(),
              })

            return json({
              usou_plano: true,
              destaque_ate: expiraEm.toISOString(),
              destaques_restantes: limite - usados - 1,
            }, 200, origin)
          }
          // Se esgotou, cai pro checkout avulso abaixo
        }
      }
    }

    // Checkout avulso via Stripe
    // Buscar ou criar Customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 })
    let customerId: string

    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { user_id: user.id, supabase_project: 'ventoro' },
      })
      customerId = customer.id
    }

    const baseUrl = origin ?? 'https://ventoro.com.br'
    const returnPath = veiculo.garagem_id ? '/painel/estoque' : '/minha-conta/anuncios'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: DESTAQUE_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}${returnPath}?destaque=sucesso&veiculo=${veiculoId}`,
      cancel_url: `${baseUrl}${returnPath}?destaque=cancelado`,
      metadata: {
        tipo: 'destaque',
        veiculo_id: veiculoId,
        user_id: user.id,
        garagem_id: veiculo.garagem_id ?? '',
        dias: String(DESTAQUE_DIAS),
      },
      locale: 'pt-BR',
      payment_method_types: ['card'],
    })

    return json({ url: session.url }, 200, origin)
  } catch (err) {
    console.error('Erro criar-checkout-destaque:', err)
    return json({ error: 'Erro interno' }, 500, origin)
  }
})
