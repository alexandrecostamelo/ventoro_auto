import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Debug endpoint — faz UMA chamada à Stability API e retorna logs detalhados.
 * GET /api/venstudio/debug-call?secret=ventoro2026&foto_url=...&cenario=showroom
 */

const STABILITY_API_KEY = process.env.STABILITY_API_KEY || ''
const STABILITY_ENDPOINT = 'https://api.stability.ai/v2beta/stable-image/edit/replace-background-and-relight'

const CENARIO_PROMPTS: Record<string, { prompt: string; light_direction: string; light_strength: number; preserve_subject: number }> = {
  showroom: {
    prompt: 'Dark luxury car dealership showroom at night, polished black granite floor with mirror reflections, dramatic warm spotlights from above creating pools of light, dark charcoal walls with subtle LED accent strips, floor-to-ceiling tinted windows showing distant city lights at night, moody cinematic atmosphere, professional automotive photography',
    light_direction: 'above', light_strength: 0.7, preserve_subject: 1.0,
  },
  estudio: {
    prompt: 'Professional dark photography studio, seamless black backdrop, single dramatic key light from upper left creating sharp highlights and deep shadows, subtle rim light on edges, polished dark concrete floor with faint reflection, high contrast cinematic product photography, dark moody atmosphere',
    light_direction: 'left', light_strength: 0.8, preserve_subject: 1.0,
  },
  garagem_luxo: {
    prompt: 'Underground private luxury garage at night, smooth dark epoxy floor with wet reflections, exposed raw concrete ceiling with single warm pendant spotlight, matte black walls with amber LED strip lighting along base, deep shadows, dramatic contrast, exclusive private car vault atmosphere, cinematic dark mood',
    light_direction: 'above', light_strength: 0.75, preserve_subject: 1.0,
  },
  externo: {
    prompt: 'Dark elegant outdoor scenic road at dusk, smooth clean dark asphalt, dramatic twilight sky with deep purple and orange gradient, distant city skyline silhouette with warm lights, moody atmospheric fog, professional automotive photography, cinematic dark atmosphere',
    light_direction: 'left', light_strength: 0.7, preserve_subject: 1.0,
  },
  urbano: {
    prompt: 'Dark empty city street at night after rain, wet black asphalt with colorful neon reflections, moody purple and orange city lights in blurred background, dramatic fog and mist, no people, no other vehicles, cinematic night photography, dark atmospheric urban scene',
    light_direction: 'right', light_strength: 0.6, preserve_subject: 1.0,
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.query.secret !== 'ventoro2026') return res.status(403).json({ error: 'forbidden' })

  const fotoUrl = req.query.foto_url as string
  const cenarioId = (req.query.cenario as string) || 'showroom'
  const outputFormat = (req.query.format as string) || 'webp'

  if (!fotoUrl) return res.status(400).json({ error: 'foto_url required' })

  const cenario = CENARIO_PROMPTS[cenarioId] || CENARIO_PROMPTS.showroom
  const logs: string[] = []

  try {
    // 1. Download foto
    logs.push(`[1] Downloading: ${fotoUrl}`)
    const t0 = Date.now()
    const fotoResp = await fetch(fotoUrl)
    logs.push(`[1] Download status: ${fotoResp.status}, content-type: ${fotoResp.headers.get('content-type')}`)
    if (!fotoResp.ok) return res.json({ logs, error: 'Download failed' })

    const fotoBuffer = Buffer.from(await fotoResp.arrayBuffer())
    logs.push(`[1] Image size: ${fotoBuffer.length} bytes (${(fotoBuffer.length / 1024).toFixed(0)} KB)`)
    logs.push(`[1] Download time: ${Date.now() - t0}ms`)

    // Detect resolution from JPEG header (SOF0 marker)
    const sof = findJpegResolution(fotoBuffer)
    if (sof) {
      logs.push(`[1] Image resolution: ${sof.width}x${sof.height}`)
    }

    // 2. Build request
    const FormData = (await import('form-data')).default
    const formData = new FormData()
    formData.append('subject_image', fotoBuffer, { filename: 'foto.jpg', contentType: 'image/jpeg' })
    formData.append('background_prompt', cenario.prompt)
    formData.append('background_negative_prompt', 'blurry, low quality, distorted, text, watermark, logo, other vehicles, people, cluttered, messy, unrealistic, cartoon, painting, illustration')
    formData.append('preserve_original_subject', String(cenario.preserve_subject))
    formData.append('light_source_direction', cenario.light_direction)
    formData.append('light_source_strength', String(cenario.light_strength))
    formData.append('output_format', outputFormat)

    logs.push(`[2] === REQUEST ===`)
    logs.push(`[2] POST ${STABILITY_ENDPOINT}`)
    logs.push(`[2] Authorization: Bearer sk-...${STABILITY_API_KEY.slice(-8)}`)
    logs.push(`[2] Accept: */*`)
    logs.push(`[2] Content-Type: ${formData.getHeaders()['content-type']}`)
    logs.push(`[2] Fields:`)
    logs.push(`    subject_image: [binary ${fotoBuffer.length} bytes]`)
    logs.push(`    background_prompt: "${cenario.prompt}"`)
    logs.push(`    preserve_original_subject: "${cenario.preserve_subject}"`)
    logs.push(`    light_source_direction: "${cenario.light_direction}"`)
    logs.push(`    light_source_strength: "${cenario.light_strength}"`)
    logs.push(`    output_format: "${outputFormat}"`)

    // 3. Send request
    const t1 = Date.now()
    const stabilityResp = await fetch(STABILITY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Accept': '*/*',
        ...formData.getHeaders(),
      },
      body: formData.getBuffer(),
    })

    logs.push(`[3] === RESPONSE ===`)
    logs.push(`[3] Status: ${stabilityResp.status} ${stabilityResp.statusText}`)
    logs.push(`[3] Content-Type: ${stabilityResp.headers.get('content-type')}`)
    logs.push(`[3] Content-Length: ${stabilityResp.headers.get('content-length')}`)
    logs.push(`[3] Time: ${Date.now() - t1}ms`)

    // Log all response headers
    const respHeaders: Record<string, string> = {}
    stabilityResp.headers.forEach((v, k) => { respHeaders[k] = v })
    logs.push(`[3] All headers: ${JSON.stringify(respHeaders)}`)

    const ct = stabilityResp.headers.get('content-type') || ''

    if (ct.startsWith('image/')) {
      const resultBuf = Buffer.from(await stabilityResp.arrayBuffer())
      logs.push(`[3] Result: binary image, ${resultBuf.length} bytes (${(resultBuf.length / 1024).toFixed(0)} KB)`)
      const resSof = findJpegResolution(resultBuf)
      if (resSof) logs.push(`[3] Result resolution: ${resSof.width}x${resSof.height}`)
      // Return as base64 data URI for quick preview
      logs.push(`[4] SUCCESS — image generated`)
      return res.json({
        logs,
        success: true,
        result_size_kb: (resultBuf.length / 1024).toFixed(0),
        result_resolution: resSof ? `${resSof.width}x${resSof.height}` : 'unknown',
        preview: `data:${ct};base64,${resultBuf.toString('base64').substring(0, 200)}...`,
      })
    }

    if (ct.includes('json')) {
      const json = await stabilityResp.json()
      logs.push(`[3] JSON response: ${JSON.stringify(json).substring(0, 500)}`)

      if (json.id && !json.image) {
        logs.push(`[3] ASYNC — generation_id: ${json.id}`)
        return res.json({ logs, async: true, generation_id: json.id })
      }

      return res.json({ logs, json_response: json })
    }

    // Unknown response
    const rawBuf = Buffer.from(await stabilityResp.arrayBuffer())
    logs.push(`[3] Unknown response: ${rawBuf.length} bytes, first 200 chars: ${rawBuf.toString('utf8').substring(0, 200)}`)
    return res.json({ logs })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logs.push(`[ERROR] ${msg}`)
    return res.json({ logs, error: msg })
  }
}

function findJpegResolution(buf: Buffer): { width: number; height: number } | null {
  // Look for SOF0 (0xFF 0xC0) or SOF2 (0xFF 0xC2) markers
  for (let i = 0; i < buf.length - 9; i++) {
    if (buf[i] === 0xFF && (buf[i + 1] === 0xC0 || buf[i + 1] === 0xC2)) {
      const height = buf.readUInt16BE(i + 5)
      const width = buf.readUInt16BE(i + 7)
      return { width, height }
    }
  }
  return null
}
