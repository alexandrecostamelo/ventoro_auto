import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = 'https://ventoro.com.br'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Veículos publicados
  const { data: veiculos } = await supabase
    .from('veiculos')
    .select('slug, updated_at')
    .eq('status', 'publicado')
    .order('updated_at', { ascending: false })

  // Garagens ativas
  const { data: garagens } = await supabase
    .from('garagens')
    .select('slug, updated_at')
    .eq('ativa', true)
    .order('updated_at', { ascending: false })

  const today = new Date().toISOString().split('T')[0]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/buscar</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`

  if (veiculos) {
    for (const v of veiculos) {
      const lastmod = v.updated_at ? new Date(v.updated_at).toISOString().split('T')[0] : today
      xml += `
  <url>
    <loc>${SITE_URL}/veiculo/${escapeXml(v.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    }
  }

  if (garagens) {
    for (const g of garagens) {
      const lastmod = g.updated_at ? new Date(g.updated_at).toISOString().split('T')[0] : today
      xml += `
  <url>
    <loc>${SITE_URL}/garagem/${escapeXml(g.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    }
  }

  xml += `
</urlset>`

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
})

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
