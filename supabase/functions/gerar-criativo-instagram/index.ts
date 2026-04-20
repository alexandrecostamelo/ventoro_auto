import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Edge Function: gerar-criativo-instagram
// Gera caption + hashtags otimizados para Instagram via Claude
// Fase A: sem Meta API — apenas conteúdo textual
// ============================================================

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CUSTO_ESTIMADO = 0.01 // R$ por chamada
const SITE_URL = 'https://ventoro.com.br'

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
    const { veiculo_id } = body as { veiculo_id: string }

    if (!veiculo_id) {
      return json({ error: 'veiculo_id é obrigatório' }, 400, origin)
    }

    // ── Buscar dados do veículo ──
    const { data: veiculo, error: veicError } = await supabase
      .from('veiculos')
      .select(`
        *,
        fotos_veiculo ( url_original, url_processada, ordem, is_capa ),
        conteudo_ia ( titulo, descricao, highlights )
      `)
      .eq('id', veiculo_id)
      .single()

    if (veicError || !veiculo) {
      return json({ error: 'Veículo não encontrado' }, 404, origin)
    }

    // Verificar ownership
    if (veiculo.anunciante_id !== user.id) {
      return json({ error: 'Sem permissão' }, 403, origin)
    }

    // ── Montar dados para o prompt ──
    const fotos = (veiculo.fotos_veiculo || []).sort(
      (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem
    )
    const fotoCapa = fotos.find((f: { is_capa: boolean }) => f.is_capa) || fotos[0]
    const fotoUrl = fotoCapa?.url_processada || fotoCapa?.url_original || null

    const conteudo = Array.isArray(veiculo.conteudo_ia) ? veiculo.conteudo_ia[0] : null
    const destaques = conteudo?.highlights || []

    const precoFormatado = Number(veiculo.preco).toLocaleString('pt-BR')
    const kmFormatado = Number(veiculo.quilometragem).toLocaleString('pt-BR')
    const link = `${SITE_URL}/veiculo/${veiculo.slug}`

    const dadosTexto = [
      `Marca: ${veiculo.marca}`,
      `Modelo: ${veiculo.modelo}`,
      veiculo.versao && `Versão: ${veiculo.versao}`,
      `Ano: ${veiculo.ano}`,
      `Km: ${kmFormatado}`,
      `Preço: R$ ${precoFormatado}`,
      `Combustível: ${veiculo.combustivel}`,
      `Câmbio: ${veiculo.cambio}`,
      veiculo.cor && `Cor: ${veiculo.cor}`,
      `Cidade: ${veiculo.cidade}/${veiculo.estado}`,
      veiculo.ipva_pago && 'IPVA pago',
      veiculo.revisoes_em_dia && 'Revisões em dia',
      veiculo.sem_sinistro && 'Sem sinistro',
      veiculo.aceita_troca && 'Aceita troca',
      destaques.length > 0 && `Destaques: ${destaques.join(', ')}`,
      `Link: ${link}`,
    ].filter(Boolean).join('\n')

    // ── Prompt Claude ──
    const systemPrompt = `Você é um social media manager especializado em venda de veículos no Brasil, criando conteúdo para Instagram.

Regras:
- Use emojis de forma estratégica (não exagere, 1-2 por linha)
- Caption deve ter no máximo 2000 caracteres
- Inclua o link do anúncio no final
- Mencione a cidade/estado
- Se IPVA pago, revisado ou sem sinistro: destaque com ✅
- Hashtags relevantes (mix de genéricas e específicas da marca/modelo)
- Linguagem brasileira, tom profissional mas acessível
- NÃO invente dados que não foram fornecidos
- Inclua call-to-action no final (ex: "Envie mensagem para mais informações")

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "caption": "texto completo da caption incluindo emojis e quebras de linha (use \\n)",
  "hashtags": ["hashtag1", "hashtag2", "..."],
  "caption_curta": "versão curta (máx 280 chars) para WhatsApp/Twitter"
}`

    const userMessage = `Gere caption para Instagram deste veículo:\n\n${dadosTexto}`

    console.log(`[Criativo] Gerando para: ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} — user=${user.id}`)

    // ── Chamar Claude ──
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error(`[Criativo] Anthropic API falhou: ${anthropicRes.status}`, errBody)
      throw new Error(`Claude API falhou: ${anthropicRes.status}`)
    }

    const anthropicResult = await anthropicRes.json()
    const responseText = anthropicResult.content?.[0]?.text

    if (!responseText) throw new Error('Claude não retornou conteúdo')

    // ── Parse JSON ──
    let resultado: {
      caption: string
      hashtags: string[]
      caption_curta: string
    }

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Nenhum JSON encontrado')
      resultado = JSON.parse(jsonMatch[0])
    } catch {
      console.error('[Criativo] Falha ao parsear JSON:', responseText.substring(0, 500))
      throw new Error('Falha ao processar resposta da IA')
    }

    if (!resultado.caption) throw new Error('Caption vazia')

    // Montar caption final com hashtags
    const hashtagsStr = resultado.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
    const captionFinal = `${resultado.caption}\n\n${hashtagsStr}`

    const elapsed = Date.now() - startTime

    // ── Registrar uso ──
    await supabase.from('uso_ia').insert({
      user_id: user.id,
      veiculo_id,
      tipo: 'outro',
      cenario: 'criativo_instagram',
      modelo_ia: 'claude-sonnet-4-20250514',
      custo_estimado: CUSTO_ESTIMADO,
      tempo_ms: elapsed,
      status: 'ok',
    })

    console.log(`[Criativo] Gerado em ${elapsed}ms`)

    return json({
      caption: captionFinal,
      caption_curta: resultado.caption_curta || '',
      hashtags: resultado.hashtags,
      foto_url: fotoUrl,
      veiculo: {
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        versao: veiculo.versao,
        ano: veiculo.ano,
        preco: veiculo.preco,
        preco_formatado: `R$ ${precoFormatado}`,
        km_formatado: `${kmFormatado} km`,
        cidade: veiculo.cidade,
        estado: veiculo.estado,
        slug: veiculo.slug,
        preco_status: veiculo.preco_status,
        score_confianca: veiculo.score_confianca,
        ipva_pago: veiculo.ipva_pago,
        revisoes_em_dia: veiculo.revisoes_em_dia,
        sem_sinistro: veiculo.sem_sinistro,
        selo_studio_ia: veiculo.selo_studio_ia,
      },
      link: link,
      tempo_ms: elapsed,
    }, 200, origin)
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(`[Criativo] Erro após ${elapsed}ms:`, err)

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: { user } } = await supabaseUser.auth.getUser()
        if (user) {
          await supabase.from('uso_ia').insert({
            user_id: user.id,
            tipo: 'outro',
            cenario: 'criativo_instagram',
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
