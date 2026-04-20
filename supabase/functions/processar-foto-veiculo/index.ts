import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Edge Function: processar-foto-veiculo
// Pipeline VenStudio IA:
//   1. Baixar foto original do bucket
//   2. Replicate RMBG-2.0 → remover fundo
//   3. GPT Image (gpt-image-1) → composição em cenário
//   4. Upload resultado ao bucket
//   5. UPDATE fotos_veiculo.url_processada
//   6. INSERT uso_ia (controle de custo)
// ============================================================

const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const RATE_LIMIT_DIA = 20
const CUSTO_RMBG = 0.03    // R$ por chamada
const CUSTO_GPT_IMG = 0.15 // R$ por chamada

// Cenários com prompts otimizados para GPT Image
const CENARIOS: Record<string, { nome: string; prompt: string }> = {
  showroom_escuro: {
    nome: 'Showroom Escuro',
    prompt: 'Place this vehicle in a premium dark showroom environment with polished black floor reflecting the car, dramatic side lighting with warm highlights, professional car dealership photography, ultra realistic, 4K quality',
  },
  estudio_branco: {
    nome: 'Estúdio Branco',
    prompt: 'Place this vehicle in a clean white photography studio with soft diffused lighting from above, subtle floor reflection, professional automotive product photography, minimalist background, ultra realistic, 4K quality',
  },
  garagem_premium: {
    nome: 'Garagem Premium',
    prompt: 'Place this vehicle in a luxury garage with exposed concrete walls, warm Edison bulb lighting, industrial-chic atmosphere, premium car storage facility, ultra realistic, 4K quality',
  },
  urbano_noturno: {
    nome: 'Urbano Noturno',
    prompt: 'Place this vehicle on a modern city street at night with wet asphalt reflections, neon lights in background, cinematic urban photography, dramatic lighting, ultra realistic, 4K quality',
  },
  neutro_gradiente: {
    nome: 'Fundo Neutro',
    prompt: 'Place this vehicle on a clean neutral gray gradient background, professional automotive catalog photography, soft even lighting, no distractions, ultra realistic, 4K quality',
  },
}

/** Converte ArrayBuffer para base64 sem estourar a stack */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunks: string[] = []
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)))
  }
  return btoa(chunks.join(''))
}

const ALLOWED_ORIGINS = new Set([
  'https://ventoro.com.br',
  'https://www.ventoro.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
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

  const startTime = Date.now()

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401, origin)

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return json({ error: 'Não autenticado' }, 401, origin)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── Input ──
    const body = await req.json()
    const { foto_url, foto_id, cenario, veiculo_id, melhorar_qualidade } = body as {
      foto_url: string
      foto_id: string
      cenario: string
      veiculo_id: string
      melhorar_qualidade?: boolean
    }

    if (!foto_url || !veiculo_id || !cenario) {
      return json({ error: 'foto_url, veiculo_id e cenario são obrigatórios' }, 400, origin)
    }

    const cenarioConfig = CENARIOS[cenario]
    if (!cenarioConfig) {
      return json({ error: `Cenário inválido. Opções: ${Object.keys(CENARIOS).join(', ')}` }, 400, origin)
    }

    // ── Verificar ownership ──
    const { data: veiculo } = await supabase
      .from('veiculos')
      .select('id, anunciante_id, garagem_id')
      .eq('id', veiculo_id)
      .single()

    if (!veiculo || veiculo.anunciante_id !== user.id) {
      return json({ error: 'Veículo não encontrado ou sem permissão' }, 403, origin)
    }

    // ── Rate limit (20/dia) ──
    const { data: usoHoje } = await supabase.rpc('contar_uso_ia_hoje', { p_user_id: user.id })
    if ((usoHoje ?? 0) >= RATE_LIMIT_DIA) {
      return json({
        error: `Limite diário de ${RATE_LIMIT_DIA} processamentos atingido. Tente novamente amanhã.`,
        limite_diario: true,
      }, 429, origin)
    }

    // ── Verificar quota do plano (garagem Pro/Premium tem fotos incluídas) ──
    let inclusoNoPlano = false
    if (veiculo.garagem_id) {
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('plano, status')
        .eq('garagem_id', veiculo.garagem_id)
        .maybeSingle()

      if (assinatura && (assinatura.status === 'ativa' || assinatura.status === 'trial')) {
        const limites: Record<string, number> = { starter: 0, pro: 30, premium: 999 }
        const limite = limites[assinatura.plano] ?? 0

        if (limite > 0) {
          const { data: usoMes } = await supabase.rpc('contar_uso_ia_mes', { p_user_id: user.id })
          if ((usoMes ?? 0) < limite) {
            inclusoNoPlano = true
          } else {
            return json({
              error: `Limite mensal de ${limite} fotos IA do plano ${assinatura.plano} atingido.`,
              limite_plano: true,
            }, 429, origin)
          }
        }
      }
    }
    // Se não é garagem com plano, o processamento é cobrado (particular/starter)
    // A cobrança é controlada pelo frontend/checkout — aqui apenas registramos

    // ── Estágio 1: Baixar foto original ──
    console.log(`[VenStudio] Iniciando: user=${user.id} veiculo=${veiculo_id} cenario=${cenario}`)

    const fotoRes = await fetch(foto_url)
    if (!fotoRes.ok) {
      throw new Error(`Falha ao baixar foto original: ${fotoRes.status}`)
    }
    const fotoBuffer = await fotoRes.arrayBuffer()
    const fotoBase64 = arrayBufferToBase64(fotoBuffer)
    const fotoMime = fotoRes.headers.get('content-type') || 'image/jpeg'

    console.log(`[VenStudio] Foto baixada: ${(fotoBuffer.byteLength / 1024).toFixed(0)}KB`)

    // ── Estágio 2: Remover fundo via Replicate (RMBG-2.0) ──
    let semFundoBase64: string

    const rmbgResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
        input: {
          image: `data:${fotoMime};base64,${fotoBase64}`,
        },
      }),
    })

    if (!rmbgResponse.ok) {
      const errBody = await rmbgResponse.text()
      console.error(`[VenStudio] RMBG falhou: ${rmbgResponse.status}`, errBody)
      throw new Error(`Remoção de fundo falhou: ${rmbgResponse.status}`)
    }

    const rmbgResult = await rmbgResponse.json()

    // Se retornou status != succeeded, pode ser que precise polling
    if (rmbgResult.status === 'failed') {
      throw new Error(`RMBG falhou: ${rmbgResult.error || 'erro desconhecido'}`)
    }

    // Se ainda processando, fazer polling
    let rmbgOutput = rmbgResult.output
    if (!rmbgOutput && rmbgResult.urls?.get) {
      // Polling com timeout de 60s
      const pollUrl = rmbgResult.urls.get
      const pollDeadline = Date.now() + 55000
      while (Date.now() < pollDeadline) {
        await new Promise(r => setTimeout(r, 2000))
        const pollRes = await fetch(pollUrl, {
          headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
        })
        const pollData = await pollRes.json()
        if (pollData.status === 'succeeded') {
          rmbgOutput = pollData.output
          break
        }
        if (pollData.status === 'failed') {
          throw new Error(`RMBG falhou: ${pollData.error || 'erro desconhecido'}`)
        }
      }
      if (!rmbgOutput) {
        throw new Error('RMBG timeout: processamento demorou demais')
      }
    }

    // rmbgOutput é uma URL do resultado (PNG sem fundo)
    const semFundoUrl = typeof rmbgOutput === 'string' ? rmbgOutput : rmbgOutput
    const semFundoRes = await fetch(semFundoUrl)
    if (!semFundoRes.ok) throw new Error('Falha ao baixar resultado RMBG')
    const semFundoBuffer = await semFundoRes.arrayBuffer()
    semFundoBase64 = arrayBufferToBase64(semFundoBuffer)

    console.log(`[VenStudio] Fundo removido: ${(semFundoBuffer.byteLength / 1024).toFixed(0)}KB`)

    // ── Estágio 3: Composição em cenário via GPT Image ──
    const gptImageResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: (() => {
        const formData = new FormData()
        const semFundoBlob = new Blob(
          [Uint8Array.from(atob(semFundoBase64), c => c.charCodeAt(0))],
          { type: 'image/png' }
        )
        formData.append('image', semFundoBlob, 'vehicle.png')
        formData.append('prompt', cenarioConfig.prompt)
        formData.append('model', 'gpt-image-1')
        formData.append('size', '1536x1024')
        formData.append('quality', melhorar_qualidade ? 'high' : 'medium')
        return formData
      })(),
    })

    if (!gptImageResponse.ok) {
      const errBody = await gptImageResponse.text()
      console.error(`[VenStudio] GPT Image falhou: ${gptImageResponse.status}`, errBody)
      throw new Error(`Composição de cenário falhou: ${gptImageResponse.status}`)
    }

    const gptImageResult = await gptImageResponse.json()
    const resultadoB64 = gptImageResult.data?.[0]?.b64_json

    if (!resultadoB64) {
      // Fallback: tentar URL
      const resultadoUrl = gptImageResult.data?.[0]?.url
      if (!resultadoUrl) throw new Error('GPT Image não retornou imagem')

      const resultRes = await fetch(resultadoUrl)
      if (!resultRes.ok) throw new Error('Falha ao baixar resultado GPT Image')
      const resultBuffer = await resultRes.arrayBuffer()
      const resultB64 = arrayBufferToBase64(resultBuffer)
      // Use this for upload below
      await uploadAndFinalize(supabase, veiculo_id, foto_id, resultB64, cenario, user.id, startTime, origin)
      return json({ error: null }, 200, origin) // will be overridden
    }

    // ── Estágio 4: Upload resultado ao bucket ──
    return await uploadAndFinalize(supabase, veiculo_id, foto_id, resultadoB64, cenario, user.id, startTime, origin)
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(`[VenStudio] Erro após ${elapsed}ms:`, err)

    // Registrar erro no uso_ia
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: { user } } = await supabaseUser.auth.getUser()
        if (user) {
          const body = await req.json().catch(() => ({}))
          await supabase.from('uso_ia').insert({
            user_id: user.id,
            veiculo_id: body.veiculo_id || null,
            foto_id: body.foto_id || null,
            tipo: 'venstudio',
            cenario: body.cenario || null,
            modelo_ia: 'pipeline',
            custo_estimado: CUSTO_RMBG, // partial cost
            tempo_ms: elapsed,
            status: 'erro',
            erro_msg: (err as Error).message?.substring(0, 500),
          })
        }
      }
    } catch { /* ignore logging errors */ }

    const origin2 = req.headers.get('origin')
    return json({
      error: 'Não foi possível processar a foto. Tente novamente ou continue com a foto original.',
      detalhe: (err as Error).message,
    }, 500, origin2)
  }
})

// ============================================================
// Upload do resultado e finalização
// ============================================================

async function uploadAndFinalize(
  supabase: ReturnType<typeof createClient>,
  veiculoId: string,
  fotoId: string | null,
  resultadoBase64: string,
  cenario: string,
  userId: string,
  startTime: number,
  origin: string | null,
) {
  const elapsed = Date.now() - startTime
  const nomeArquivo = `processada_${cenario}_${Date.now()}.jpg`
  const path = `${veiculoId}/${nomeArquivo}`

  // Converter base64 para Uint8Array para upload
  const binaryStr = atob(resultadoBase64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }

  const { error: uploadError } = await supabase.storage
    .from('fotos-veiculos')
    .upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Upload falhou: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from('fotos-veiculos')
    .getPublicUrl(path)

  console.log(`[VenStudio] Upload ok: ${publicUrl}`)

  // ── UPDATE fotos_veiculo ──
  if (fotoId) {
    await supabase
      .from('fotos_veiculo')
      .update({
        url_processada: publicUrl,
        processada_por_ia: true,
        cenario_ia: cenario,
      })
      .eq('id', fotoId)
  }

  // Marcar veículo com selo VenStudio
  await supabase
    .from('veiculos')
    .update({ selo_studio_ia: true })
    .eq('id', veiculoId)

  // ── INSERT uso_ia ──
  const custoTotal = CUSTO_RMBG + CUSTO_GPT_IMG
  await supabase.from('uso_ia').insert({
    user_id: userId,
    veiculo_id: veiculoId,
    foto_id: fotoId || null,
    tipo: 'venstudio',
    cenario,
    modelo_ia: 'rmbg-2.0+gpt-image-1',
    custo_estimado: custoTotal,
    tempo_ms: elapsed,
    status: 'ok',
  })

  console.log(`[VenStudio] Concluído em ${elapsed}ms. Custo estimado: R$ ${custoTotal.toFixed(2)}`)

  return json({
    url_processada: publicUrl,
    cenario,
    tempo_ms: elapsed,
    custo_estimado: custoTotal,
  }, 200, origin)
}
