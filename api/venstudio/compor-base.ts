import type { VercelRequest, VercelResponse } from '@vercel/node'
import sharp from 'sharp'
import {
  getServiceClient, verifyUser, fundoAleatorioUrl,
  CENARIOS_VALIDOS, CENARIO_CONFIG, corsHeaders,
  type CenarioId,
} from './shared'

// ============================================================
// VenStudio V2 — Tier B: Composição determinística com Sharp
// Veículo preservado pixel a pixel. Apenas o fundo é substituído.
// ============================================================

const FUNDO_W = 1440
const FUNDO_H = 810

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
    const { veiculo_png_url, cenario_id, veiculo_id, foto_original_url, foto_id } = req.body
    if (!veiculo_png_url || !cenario_id || !veiculo_id) {
      return res.status(400).json({ error: 'veiculo_png_url, cenario_id e veiculo_id são obrigatórios' })
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

    // ── Verificar cota mensal Tier B ──
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const { count: usosEsteMes } = await supabase
      .from('processamentos_ia')
      .select('*', { count: 'exact', head: true })
      .eq('veiculo_id', veiculo_id)
      .eq('pipeline_versao', 'v2_base')
      .gte('created_at', inicioMes.toISOString())

    // Buscar plano da garagem ou usar default
    let limiteMensal = 30 // Pro default
    if (veiculo.garagem_id) {
      const { data: garagem } = await supabase
        .from('garagens')
        .select('plano')
        .eq('id', veiculo.garagem_id)
        .single()
      if (garagem?.plano === 'premium') limiteMensal = 999
      else if (garagem?.plano === 'starter') limiteMensal = 0
    }

    if ((usosEsteMes ?? 0) >= limiteMensal) {
      return res.status(429).json({ error: 'Cota mensal Tier B atingida', limite: limiteMensal })
    }

    // ── Baixar PNG do veículo (segmentado) ──
    const pngRes = await fetch(veiculo_png_url, {
      headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    })
    if (!pngRes.ok) return res.status(502).json({ error: 'Falha ao baixar PNG do veículo' })
    const pngBuffer = Buffer.from(await pngRes.arrayBuffer())

    // ── Baixar fundo aleatório ──
    const fundoUrl = fundoAleatorioUrl(cenario_id)
    const fundoRes = await fetch(fundoUrl)
    if (!fundoRes.ok) return res.status(502).json({ error: 'Falha ao baixar fundo' })
    const fundoBuffer = Buffer.from(await fundoRes.arrayBuffer())

    // ── Processar veículo com Sharp ──
    const veiculoMeta = await sharp(pngBuffer).metadata()
    const vW = veiculoMeta.width || 800
    const vH = veiculoMeta.height || 600

    // Escalar veículo para caber no fundo
    const targetW = Math.round(FUNDO_W * config.escalaVeiculo)
    const scale = targetW / vW
    const targetH = Math.round(vH * scale)

    // Ajustes cosméticos no veículo (determinísticos — sem IA)
    const { brightness, saturation, contrast, sharpen: sharpSigma } = config.ajustesVeiculo
    let veiculoProcessado = sharp(pngBuffer)
      .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: false })
      .modulate({ brightness, saturation })
      .linear(contrast, -(128 * (contrast - 1))) // contrast via linear

    if (sharpSigma > 0) {
      veiculoProcessado = veiculoProcessado.sharpen({ sigma: sharpSigma })
    }

    const veiculoFinal = await veiculoProcessado.png().toBuffer()

    // ── Gerar sombra a partir do canal alpha ──
    const alphaChannel = await sharp(veiculoFinal)
      .extractChannel(3) // alpha
      .resize(targetW, Math.round(targetH * 0.15)) // achatar verticalmente
      .blur(40)
      .toBuffer()

    // Criar sombra preta com alpha do canal extraído
    const sombra = await sharp({
      create: {
        width: targetW,
        height: Math.round(targetH * 0.15),
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: config.intensidadeSombra },
      },
    })
      .composite([{
        input: alphaChannel,
        blend: 'dest-in',
      }])
      .png()
      .toBuffer()

    // ── Posição no fundo ──
    const xPos = Math.round((FUNDO_W - targetW) / 2)
    const yVeiculo = Math.round(FUNDO_H * config.yRatio - targetH / 2)
    const ySombra = yVeiculo + targetH - 5 // sombra logo abaixo do veículo

    // ── Compor: fundo + sombra + veículo ──
    const resultado = await sharp(fundoBuffer)
      .resize(FUNDO_W, FUNDO_H, { fit: 'cover' })
      .composite([
        {
          input: sombra,
          left: xPos,
          top: Math.min(ySombra, FUNDO_H - Math.round(targetH * 0.15)),
          blend: 'multiply',
        },
        {
          input: veiculoFinal,
          left: xPos,
          top: Math.max(yVeiculo, 0),
          blend: 'over',
        },
      ])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer()

    // ── Upload resultado ──
    const timestamp = Date.now()
    const outputPath = `${veiculo_id}/processada_${timestamp}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('fotos-veiculos')
      .upload(outputPath, resultado, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return res.status(500).json({ error: 'Falha ao salvar foto processada' })
    }

    const urlProcessada = `${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}/storage/v1/object/public/fotos-veiculos/${outputPath}`

    // ── Registrar em processamentos_ia ──
    const tempoMs = Date.now() - startTime

    const { data: proc } = await supabase
      .from('processamentos_ia')
      .insert({
        veiculo_id,
        foto_id: foto_id || null,
        foto_original_url: foto_original_url || veiculo_png_url,
        foto_processada_url: urlProcessada,
        cenario: cenario_id,
        pipeline_versao: 'v2_base',
        aprovado: true, // Tier B é sempre aprovado (determinístico)
        custo_estimado: 0.006,
        tempo_processamento_ms: tempoMs,
      })
      .select('id')
      .single()

    // ── Atualizar fotos_veiculo se foto_id fornecido ──
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
      tier: 'B',
      cenario: cenario_id,
    })

  } catch (err) {
    console.error('compor-base error:', err)
    return res.status(500).json({ error: 'Erro interno na composição' })
  }
}
