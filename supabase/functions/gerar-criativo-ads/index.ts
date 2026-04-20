import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Edge Function: gerar-criativo-ads
// Gera copy + segmentação para campanhas de tráfego pago
// Formatos: feed (1080x1080), stories (1080x1920), google_display
// Imagem renderizada client-side — aqui só gera o texto
// ============================================================

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CUSTO_ESTIMADO = 0.015
const SITE_URL = 'https://ventoro.com.br'
const FORMATOS_VALIDOS = ['feed', 'stories', 'google_display'] as const

const ALLOWED_ORIGINS = new Set([
  'https://ventoro.com.br',
  'https://www.ventoro.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
  // TODO: substituir pelo domínio real após deploy Vercel
  'https://ventoro.vercel.app',
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
    const { veiculo_id, formato } = body as { veiculo_id: string; formato: string }

    if (!veiculo_id) return json({ error: 'veiculo_id é obrigatório' }, 400, origin)
    if (!FORMATOS_VALIDOS.includes(formato as typeof FORMATOS_VALIDOS[number])) {
      return json({ error: `Formato inválido. Use: ${FORMATOS_VALIDOS.join(', ')}` }, 400, origin)
    }

    // ── Buscar veículo ──
    const { data: veiculo, error: veicError } = await supabase
      .from('veiculos')
      .select(`
        *,
        fotos_veiculo ( url_original, url_processada, ordem, is_capa ),
        garagens ( nome, cidade, estado, slug )
      `)
      .eq('id', veiculo_id)
      .single()

    if (veicError || !veiculo) return json({ error: 'Veículo não encontrado' }, 404, origin)
    if (veiculo.anunciante_id !== user.id) return json({ error: 'Sem permissão' }, 403, origin)

    // ── Foto de capa ──
    const fotos = (veiculo.fotos_veiculo || []).sort(
      (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem
    )
    const fotoCapa = fotos.find((f: { is_capa: boolean }) => f.is_capa) || fotos[0]
    const fotoUrl = fotoCapa?.url_processada || fotoCapa?.url_original || null

    const garagem = Array.isArray(veiculo.garagens) ? veiculo.garagens[0] : veiculo.garagens
    const precoFmt = Number(veiculo.preco).toLocaleString('pt-BR')
    const kmFmt = Number(veiculo.quilometragem).toLocaleString('pt-BR')
    const link = `${SITE_URL}/veiculo/${veiculo.slug}`

    // ── Prompt ──
    const formatoDesc: Record<string, string> = {
      feed: 'Facebook/Instagram Feed (1080x1080) — copy curta e impactante, max 125 chars no primário',
      stories: 'Instagram/Facebook Stories (1080x1920) — copy ultra-curta, max 80 chars, urgência',
      google_display: 'Google Display Network (banners) — headline max 30 chars, descrição max 90 chars',
    }

    const dadosVeiculo = [
      `${veiculo.marca} ${veiculo.modelo} ${veiculo.versao || ''} ${veiculo.ano}`,
      `Preço: R$ ${precoFmt}`,
      `Km: ${kmFmt}`,
      `Combustível: ${veiculo.combustivel}, Câmbio: ${veiculo.cambio}`,
      veiculo.cor && `Cor: ${veiculo.cor}`,
      `Cidade: ${veiculo.cidade}/${veiculo.estado}`,
      veiculo.ipva_pago && 'IPVA pago',
      veiculo.revisoes_em_dia && 'Revisões em dia',
      veiculo.sem_sinistro && 'Sem sinistro',
      veiculo.aceita_troca && 'Aceita troca',
      garagem && `Garagem: ${garagem.nome}`,
      veiculo.preco_status === 'abaixo' && 'Preço ABAIXO da FIPE',
      veiculo.selo_studio_ia && 'Fotos profissionais VenStudio',
      veiculo.selo_inspecao && 'Inspeção IA aprovada',
    ].filter(Boolean).join('\n')

    const systemPrompt = `Você é um especialista em performance marketing automotivo no Brasil. Crie copy para anúncio pago.

Formato: ${formatoDesc[formato]}

Regras RIGOROSAS:
- Copy deve ser PERSUASIVA e orientada a CONVERSÃO
- Use gatilhos: urgência, escassez, prova social, autoridade
- Se preço abaixo da FIPE: destaque isso fortemente
- Se tem inspeção/VenStudio: use como diferencial de confiança
- Adapte o tom ao formato (feed=informativo, stories=urgente, display=direto)
- NÃO use emojis em Google Display
- CTA deve ser claro e acionável
- Segmentação deve ser REALISTA para o tipo de veículo
  - Carro popular: 22-45 anos, raio maior
  - Carro premium: 30-55 anos, raio menor, interesses premium
  - SUV: famílias, 28-50 anos
  - Esportivo: 25-45 anos, interesses específicos

Retorne APENAS JSON válido:
{
  "copy_primaria": "texto principal do anúncio",
  "copy_secundaria": "headline/subtítulo",
  "cta": "texto do botão (ex: Ver veículo, Agendar visita, Saiba mais)",
  "segmentacao": {
    "idade_min": 25,
    "idade_max": 55,
    "genero": "todos",
    "interesses": ["carros", "veículos seminovos"],
    "raio_km": 30,
    "localizacao": "${veiculo.cidade}, ${veiculo.estado}"
  }
}`

    console.log(`[Ads] Gerando ${formato} para: ${veiculo.marca} ${veiculo.modelo} — user=${user.id}`)

    // ── Claude ──
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Crie o criativo para este veículo:\n\n${dadosVeiculo}` }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error(`[Ads] Anthropic falhou: ${anthropicRes.status}`, errBody)
      throw new Error(`Claude API falhou: ${anthropicRes.status}`)
    }

    const anthropicResult = await anthropicRes.json()
    const responseText = anthropicResult.content?.[0]?.text
    if (!responseText) throw new Error('Claude não retornou conteúdo')

    let resultado: {
      copy_primaria: string
      copy_secundaria: string
      cta: string
      segmentacao: Record<string, unknown>
    }

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado')
      resultado = JSON.parse(jsonMatch[0])
    } catch {
      console.error('[Ads] Parse falhou:', responseText.substring(0, 500))
      throw new Error('Falha ao processar resposta da IA')
    }

    if (!resultado.copy_primaria || !resultado.copy_secundaria) {
      throw new Error('Copy incompleta')
    }

    // ── Snapshot do veículo (para reconstruir criativo client-side) ──
    const veiculoSnapshot = {
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      versao: veiculo.versao,
      ano: veiculo.ano,
      preco: veiculo.preco,
      preco_formatado: `R$ ${precoFmt}`,
      km_formatado: `${kmFmt} km`,
      cidade: veiculo.cidade,
      estado: veiculo.estado,
      preco_status: veiculo.preco_status,
      score_confianca: veiculo.score_confianca,
      ipva_pago: veiculo.ipva_pago,
      selo_studio_ia: veiculo.selo_studio_ia,
      selo_inspecao: veiculo.selo_inspecao,
      slug: veiculo.slug,
    }

    // ── Salvar no banco ──
    const { data: criativo, error: insertError } = await supabase
      .from('criativos_ads')
      .insert({
        veiculo_id,
        garagem_id: veiculo.garagem_id || null,
        anunciante_id: user.id,
        formato,
        copy_primaria: resultado.copy_primaria,
        copy_secundaria: resultado.copy_secundaria,
        cta: resultado.cta || 'Saiba mais',
        segmentacao: resultado.segmentacao || {},
        veiculo_snapshot: veiculoSnapshot,
        foto_url: fotoUrl,
      })
      .select('id')
      .single()

    if (insertError) {
      console.warn('[Ads] Falha ao salvar criativo:', insertError.message)
    }

    const elapsed = Date.now() - startTime

    // ── Registrar uso ──
    await supabase.from('uso_ia').insert({
      user_id: user.id,
      veiculo_id,
      tipo: 'outro',
      cenario: `criativo_ads_${formato}`,
      modelo_ia: 'claude-sonnet-4-20250514',
      custo_estimado: CUSTO_ESTIMADO,
      tempo_ms: elapsed,
      status: 'ok',
    })

    console.log(`[Ads] ${formato} gerado em ${elapsed}ms`)

    return json({
      id: criativo?.id || null,
      formato,
      copy_primaria: resultado.copy_primaria,
      copy_secundaria: resultado.copy_secundaria,
      cta: resultado.cta || 'Saiba mais',
      segmentacao: resultado.segmentacao || {},
      foto_url: fotoUrl,
      veiculo: veiculoSnapshot,
      url_destino: link,
      tempo_ms: elapsed,
    }, 200, origin)
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(`[Ads] Erro após ${elapsed}ms:`, err)

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const su = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: { user } } = await su.auth.getUser()
        if (user) {
          await supabase.from('uso_ia').insert({
            user_id: user.id,
            tipo: 'outro',
            cenario: 'criativo_ads',
            modelo_ia: 'claude-sonnet-4-20250514',
            custo_estimado: 0,
            tempo_ms: elapsed,
            status: 'erro',
            erro_msg: (err as Error).message?.substring(0, 500),
          })
        }
      }
    } catch { /* ignore */ }

    return json({
      error: 'Não foi possível gerar o criativo. Tente novamente.',
      detalhe: (err as Error).message,
    }, 500, origin)
  }
})
