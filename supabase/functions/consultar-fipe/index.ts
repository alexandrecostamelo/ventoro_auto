import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// Edge Function: consultar-fipe
// Consulta preço FIPE via BrasilAPI (primário) / Parallelum (fallback)
// Cache de 30 dias na tabela cache_fipe
// Retorna: preco_fipe, faixa sugerida, referência, preco_status
// ============================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Ajuste de preço por condição (percentual sobre FIPE)
const AJUSTE_CONDICAO: Record<string, number> = {
  excelente: 0.05,   // +5%
  otimo: 0.0,         // referência
  bom: -0.05,         // -5%
  regular: -0.12,     // -12%
}

// Ajuste por km (a cada 10k km acima da média, -1.5%)
const KM_MEDIA_ANO = 12000 // média brasileira ~12k km/ano

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

// Normalizar texto para comparação (lowercase, sem acentos, sem espaços extras)
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// ── BrasilAPI ────────────────────────────────────────────────────────────

interface FipeMarca { codigo: string; nome: string }
interface FipeModelo { codigo: number; nome: string }
interface FipeAno { codigo: string; nome: string }
interface FipePreco {
  Valor: string
  Marca: string
  Modelo: string
  AnoModelo: number
  Combustivel: string
  CodigoFipe: string
  MesReferencia: string
}

async function buscarViaBrasilAPI(
  marca: string,
  modelo: string,
  ano: number,
  combustivel: string,
): Promise<FipePreco | null> {
  const tipo = 'carros' // TODO: motos/caminhões futuramente

  // 1. Buscar marcas
  const marcasRes = await fetch(`https://brasilapi.com.br/api/fipe/marcas/v1/${tipo}`)
  if (!marcasRes.ok) return null
  const marcas: FipeMarca[] = await marcasRes.json()

  const marcaNorm = normalizar(marca)
  const marcaMatch = marcas.find(
    (m) => normalizar(m.nome) === marcaNorm || normalizar(m.nome).includes(marcaNorm)
  )
  if (!marcaMatch) {
    console.log(`[FIPE] Marca "${marca}" não encontrada na BrasilAPI`)
    return null
  }

  // 2. Buscar tabela FIPE pela marca (retorna lista de preços)
  const tabelaRes = await fetch(
    `https://brasilapi.com.br/api/fipe/preco/v1/${marcaMatch.codigo}`
  )
  if (!tabelaRes.ok) return null
  const tabela: FipePreco[] = await tabelaRes.json()

  // 3. Filtrar por modelo e ano
  const modeloNorm = normalizar(modelo)
  const resultados = tabela.filter((item) => {
    const nomeNorm = normalizar(item.Modelo)
    return (
      nomeNorm.includes(modeloNorm) &&
      item.AnoModelo === ano
    )
  })

  if (resultados.length === 0) {
    console.log(`[FIPE] Modelo "${modelo}" ano ${ano} não encontrado na BrasilAPI`)
    return null
  }

  // Se múltiplos resultados, pegar o primeiro (ou filtrar por combustível)
  const combNorm = normalizar(combustivel)
  const comCombustivel = resultados.find((r) =>
    normalizar(r.Combustivel).includes(combNorm) ||
    combNorm.includes('flex') // flex combina com gasolina
  )

  return comCombustivel || resultados[0]
}

// ── Parallelum (fallback) ──────────────────────────────────────────────

async function buscarViaParallelum(
  marca: string,
  modelo: string,
  ano: number,
  combustivel: string,
): Promise<FipePreco | null> {
  const BASE = 'https://parallelum.com.br/fipe/api/v1/carros'

  try {
    // 1. Buscar marcas
    const marcasRes = await fetch(`${BASE}/marcas`)
    if (!marcasRes.ok) return null
    const marcas: Array<{ codigo: string; nome: string }> = await marcasRes.json()

    const marcaNorm = normalizar(marca)
    const marcaMatch = marcas.find(
      (m) => normalizar(m.nome) === marcaNorm || normalizar(m.nome).includes(marcaNorm)
    )
    if (!marcaMatch) return null

    // 2. Buscar modelos da marca
    const modelosRes = await fetch(`${BASE}/marcas/${marcaMatch.codigo}/modelos`)
    if (!modelosRes.ok) return null
    const { modelos }: { modelos: FipeModelo[] } = await modelosRes.json()

    const modeloNorm = normalizar(modelo)
    const modeloMatch = modelos.find(
      (m) => normalizar(m.nome).includes(modeloNorm)
    )
    if (!modeloMatch) return null

    // 3. Buscar anos do modelo
    const anosRes = await fetch(
      `${BASE}/marcas/${marcaMatch.codigo}/modelos/${modeloMatch.codigo}/anos`
    )
    if (!anosRes.ok) return null
    const anos: FipeAno[] = await anosRes.json()

    // Mapear combustível para código FIPE (1=gasolina, 2=etanol, 3=diesel)
    const combCod = combustivel === 'diesel' ? '3' : combustivel === 'etanol' ? '2' : '1'
    const anoStr = `${ano}-${combCod}`
    const anoMatch = anos.find((a) => a.codigo === anoStr) || anos.find((a) => a.codigo.startsWith(`${ano}`))
    if (!anoMatch) return null

    // 4. Buscar preço
    const precoRes = await fetch(
      `${BASE}/marcas/${marcaMatch.codigo}/modelos/${modeloMatch.codigo}/anos/${anoMatch.codigo}`
    )
    if (!precoRes.ok) return null
    const precoData = await precoRes.json()

    return {
      Valor: precoData.Valor,
      Marca: precoData.Marca,
      Modelo: precoData.Modelo,
      AnoModelo: precoData.AnoModelo,
      Combustivel: precoData.Combustivel,
      CodigoFipe: precoData.CodigoFipe,
      MesReferencia: precoData.MesReferencia,
    }
  } catch (err) {
    console.error('[FIPE] Parallelum falhou:', err)
    return null
  }
}

// ── Parsear valor FIPE (ex: "R$ 85.000,00" → 85000) ─────────────────

function parsearValorFipe(valor: string): number {
  const limpo = valor
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  return parseFloat(limpo) || 0
}

// ── Calcular faixa sugerida ──────────────────────────────────────────

function calcularFaixaSugerida(
  precoFipe: number,
  ano: number,
  quilometragem?: number,
  condicao?: string,
): { min: number; max: number; ajusteKm: number; ajusteCondicao: number } {
  // Ajuste por condição
  const ajusteCondicao = AJUSTE_CONDICAO[condicao || 'bom'] ?? 0

  // Ajuste por quilometragem
  let ajusteKm = 0
  if (quilometragem !== undefined && quilometragem > 0) {
    const anoAtual = new Date().getFullYear()
    const idade = Math.max(1, anoAtual - ano)
    const kmEsperado = idade * KM_MEDIA_ANO
    const kmExcesso = quilometragem - kmEsperado
    if (kmExcesso > 0) {
      // A cada 10k km acima da média: -1.5%
      ajusteKm = -0.015 * Math.floor(kmExcesso / 10000)
    } else if (kmExcesso < -10000) {
      // Km muito abaixo da média: +2% (max +6%)
      ajusteKm = Math.min(0.06, 0.02 * Math.floor(Math.abs(kmExcesso) / 10000))
    }
  }

  const ajusteTotal = ajusteCondicao + ajusteKm

  // Faixa base: FIPE ± 10%, depois aplica ajustes
  const centro = precoFipe * (1 + ajusteTotal)
  const min = Math.round(centro * 0.90)
  const max = Math.round(centro * 1.10)

  return { min, max, ajusteKm, ajusteCondicao }
}

// ── Determinar preco_status ──────────────────────────────────────────

function determinarPrecoStatus(
  preco: number,
  precoFipe: number,
  faixaMin: number,
  faixaMax: number,
): 'abaixo' | 'na_media' | 'acima' {
  if (preco < faixaMin) return 'abaixo'
  if (preco > faixaMax) return 'acima'
  return 'na_media'
}

// ── Handler ──────────────────────────────────────────────────────────

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── Input ──
    const body = await req.json()
    const { marca, modelo, ano, combustivel, quilometragem, condicao, preco } = body as {
      marca: string
      modelo: string
      ano: number
      combustivel?: string
      quilometragem?: number
      condicao?: string
      preco?: number
    }

    if (!marca || !modelo || !ano) {
      return json({ error: 'marca, modelo e ano são obrigatórios' }, 400, origin)
    }

    const combNorm = normalizar(combustivel || 'flex')

    console.log(`[FIPE] Consulta: ${marca} ${modelo} ${ano} ${combNorm} — user=${user.id}`)

    // ── Verificar cache ──
    const { data: cache } = await supabase
      .from('cache_fipe')
      .select('*')
      .eq('marca', normalizar(marca))
      .eq('modelo', normalizar(modelo))
      .eq('ano', ano)
      .eq('combustivel', combNorm)
      .gt('expira_em', new Date().toISOString())
      .single()

    if (cache) {
      console.log(`[FIPE] Cache hit — preço: R$ ${cache.preco_fipe}`)

      // Recalcular faixa com km/condição atuais (podem diferir do cache)
      const faixa = calcularFaixaSugerida(cache.preco_fipe, ano, quilometragem, condicao)
      const precoStatus = preco
        ? determinarPrecoStatus(preco, cache.preco_fipe, faixa.min, faixa.max)
        : null

      return json({
        fonte: 'cache',
        codigo_fipe: cache.codigo_fipe,
        preco_fipe: cache.preco_fipe,
        referencia_mes: cache.referencia_mes,
        preco_sugerido_min: faixa.min,
        preco_sugerido_max: faixa.max,
        ajuste_km: faixa.ajusteKm,
        ajuste_condicao: faixa.ajusteCondicao,
        preco_status: precoStatus,
      }, 200, origin)
    }

    // ── Consultar APIs ──
    console.log('[FIPE] Cache miss — consultando APIs...')

    let resultado: FipePreco | null = null

    // Tentar BrasilAPI primeiro
    try {
      resultado = await buscarViaBrasilAPI(marca, modelo, ano, combustivel || 'flex')
    } catch (err) {
      console.warn('[FIPE] BrasilAPI erro:', err)
    }

    // Fallback: Parallelum
    if (!resultado) {
      console.log('[FIPE] Tentando Parallelum (fallback)...')
      resultado = await buscarViaParallelum(marca, modelo, ano, combustivel || 'flex')
    }

    if (!resultado) {
      return json({
        error: 'Veículo não encontrado na tabela FIPE. Verifique marca, modelo e ano.',
        nao_encontrado: true,
      }, 404, origin)
    }

    // ── Processar resultado ──
    const precoFipe = parsearValorFipe(resultado.Valor)
    if (precoFipe <= 0) {
      return json({
        error: 'Preço FIPE retornou valor inválido.',
        nao_encontrado: true,
      }, 500, origin)
    }

    const faixa = calcularFaixaSugerida(precoFipe, ano, quilometragem, condicao)
    const precoStatus = preco
      ? determinarPrecoStatus(preco, precoFipe, faixa.min, faixa.max)
      : null

    // ── Salvar no cache (upsert) ──
    const { error: cacheError } = await supabase.from('cache_fipe').upsert(
      {
        marca: normalizar(marca),
        modelo: normalizar(modelo),
        ano,
        combustivel: combNorm,
        codigo_fipe: resultado.CodigoFipe || null,
        preco_fipe: precoFipe,
        referencia_mes: resultado.MesReferencia || null,
        preco_sugerido_min: faixa.min,
        preco_sugerido_max: faixa.max,
        dados_api: resultado as unknown as Record<string, unknown>,
        expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'marca,modelo,ano,combustivel' }
    )

    if (cacheError) {
      console.warn('[FIPE] Falha ao salvar cache:', cacheError.message)
    }

    console.log(`[FIPE] OK — ${resultado.Marca} ${resultado.Modelo} ${resultado.AnoModelo}: R$ ${precoFipe}`)

    return json({
      fonte: 'api',
      codigo_fipe: resultado.CodigoFipe,
      preco_fipe: precoFipe,
      referencia_mes: resultado.MesReferencia,
      preco_sugerido_min: faixa.min,
      preco_sugerido_max: faixa.max,
      ajuste_km: faixa.ajusteKm,
      ajuste_condicao: faixa.ajusteCondicao,
      preco_status: precoStatus,
    }, 200, origin)
  } catch (err) {
    console.error('[FIPE] Erro:', err)
    return json({
      error: 'Erro ao consultar tabela FIPE. Tente novamente.',
      detalhe: (err as Error).message,
    }, 500, origin)
  }
})
