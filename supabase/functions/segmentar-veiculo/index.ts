import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Edge Function: segmentar-veiculo (VenStudio V2)
// Remove fundo do veículo via BiRefNet (Replicate)
// Retorna URL do PNG transparente no bucket processamento-ia
// ============================================================

const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const ALLOWED_ORIGINS = new Set([
  'https://ventoro.com.br',
  'https://www.ventoro.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
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

// cjwbw/rembg on Replicate — background removal (cleaner edges, better glass handling)
const BG_REMOVAL_MODEL = 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003'

serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401, origin)

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return json({ error: 'Não autenticado' }, 401, origin)

    // ── Input ──
    const { foto_url, veiculo_id } = await req.json()
    if (!foto_url || !veiculo_id) {
      return json({ error: 'foto_url e veiculo_id são obrigatórios' }, 400, origin)
    }

    // ── Verificar que o veículo pertence ao usuário ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: veiculo } = await supabase
      .from('veiculos')
      .select('id, anunciante_id, garagem_id')
      .eq('id', veiculo_id)
      .single()

    if (!veiculo) return json({ error: 'Veículo não encontrado' }, 404, origin)

    // Verificar ownership: anunciante direto OU membro da garagem
    const isOwner = veiculo.anunciante_id === user.id
    let isGarageMember = false
    if (!isOwner && veiculo.garagem_id) {
      const { data: membro } = await supabase
        .from('membros_garagem')
        .select('id')
        .eq('garagem_id', veiculo.garagem_id)
        .eq('user_id', user.id)
        .single()
      isGarageMember = !!membro
    }
    if (!isOwner && !isGarageMember) {
      return json({ error: 'Sem permissão' }, 403, origin)
    }

    // ── Chamar BiRefNet via Replicate ──
    const startTime = Date.now()

    const prediction = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({
        version: BG_REMOVAL_MODEL.split(':')[1],
        input: {
          image: foto_url,
        },
      }),
    })

    if (!prediction.ok) {
      const err = await prediction.text()
      console.error('Replicate error:', err)
      return json({ error: 'Falha ao remover fundo' }, 502, origin)
    }

    let result = await prediction.json()

    // Se não resolveu com Prefer: wait, poll
    if (result.status !== 'succeeded') {
      const pollUrl = result.urls?.get
      if (!pollUrl) return json({ error: 'Replicate: sem URL de polling' }, 502, origin)

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const poll = await fetch(pollUrl, {
          headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
        })
        result = await poll.json()
        if (result.status === 'succeeded') break
        if (result.status === 'failed' || result.status === 'canceled') {
          return json({ error: 'Segmentação falhou' }, 502, origin)
        }
      }

      if (result.status !== 'succeeded') {
        return json({ error: 'Timeout na segmentação' }, 504, origin)
      }
    }

    // ── Download PNG result ──
    const pngUrl = typeof result.output === 'string' ? result.output : result.output?.[0] || String(result.output)
    const pngRes = await fetch(pngUrl)
    if (!pngRes.ok) return json({ error: 'Falha ao baixar PNG segmentado' }, 502, origin)
    const pngBuffer = await pngRes.arrayBuffer()

    // ── Upload to processamento-ia bucket ──
    const timestamp = Date.now()
    const path = `${veiculo_id}/seg_${timestamp}.png`

    const { error: uploadError } = await supabase.storage
      .from('processamento-ia')
      .upload(path, pngBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return json({ error: 'Falha ao salvar PNG segmentado' }, 500, origin)
    }

    // URL interna (service role pode ler bucket privado)
    const pngStorageUrl = `${SUPABASE_URL}/storage/v1/object/processamento-ia/${path}`

    const tempoMs = Date.now() - startTime
    console.log(`Segmentação concluída: ${veiculo_id} em ${tempoMs}ms (${(pngBuffer.byteLength / 1024).toFixed(0)} KB)`)

    return json({
      png_url: pngStorageUrl,
      png_path: path,
      tempo_ms: tempoMs,
      tamanho_bytes: pngBuffer.byteLength,
    }, 200, origin)

  } catch (err) {
    console.error('segmentar-veiculo error:', err)
    return json({ error: 'Erro interno na segmentação' }, 500, origin)
  }
})
