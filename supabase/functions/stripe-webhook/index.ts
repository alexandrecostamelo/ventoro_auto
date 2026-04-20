import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Mapeamento price_id → plano (sincronizar com planLimits.ts)
const PRICE_TO_PLANO: Record<string, string> = {
  // SUBSTITUIR pelos Price IDs reais do Stripe
  'price_PLACEHOLDER_STARTER': 'starter',
  'price_PLACEHOLDER_PRO': 'pro',
  'price_PLACEHOLDER_PREMIUM': 'premium',
}

const PLANO_VALORES: Record<string, number> = {
  starter: 99.90,
  pro: 299.90,
  premium: 499.90,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
  }

  console.log(`Stripe event: ${event.type} [${event.id}]`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Evento não tratado: ${event.type}`)
    }
  } catch (err) {
    console.error(`Erro processando ${event.type}:`, err)
    // Retornar 200 mesmo assim para o Stripe não retentar indefinidamente
    // O erro é logado para investigação
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ============================================================
// HANDLERS
// ============================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Destaque avulso (payment mode)
  if (session.mode === 'payment' && session.metadata?.tipo === 'destaque') {
    await handleDestaquePayment(session)
    return
  }

  const garagemId = session.metadata?.garagem_id
  if (!garagemId) {
    console.error('checkout.session.completed sem garagem_id nos metadata')
    return
  }

  const plano = session.metadata?.plano ?? 'starter'

  if (session.mode === 'subscription' && session.subscription) {
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id

    // Buscar subscription para pegar dados do período
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    await supabase
      .from('assinaturas')
      .update({
        status: subscription.status === 'trialing' ? 'trial' : 'ativa',
        plano,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
        periodo_inicio: new Date(subscription.current_period_start * 1000).toISOString(),
        periodo_fim: new Date(subscription.current_period_end * 1000).toISOString(),
        valor_mensal: PLANO_VALORES[plano] ?? 0,
        proxima_cobranca: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelada_em: null,
      })
      .eq('garagem_id', garagemId)

    // Atualizar plano da garagem também
    await supabase
      .from('garagens')
      .update({ plano })
      .eq('id', garagemId)

    console.log(`Assinatura ativada: garagem=${garagemId} plano=${plano}`)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const garagemId = subscription.metadata?.garagem_id

  // Se não tem garagem_id no metadata, buscar pelo stripe_customer_id
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const { data: assinatura } = garagemId
    ? await supabase.from('assinaturas').select('garagem_id').eq('garagem_id', garagemId).single()
    : await supabase.from('assinaturas').select('garagem_id').eq('stripe_customer_id', customerId).single()

  if (!assinatura) {
    console.error('Subscription updated: assinatura não encontrada', { customerId, garagemId })
    return
  }

  const priceId = subscription.items.data[0]?.price?.id
  const plano = priceId ? (PRICE_TO_PLANO[priceId] ?? 'starter') : 'starter'

  let status: string
  switch (subscription.status) {
    case 'active': status = 'ativa'; break
    case 'trialing': status = 'trial'; break
    case 'past_due': status = 'inadimplente'; break
    case 'canceled': status = 'cancelada'; break
    case 'unpaid': status = 'inadimplente'; break
    default: status = 'ativa'
  }

  await supabase
    .from('assinaturas')
    .update({
      status,
      plano,
      stripe_price_id: priceId,
      periodo_inicio: new Date(subscription.current_period_start * 1000).toISOString(),
      periodo_fim: new Date(subscription.current_period_end * 1000).toISOString(),
      proxima_cobranca: new Date(subscription.current_period_end * 1000).toISOString(),
      valor_mensal: PLANO_VALORES[plano] ?? 0,
      cancelada_em: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('garagem_id', assinatura.garagem_id)

  // Sincronizar plano na garagem
  await supabase
    .from('garagens')
    .update({ plano })
    .eq('id', assinatura.garagem_id)

  console.log(`Subscription updated: garagem=${assinatura.garagem_id} status=${status} plano=${plano}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('garagem_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!assinatura) {
    console.error('Subscription deleted: assinatura não encontrada', { customerId })
    return
  }

  await supabase
    .from('assinaturas')
    .update({
      status: 'cancelada',
      cancelada_em: new Date().toISOString(),
    })
    .eq('garagem_id', assinatura.garagem_id)

  // Rebaixar garagem para starter
  await supabase
    .from('garagens')
    .update({ plano: 'starter' })
    .eq('id', assinatura.garagem_id)

  console.log(`Subscription deleted: garagem=${assinatura.garagem_id} → rebaixada para starter`)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('garagem_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!assinatura) return

  // Idempotência: verificar se já registrou este invoice
  const { data: existing } = await supabase
    .from('pagamentos')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle()

  if (existing) {
    console.log(`Invoice ${invoice.id} já registrado, ignorando`)
    return
  }

  // Registrar pagamento
  await supabase.from('pagamentos').insert({
    garagem_id: assinatura.garagem_id,
    stripe_invoice_id: invoice.id,
    stripe_payment_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id,
    tipo: 'assinatura',
    plano: 'stripe', // será resolvido pelo plano atual
    valor: (invoice.amount_paid ?? 0) / 100,
    status: 'pago',
    pago_em: new Date().toISOString(),
    anunciante_id: assinatura.garagem_id, // placeholder — campo obrigatório
  })

  console.log(`Invoice pago: ${invoice.id} garagem=${assinatura.garagem_id}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('garagem_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!assinatura) return

  await supabase
    .from('assinaturas')
    .update({ status: 'inadimplente' })
    .eq('garagem_id', assinatura.garagem_id)

  console.log(`Invoice falhou: ${invoice.id} garagem=${assinatura.garagem_id} → inadimplente`)
}

// ============================================================
// DESTAQUE AVULSO
// ============================================================

async function handleDestaquePayment(session: Stripe.Checkout.Session) {
  const veiculoId = session.metadata?.veiculo_id
  const userId = session.metadata?.user_id
  const garagemId = session.metadata?.garagem_id || null
  const dias = parseInt(session.metadata?.dias ?? '7', 10)

  if (!veiculoId) {
    console.error('Destaque payment sem veiculo_id nos metadata')
    return
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null

  // Idempotência: verificar se já processou este payment
  if (paymentIntentId) {
    const { data: existing } = await supabase
      .from('destaques_garagem')
      .select('id')
      .eq('stripe_payment_id', paymentIntentId)
      .maybeSingle()

    if (existing) {
      console.log(`Destaque payment ${paymentIntentId} já processado, ignorando`)
      return
    }
  }

  const expiraEm = new Date()
  expiraEm.setDate(expiraEm.getDate() + dias)

  // Ativar destaque no veículo
  await supabase
    .from('veiculos')
    .update({ destaque: true, destaque_ate: expiraEm.toISOString() })
    .eq('id', veiculoId)

  // Registrar na tabela de controle
  await supabase
    .from('destaques_garagem')
    .insert({
      garagem_id: garagemId,
      veiculo_id: veiculoId,
      origem: 'avulso',
      stripe_payment_id: paymentIntentId,
      expira_em: expiraEm.toISOString(),
    })

  // Registrar pagamento
  await supabase.from('pagamentos').insert({
    anunciante_id: userId,
    veiculo_id: veiculoId,
    garagem_id: garagemId,
    stripe_payment_id: paymentIntentId,
    tipo: 'anuncio',
    plano: 'destaque',
    valor: (session.amount_total ?? 2990) / 100,
    status: 'pago',
    pago_em: new Date().toISOString(),
  })

  console.log(`Destaque ativado: veiculo=${veiculoId} até ${expiraEm.toISOString()}`)
}
