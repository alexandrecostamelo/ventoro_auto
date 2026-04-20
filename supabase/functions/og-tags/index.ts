import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = 'https://ventoro.com.br'
const SPA_URL = SITE_URL // redirect target for humans

// Bot user-agents that don't render JS
const BOT_UA_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Pinterest',
  'Embedly',
]

function isBot(ua: string | null): boolean {
  if (!ua) return false
  return BOT_UA_PATTERNS.some((bot) => ua.includes(bot))
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatKm(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value) + ' km'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
    })
  }

  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')

  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 })
  }

  const ua = req.headers.get('user-agent')

  // If not a bot, redirect to the SPA
  if (!isBot(ua)) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${SPA_URL}/veiculo/${slug}` },
    })
  }

  // Bot: fetch vehicle data and return HTML with OG tags
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: veiculo, error } = await supabase
    .from('veiculos')
    .select('marca, modelo, versao, ano, preco, quilometragem, combustivel, cambio, cidade, estado, slug, descricao, fotos_veiculo(url_processada, url_original, is_capa, ordem)')
    .eq('slug', slug)
    .eq('status', 'publicado')
    .single()

  if (error || !veiculo) {
    return new Response('Veículo não encontrado', { status: 404 })
  }

  // Get cover photo
  const fotos = (veiculo.fotos_veiculo ?? []).sort((a: { is_capa: boolean; ordem: number }, b: { is_capa: boolean; ordem: number }) => {
    if (a.is_capa !== b.is_capa) return a.is_capa ? -1 : 1
    return a.ordem - b.ordem
  })
  const coverPhoto = fotos.length > 0
    ? (fotos[0].url_processada ?? fotos[0].url_original)
    : `${SITE_URL}/placeholder-car.jpg`

  const title = escapeHtml(
    `${veiculo.marca} ${veiculo.modelo} ${veiculo.ano}${veiculo.versao ? ` ${veiculo.versao}` : ''} | ${veiculo.cidade}/${veiculo.estado} | Ventoro`
  )
  const description = escapeHtml(
    `${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} por ${formatPrice(veiculo.preco)}. ${formatKm(veiculo.quilometragem)}. ${veiculo.combustivel}/${veiculo.cambio}. ${veiculo.cidade}. Ver fotos e detalhes no Ventoro.`
  )
  const canonicalUrl = `${SITE_URL}/veiculo/${veiculo.slug}`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <meta property="og:type" content="product" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${escapeHtml(coverPhoto)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="Ventoro" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="product:price:amount" content="${veiculo.preco}" />
  <meta property="product:price:currency" content="BRL" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapeHtml(coverPhoto)}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${canonicalUrl}">Ver anúncio no Ventoro</a>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
})
