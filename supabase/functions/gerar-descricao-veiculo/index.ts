import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Edge Function: gerar-descricao-veiculo
// Usa Claude (Anthropic API) para gerar conteúdo comercial
// Retorna: titulo, descricao, destaques, faq, sugestoes
// ============================================================

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const MAX_GERACOES_POR_VEICULO = 3
const CUSTO_ESTIMADO = 0.02 // R$ por chamada (Sonnet é barato)

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
    const {
      veiculo_id,
      marca, modelo, versao, ano, quilometragem, combustivel, cambio,
      cor, potencia, cidade, estado, opcionais, condicao, preco,
      ipva_pago, revisoes_em_dia, sem_sinistro, fotos_count,
    } = body as {
      veiculo_id?: string
      marca: string; modelo: string; versao: string; ano: string
      quilometragem: string; combustivel: string; cambio: string
      cor: string; potencia: string; cidade: string; estado: string
      opcionais: string[]; condicao: string; preco: string
      ipva_pago: boolean; revisoes_em_dia: boolean; sem_sinistro: boolean
      fotos_count: number
    }

    if (!marca || !modelo) {
      return json({ error: 'marca e modelo são obrigatórios' }, 400, origin)
    }

    // ── Rate limit por veículo (3 gerações) ──
    if (veiculo_id) {
      const { count } = await supabase
        .from('uso_ia')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('veiculo_id', veiculo_id)
        .eq('tipo', 'descricao_ia')
        .eq('status', 'ok')

      if ((count ?? 0) >= MAX_GERACOES_POR_VEICULO) {
        return json({
          error: `Limite de ${MAX_GERACOES_POR_VEICULO} gerações por anúncio atingido.`,
          limite_geracoes: true,
        }, 429, origin)
      }
    }

    // ── Montar prompt ──
    const dadosVeiculo = [
      `Marca: ${marca}`,
      `Modelo: ${modelo}`,
      versao && `Versão: ${versao}`,
      `Ano: ${ano}`,
      `Quilometragem: ${quilometragem} km`,
      combustivel && `Combustível: ${combustivel}`,
      cambio && `Câmbio: ${cambio}`,
      cor && `Cor: ${cor}`,
      potencia && `Potência: ${potencia}`,
      `Cidade/Estado: ${cidade}/${estado}`,
      `Condição: ${condicao}`,
      `Preço: R$ ${Number(preco).toLocaleString('pt-BR')}`,
      opcionais?.length > 0 && `Opcionais: ${opcionais.join(', ')}`,
      ipva_pago && 'IPVA pago',
      revisoes_em_dia && 'Revisões em dia',
      sem_sinistro && 'Sem sinistro',
      fotos_count && `Fotos: ${fotos_count}`,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Você é um especialista em anúncios de veículos no Brasil, trabalhando para o marketplace Ventoro. Gere conteúdo comercial profissional e persuasivo.

Regras obrigatórias:
- Informações devem ser baseadas APENAS nos dados fornecidos
- NÃO invente features, opcionais ou características que não foram informadas
- Preço sempre em reais (R$ X.XXX)
- Mencione cidade/estado
- Se IPVA pago, revisões em dia ou sem sinistro: destaque no texto
- Se quilometragem é baixa para a idade do veículo: destaque
- Linguagem brasileira natural, profissional e persuasiva sem ser apelativa
- Não use frases clichês como "oportunidade única" ou "imperdível"
- Não use CAPS LOCK para enfatizar

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`), com esta estrutura exata:
{
  "titulo": "título otimizado para busca, máximo 80 caracteres",
  "descricao": "descrição comercial completa, 200-400 palavras, parágrafos separados por \\n\\n",
  "destaques": ["até 6 bullet points curtos com os maiores atrativos do veículo"],
  "faq": [
    {"pergunta": "pergunta frequente sobre o veículo", "resposta": "resposta clara e direta"},
    {"pergunta": "...", "resposta": "..."}
  ],
  "sugestoes": ["sugestões para o vendedor melhorar o anúncio, ex: adicionar mais fotos, informar revisões, etc."]
}`

    const userMessage = `Gere o conteúdo comercial para este veículo:\n\n${dadosVeiculo}`

    console.log(`[Copiloto] Gerando para: ${marca} ${modelo} ${ano} — user=${user.id}`)

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error(`[Copiloto] Anthropic API falhou: ${anthropicRes.status}`, errBody)
      throw new Error(`Claude API falhou: ${anthropicRes.status}`)
    }

    const anthropicResult = await anthropicRes.json()
    const responseText = anthropicResult.content?.[0]?.text

    if (!responseText) {
      throw new Error('Claude não retornou conteúdo')
    }

    // ── Parse JSON do resultado ──
    let conteudo: {
      titulo: string
      descricao: string
      destaques: string[]
      faq: { pergunta: string; resposta: string }[]
      sugestoes: string[]
    }

    try {
      // Tentar extrair JSON mesmo se vier com markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta')
      conteudo = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('[Copiloto] Falha ao parsear JSON:', responseText.substring(0, 500))
      throw new Error('Falha ao processar resposta da IA')
    }

    // Validação básica
    if (!conteudo.titulo || !conteudo.descricao) {
      throw new Error('Resposta da IA incompleta')
    }

    const elapsed = Date.now() - startTime

    // ── Registrar uso ──
    await supabase.from('uso_ia').insert({
      user_id: user.id,
      veiculo_id: veiculo_id || null,
      tipo: 'descricao_ia',
      modelo_ia: 'claude-sonnet-4-20250514',
      custo_estimado: CUSTO_ESTIMADO,
      tempo_ms: elapsed,
      status: 'ok',
    })

    console.log(`[Copiloto] Gerado em ${elapsed}ms — titulo: "${conteudo.titulo.substring(0, 50)}..."`)

    return json({
      titulo: conteudo.titulo,
      descricao: conteudo.descricao,
      destaques: conteudo.destaques ?? [],
      faq: conteudo.faq ?? [],
      sugestoes: conteudo.sugestoes ?? [],
      tempo_ms: elapsed,
    }, 200, origin)
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(`[Copiloto] Erro após ${elapsed}ms:`, err)

    // Registrar erro
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
            tipo: 'descricao_ia',
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
      error: 'Não foi possível gerar a descrição. Tente novamente ou escreva manualmente.',
      detalhe: (err as Error).message,
    }, 500, req.headers.get('origin'))
  }
})
