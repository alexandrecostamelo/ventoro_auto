import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Edge Function: inspecionar-veiculo
// Usa Claude Vision para analisar fotos e detectar danos visíveis
// Gera score de condição + relatório detalhado
// ============================================================

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CUSTO_POR_FOTO = 0.015 // R$ estimado por foto (~$0.003 USD)
const MAX_FOTOS = 12

const ANGULOS = [
  'frente',
  'traseira',
  'lateral_esquerda',
  'lateral_direita',
  'painel',
  'motor',
  'pneu_dianteiro',
  'pneu_traseiro',
] as const

type Angulo = typeof ANGULOS[number]

interface DanoDetectado {
  tipo: string          // risco, amassado, diferenca_pintura, trinca, ferrugem, desgaste
  regiao: string        // porta_esquerda, para_choque_dianteiro, etc.
  severidade: 'leve' | 'moderado' | 'grave'
  descricao: string
  foto_angulo: string
  confianca: number     // 0-1
}

interface ResultadoInspecao {
  score_condicao: number
  danos: DanoDetectado[]
  resumo: string
  detalhes_por_angulo: Record<string, { status: string; observacoes: string }>
}

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

// Baixar imagem e converter para base64
async function imagemParaBase64(url: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = await res.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
    // Claude aceita: image/jpeg, image/png, image/gif, image/webp
    const mediaType = contentType.startsWith('image/') ? contentType.split(';')[0] : 'image/jpeg'
    return { base64, mediaType }
  } catch (err) {
    console.error(`[Inspeção] Falha ao baixar imagem: ${url}`, err)
    return null
  }
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
    const { veiculo_id, fotos } = body as {
      veiculo_id: string
      fotos: Array<{ url: string; angulo: string }>
    }

    if (!veiculo_id) return json({ error: 'veiculo_id é obrigatório' }, 400, origin)
    if (!fotos || fotos.length < 4) {
      return json({ error: 'Mínimo de 4 fotos para inspeção' }, 400, origin)
    }
    if (fotos.length > MAX_FOTOS) {
      return json({ error: `Máximo de ${MAX_FOTOS} fotos` }, 400, origin)
    }

    // ── Verificar ownership ──
    const { data: veiculo, error: veicError } = await supabase
      .from('veiculos')
      .select('id, anunciante_id, marca, modelo, versao, ano, quilometragem, cor, condicao')
      .eq('id', veiculo_id)
      .single()

    if (veicError || !veiculo) return json({ error: 'Veículo não encontrado' }, 404, origin)
    if (veiculo.anunciante_id !== user.id) return json({ error: 'Sem permissão' }, 403, origin)

    // ── Verificar inspeção existente (limite: 1 por dia) ──
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const { count: inspecoesHoje } = await supabase
      .from('inspecao_visual')
      .select('*', { count: 'exact', head: true })
      .eq('anunciante_id', user.id)
      .gte('created_at', hoje.toISOString())

    if ((inspecoesHoje ?? 0) >= 3) {
      return json({ error: 'Limite de 3 inspeções por dia atingido.' }, 429, origin)
    }

    console.log(`[Inspeção] Iniciando: ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} — ${fotos.length} fotos — user=${user.id}`)

    // ── Preparar imagens para Claude Vision ──
    const imagensContent: Array<{
      type: 'image'
      source: { type: 'base64'; media_type: string; data: string }
    } | { type: 'text'; text: string }> = []

    const fotosProcessadas: Array<{ url: string; angulo: string }> = []

    for (const foto of fotos) {
      const imgData = await imagemParaBase64(foto.url)
      if (!imgData) {
        console.warn(`[Inspeção] Falha ao carregar foto: ${foto.angulo}`)
        continue
      }

      imagensContent.push({
        type: 'text',
        text: `[Foto: ${foto.angulo.replace(/_/g, ' ')}]`,
      })
      imagensContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imgData.mediaType,
          data: imgData.base64,
        },
      })
      fotosProcessadas.push(foto)
    }

    if (fotosProcessadas.length < 4) {
      return json({ error: 'Não foi possível carregar fotos suficientes (mín. 4)' }, 400, origin)
    }

    // ── Prompt de inspeção ──
    const systemPrompt = `Você é um inspetor veicular profissional brasileiro com 20 anos de experiência. Analise as fotos deste veículo para detectar danos visíveis.

Informações do veículo:
- ${veiculo.marca} ${veiculo.modelo} ${veiculo.versao || ''} ${veiculo.ano}
- ${Number(veiculo.quilometragem).toLocaleString('pt-BR')} km
- Cor: ${veiculo.cor || 'não informada'}
- Condição declarada: ${veiculo.condicao}

Para CADA foto, analise cuidadosamente:
1. Riscos na pintura (linhas finas na superfície)
2. Amassados (deformações na lataria)
3. Diferenças de pintura (tons diferentes indicando repintura)
4. Trincas em vidros ou faróis
5. Ferrugem ou corrosão
6. Desgaste de pneus
7. Condição do interior (painel, bancos, volante)
8. Condição do motor (vazamentos, sujeira excessiva)

Regras:
- Só reporte danos que são VISÍVEIS nas fotos com confiança > 0.5
- NÃO invente danos que não são claramente visíveis
- Seja específico na localização (ex: "porta traseira esquerda, próximo à maçaneta")
- Severidade: leve (estético), moderado (visível mas não estrutural), grave (estrutural ou grande extensão)
- Score 100 = perfeito sem danos, 0 = muito danificado
- Veículos com km alta naturalmente terão mais desgaste — considere a idade

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "score_condicao": 85,
  "danos": [
    {
      "tipo": "risco",
      "regiao": "porta_dianteira_esquerda",
      "severidade": "leve",
      "descricao": "Risco superficial de aproximadamente 15cm na porta dianteira esquerda",
      "foto_angulo": "lateral_esquerda",
      "confianca": 0.82
    }
  ],
  "resumo": "Veículo em bom estado geral com desgaste compatível com a quilometragem. Detectados 2 riscos leves na lateral esquerda e desgaste moderado nos pneus dianteiros.",
  "detalhes_por_angulo": {
    "frente": { "status": "bom", "observacoes": "Sem danos visíveis na parte frontal" },
    "lateral_esquerda": { "status": "atenção", "observacoes": "Risco superficial na porta dianteira" }
  }
}`

    // ── Chamar Claude Vision ──
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            ...imagensContent,
            {
              type: 'text',
              text: 'Analise todas as fotos acima e gere o relatório de inspeção visual completo em JSON.',
            },
          ],
        }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error(`[Inspeção] Anthropic API falhou: ${anthropicRes.status}`, errBody)
      throw new Error(`Claude API falhou: ${anthropicRes.status}`)
    }

    const anthropicResult = await anthropicRes.json()
    const responseText = anthropicResult.content?.[0]?.text

    if (!responseText) throw new Error('Claude não retornou conteúdo')

    // ── Parse JSON ──
    let resultado: ResultadoInspecao

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Nenhum JSON encontrado')
      resultado = JSON.parse(jsonMatch[0])
    } catch {
      console.error('[Inspeção] Falha ao parsear JSON:', responseText.substring(0, 500))
      throw new Error('Falha ao processar resposta da IA')
    }

    // Validação
    if (typeof resultado.score_condicao !== 'number' || !resultado.resumo) {
      throw new Error('Resposta da IA incompleta')
    }

    // Clampar score
    resultado.score_condicao = Math.max(0, Math.min(100, Math.round(resultado.score_condicao)))

    const elapsed = Date.now() - startTime
    const custo = fotosProcessadas.length * CUSTO_POR_FOTO

    console.log(`[Inspeção] Concluída em ${elapsed}ms — score=${resultado.score_condicao}, danos=${resultado.danos?.length ?? 0}`)

    // ── Salvar no banco ──
    const { data: inspecao, error: insertError } = await supabase
      .from('inspecao_visual')
      .insert({
        veiculo_id,
        anunciante_id: user.id,
        score_condicao: resultado.score_condicao,
        danos: resultado.danos || [],
        resumo: resultado.resumo,
        fotos_inspecao: fotosProcessadas.map(f => ({ url: f.url, angulo: f.angulo })),
        modelo_ia: 'claude-sonnet-4-20250514',
        tempo_ms: elapsed,
        custo_estimado: custo,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Inspeção] Falha ao salvar:', insertError.message)
      throw new Error('Falha ao salvar resultado da inspeção')
    }

    // ── Atualizar selo_inspecao + score_confianca do veículo ──
    const { error: seloError } = await supabase.rpc('atualizar_selo_inspecao', {
      p_veiculo_id: veiculo_id,
      p_score_condicao: resultado.score_condicao,
    })

    if (seloError) {
      console.warn('[Inspeção] Falha ao atualizar selo:', seloError.message)
    }

    // ── Registrar uso IA ──
    await supabase.from('uso_ia').insert({
      user_id: user.id,
      veiculo_id,
      tipo: 'outro',
      cenario: 'inspecao_visual',
      modelo_ia: 'claude-sonnet-4-20250514',
      custo_estimado: custo,
      tempo_ms: elapsed,
      status: 'ok',
    })

    return json({
      id: inspecao.id,
      score_condicao: resultado.score_condicao,
      danos: resultado.danos || [],
      resumo: resultado.resumo,
      detalhes_por_angulo: resultado.detalhes_por_angulo || {},
      fotos_count: fotosProcessadas.length,
      tempo_ms: elapsed,
    }, 200, origin)
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(`[Inspeção] Erro após ${elapsed}ms:`, err)

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
            tipo: 'outro',
            cenario: 'inspecao_visual',
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
      error: 'Não foi possível completar a inspeção. Tente novamente.',
      detalhe: (err as Error).message,
    }, 500, origin)
  }
})
