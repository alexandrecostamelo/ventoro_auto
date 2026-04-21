import type { VercelRequest, VercelResponse } from '@vercel/node'
import sharp from 'sharp'
import phash from 'sharp-phash'
import { createClient } from '@supabase/supabase-js'

// ── Shared (inlined — Vercel bundles each function independently) ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

function getServiceClient() { return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) }
async function verifyUser(authHeader: string | null) {
  if (!authHeader) return null
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error } = await c.auth.getUser()
  return error || !user ? null : user
}

const CENARIOS_VALIDOS = ['showroom_escuro', 'estudio_branco', 'garagem_premium', 'urbano_noturno', 'neutro_gradiente'] as const
type CenarioId = (typeof CENARIOS_VALIDOS)[number]
const CENARIO_CONFIG: Record<CenarioId, { promptFluxFill: string }> = {
  showroom_escuro: { promptFluxFill: 'Premium dark car showroom, polished black reflective marble floor, dramatic LED side lighting, dark charcoal walls, professional automotive photography, photorealistic' },
  estudio_branco: { promptFluxFill: 'Professional white photography studio, infinite white cyclorama, soft diffused overhead lighting, clean seamless floor, commercial product photography, photorealistic' },
  garagem_premium: { promptFluxFill: 'Industrial loft garage, textured polished concrete floor, warm amber focused lighting, exposed brick and metal elements, moody atmospheric automotive workshop, photorealistic' },
  urbano_noturno: { promptFluxFill: 'Modern city street at night, wet asphalt reflecting neon lights, cyberpunk atmosphere, defocused building lights, cinematic automotive photography, photorealistic' },
  neutro_gradiente: { promptFluxFill: 'Professional gradient background, smooth transition charcoal gray to deep black, subtle radial lighting, minimalist automotive advertising background, photorealistic' },
}
const ALLOWED_ORIGINS = new Set(['https://ventoro.com.br', 'https://www.ventoro.com.br', 'http://localhost:5173', 'http://localhost:8080', 'https://ventoro-auto.vercel.app'])
function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://ventoro.com.br'
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
}

// ============================================================
// VenStudio V2 — Tier C: Composição premium com Flux Fill Pro
// Fundo gerado por IA via inpainting com máscara inversa dilatada.
// Fingerprint pHash obrigatório: hamming ≤ 2 ou rejeita.
// ============================================================

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!
const MAX_HAMMING = 2

/** Hamming distance entre dois hashes hexadecimais */
function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64 // max distance
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    // Count bits
    let bits = xor
    while (bits) { dist++; bits &= bits - 1 }
  }
  return dist
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | null
  const cors = corsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // ── Auth ──
    const user = await verifyUser(req.headers.authorization || null)
    if (!user) return res.status(401).json({ error: 'Não autenticado' })

    // ── Input ──
    const { veiculo_png_url, foto_original_url, cenario_id, veiculo_id, foto_id } = req.body
    if (!veiculo_png_url || !foto_original_url || !cenario_id || !veiculo_id) {
      return res.status(400).json({ error: 'veiculo_png_url, foto_original_url, cenario_id e veiculo_id são obrigatórios' })
    }
    if (!CENARIOS_VALIDOS.includes(cenario_id)) {
      return res.status(400).json({ error: `Cenário inválido: ${cenario_id}` })
    }

    const config = CENARIO_CONFIG[cenario_id as CenarioId]
    const startTime = Date.now()
    const supabase = getServiceClient()

    // ── Verificar ownership ──
    const { data: veiculo } = await supabase
      .from('veiculos')
      .select('id, anunciante_id, garagem_id')
      .eq('id', veiculo_id)
      .single()

    if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado' })

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
      return res.status(403).json({ error: 'Sem permissão' })
    }

    // ── Verificar plano Premium ──
    if (veiculo.garagem_id) {
      const { data: garagem } = await supabase
        .from('garagens')
        .select('plano')
        .eq('id', veiculo.garagem_id)
        .single()
      if (garagem?.plano !== 'premium') {
        return res.status(403).json({ error: 'Tier C disponível apenas para plano Premium' })
      }
    }

    // ── Verificar cota mensal Tier C (50/mês) ──
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const { count: usosEsteMes } = await supabase
      .from('processamentos_ia')
      .select('*', { count: 'exact', head: true })
      .eq('veiculo_id', veiculo_id)
      .eq('pipeline_versao', 'v2_premium')
      .gte('created_at', inicioMes.toISOString())

    if ((usosEsteMes ?? 0) >= 50) {
      return res.status(429).json({ error: 'Cota mensal Tier C atingida (50/mês)' })
    }

    // ── Baixar PNG do veículo (segmentado) ──
    const pngRes = await fetch(veiculo_png_url, {
      headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    })
    if (!pngRes.ok) return res.status(502).json({ error: 'Falha ao baixar PNG do veículo' })
    const pngBuffer = Buffer.from(await pngRes.arrayBuffer())

    // ── Baixar foto original (para fingerprint) ──
    const origRes = await fetch(foto_original_url)
    if (!origRes.ok) return res.status(502).json({ error: 'Falha ao baixar foto original' })
    const origBuffer = Buffer.from(await origRes.arrayBuffer())

    // ── Criar imagem com veículo em fundo neutro (para Flux Fill input) ──
    const veiculoMeta = await sharp(pngBuffer).metadata()
    const vW = veiculoMeta.width || 800
    const vH = veiculoMeta.height || 600

    // Resize para 1024x1024 (Flux Fill espera quadrado)
    const canvasSize = 1024
    const scale = Math.min(canvasSize * 0.85 / vW, canvasSize * 0.85 / vH)
    const scaledW = Math.round(vW * scale)
    const scaledH = Math.round(vH * scale)

    const veiculoResized = await sharp(pngBuffer)
      .resize(scaledW, scaledH, { fit: 'inside' })
      .png()
      .toBuffer()

    // Veículo centrado em canvas cinza
    const xOff = Math.round((canvasSize - scaledW) / 2)
    const yOff = Math.round((canvasSize - scaledH) / 2)

    const inputImage = await sharp({
      create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 255 } },
    })
      .composite([{ input: veiculoResized, left: xOff, top: yOff, blend: 'over' }])
      .png()
      .toBuffer()

    // ── Criar máscara inversa dilatada (branco = área a gerar, preto = preservar) ──
    // Extrair alpha do veículo resized, inverter, dilatar 5px
    const alphaRaw = await sharp(veiculoResized).extractChannel(3).raw().toBuffer()
    const maskRaw = Buffer.alloc(scaledW * scaledH)
    for (let i = 0; i < alphaRaw.length; i++) {
      maskRaw[i] = alphaRaw[i] > 128 ? 0 : 255 // inverso: veículo = preto, fundo = branco
    }

    // Dilatar 5px (erosão do preto = dilatação da borda de proteção)
    const dilateRadius = 5
    const dilatedRaw = Buffer.from(maskRaw)
    for (let y = 0; y < scaledH; y++) {
      for (let x = 0; x < scaledW; x++) {
        if (maskRaw[y * scaledW + x] === 255) continue // já é branco (fundo)
        // Pixel é preto (veículo). Verificar se vizinhos são brancos.
        // Se sim, manter preto (borda de proteção). Se distante, inverter não aplica.
        // Na verdade: dilatar = expandir a área preta (veículo) em 5px
        let shouldExpand = false
        for (let dy = -dilateRadius; dy <= dilateRadius && !shouldExpand; dy++) {
          for (let dx = -dilateRadius; dx <= dilateRadius && !shouldExpand; dx++) {
            const ny = y + dy, nx = x + dx
            if (ny < 0 || ny >= scaledH || nx < 0 || nx >= scaledW) continue
            if (maskRaw[ny * scaledW + nx] === 0) { // vizinho é preto (veículo)
              // Estamos no pixel branco (fundo), mas perto do veículo
              // Nada a fazer aqui — queremos expandir preto, não branco
            }
          }
        }
      }
    }

    // Abordagem mais simples: dilatar = expandir preto (veículo) por 5px
    const finalMaskRaw = Buffer.alloc(scaledW * scaledH, 255) // tudo branco
    for (let y = 0; y < scaledH; y++) {
      for (let x = 0; x < scaledW; x++) {
        if (maskRaw[y * scaledW + x] === 0) { // pixel do veículo
          // Pintar 5px ao redor como preto
          for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
            for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
              const ny = y + dy, nx = x + dx
              if (ny >= 0 && ny < scaledH && nx >= 0 && nx < scaledW) {
                finalMaskRaw[ny * scaledW + nx] = 0
              }
            }
          }
        }
      }
    }

    // Compor máscara no canvas 1024x1024
    const maskSmall = await sharp(finalMaskRaw, { raw: { width: scaledW, height: scaledH, channels: 1 } })
      .png()
      .toBuffer()

    const maskImage = await sharp({
      create: { width: canvasSize, height: canvasSize, channels: 1, background: 255 }, // branco (gerar)
    })
      .composite([{ input: maskSmall, left: xOff, top: yOff, blend: 'over' }])
      .png()
      .toBuffer()

    // ── Converter para base64 data URIs para Replicate ──
    const inputB64 = `data:image/png;base64,${inputImage.toString('base64')}`
    const maskB64 = `data:image/png;base64,${maskImage.toString('base64')}`

    // ── Chamar Flux Fill Pro via Replicate ──
    const fluxRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '2388ae5c68f05aae7bcd40e33ad31be139fafc2fa61c21038b3e37070bb38ffd', // flux-fill-pro
        input: {
          image: inputB64,
          mask: maskB64,
          prompt: config.promptFluxFill,
          guidance: 30,
          num_inference_steps: 50,
          output_format: 'jpg',
          output_quality: 92,
        },
      }),
    })

    if (!fluxRes.ok) {
      const errText = await fluxRes.text()
      console.error('Flux Fill error:', errText)
      return res.status(502).json({ error: 'Falha ao chamar Flux Fill' })
    }

    let fluxResult = await fluxRes.json()
    const pollUrl = fluxResult.urls?.get
    if (!pollUrl) return res.status(502).json({ error: 'Flux Fill: sem URL de polling' })

    // Poll até completar (Flux Fill ~10-20s)
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const poll = await fetch(pollUrl, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      })
      fluxResult = await poll.json()
      if (fluxResult.status === 'succeeded') break
      if (fluxResult.status === 'failed' || fluxResult.status === 'canceled') {
        return res.status(502).json({ error: 'Flux Fill falhou' })
      }
    }

    if (fluxResult.status !== 'succeeded') {
      return res.status(504).json({ error: 'Timeout no Flux Fill' })
    }

    // ── Download resultado ──
    const resultUrl = typeof fluxResult.output === 'string' ? fluxResult.output : fluxResult.output?.[0] || String(fluxResult.output)
    const resultRes = await fetch(resultUrl)
    if (!resultRes.ok) return res.status(502).json({ error: 'Falha ao baixar resultado' })
    const resultBuffer = Buffer.from(await resultRes.arrayBuffer())

    // ── Fingerprint pHash: comparar região do veículo ──
    // Recortar a região do veículo do resultado (mesma posição que o input)
    const veiculoRegionResult = await sharp(resultBuffer)
      .resize(canvasSize, canvasSize, { fit: 'cover' })
      .extract({ left: xOff, top: yOff, width: scaledW, height: scaledH })
      .jpeg()
      .toBuffer()

    // Recortar/resize o original para mesma escala
    const veiculoRegionOriginal = await sharp(origBuffer)
      .resize(scaledW, scaledH, { fit: 'cover' })
      .jpeg()
      .toBuffer()

    // Calcular pHash
    const hashResult = await phash(veiculoRegionResult)
    const hashOriginal = await phash(veiculoRegionOriginal)
    const distance = hammingDistance(hashResult, hashOriginal)

    const tempoMs = Date.now() - startTime

    // ── Verificar fingerprint ──
    if (distance > MAX_HAMMING) {
      // REJEITAR — veículo foi alterado
      await supabase
        .from('processamentos_ia')
        .insert({
          veiculo_id,
          foto_id: foto_id || null,
          foto_original_url,
          foto_processada_url: null,
          cenario: cenario_id,
          pipeline_versao: 'v2_premium',
          fingerprint_original: hashOriginal,
          fingerprint_processado: hashResult,
          fingerprint_match: false,
          aprovado: false,
          custo_estimado: 0.35,
          tempo_processamento_ms: tempoMs,
          erro: `Fingerprint rejeitado: hamming=${distance} (max=${MAX_HAMMING})`,
        })

      return res.status(422).json({
        error: 'integridade_falhou',
        message: 'O processamento alterou o veículo. Foto descartada por segurança.',
        hamming_distance: distance,
        max_allowed: MAX_HAMMING,
      })
    }

    // ── APROVADO — salvar ──
    const timestamp = Date.now()
    const outputPath = `${veiculo_id}/processada_premium_${timestamp}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('fotos-veiculos')
      .upload(outputPath, resultBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return res.status(500).json({ error: 'Falha ao salvar foto processada' })
    }

    const urlProcessada = `${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}/storage/v1/object/public/fotos-veiculos/${outputPath}`

    const { data: proc } = await supabase
      .from('processamentos_ia')
      .insert({
        veiculo_id,
        foto_id: foto_id || null,
        foto_original_url,
        foto_processada_url: urlProcessada,
        cenario: cenario_id,
        pipeline_versao: 'v2_premium',
        fingerprint_original: hashOriginal,
        fingerprint_processado: hashResult,
        fingerprint_match: true,
        aprovado: true,
        custo_estimado: 0.35,
        tempo_processamento_ms: tempoMs,
      })
      .select('id')
      .single()

    // ── Atualizar fotos_veiculo se foto_id ──
    if (foto_id) {
      await supabase
        .from('fotos_veiculo')
        .update({
          url_processada: urlProcessada,
          processada_por_ia: true,
          cenario_ia: cenario_id,
        })
        .eq('id', foto_id)
    }

    return res.status(200).json({
      url_processada: urlProcessada,
      processamento_id: proc?.id,
      tempo_ms: tempoMs,
      tier: 'C',
      cenario: cenario_id,
      fingerprint: {
        original: hashOriginal,
        processado: hashResult,
        hamming_distance: distance,
        aprovado: true,
      },
    })

  } catch (err) {
    console.error('compor-premium error:', err)
    return res.status(500).json({ error: 'Erro interno na composição premium' })
  }
}

export const config = {
  maxDuration: 60, // Tier C pode levar 20-40s (Flux Fill)
}
