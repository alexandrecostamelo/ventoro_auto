/**
 * VenStudio V2 — Gerador de fundos pré-renderizados
 *
 * Gera 25 fundos (5 cenários × 5 variações) via Replicate Flux Pro 1.1
 * e faz upload para o bucket fundos-cenarios no Supabase Storage.
 *
 * Uso:
 *   npx tsx scripts/gerar-fundos.ts
 *
 * Requer env vars:
 *   REPLICATE_API_TOKEN
 *   SUPABASE_URL (ou VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!REPLICATE_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: REPLICATE_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============================================================
// Prompts — 5 cenários, cada com 5 variações de ângulo/intensidade
// IMPORTANTE: Nenhum veículo nos prompts. Apenas fundos vazios.
// ============================================================

const CENARIOS: Record<string, string[]> = {
  showroom_escuro: [
    'Empty luxury car showroom, polished black reflective marble floor, dramatic LED side lighting from left, dark charcoal walls, completely empty space, no vehicles, no people, professional automotive photography environment, 8k photorealistic',
    'Empty premium car showroom, glossy obsidian floor with mirror reflections, overhead spotlight creating pool of light, midnight blue accent walls, completely empty, no cars, no objects, high-end automotive dealership, 8k photorealistic',
    'Empty elite car showroom, black polished granite floor with subtle reflections, soft rim lighting from right side, anthracite walls with subtle texture, completely empty space, no vehicles, luxury automotive environment, 8k photorealistic',
    'Empty dark car showroom, reflective black epoxy floor, dramatic three-point lighting setup, dark gray walls with subtle metallic sheen, completely empty, no cars, no people, moody automotive photography set, 8k photorealistic',
    'Empty prestigious car showroom, jet black polished floor reflecting ceiling lights, warm accent lighting strips on walls, deep charcoal environment, completely empty space, no vehicles, high-end car presentation room, 8k photorealistic',
  ],
  estudio_branco: [
    'Empty professional photography studio, infinite white cyclorama wall and floor seamless, soft diffused overhead lighting, clean and bright, no subjects, no objects, commercial product photography setup, 8k photorealistic',
    'Empty bright photography studio, pure white seamless background, soft box lighting from above and sides, subtle shadow on floor, no cars, no people, clean minimalist studio space, 8k photorealistic',
    'Empty white photographic studio, smooth white floor meeting white wall seamlessly, even diffused lighting, faint floor shadow, completely empty, professional automotive catalog setup, 8k photorealistic',
    'Empty clean photography studio, white infinity curve background, soft natural-looking window light from left, gentle floor gradient, no subjects, high-end product photography environment, 8k photorealistic',
    'Empty pristine photography studio, seamless white cyclorama, overhead softbox grid creating even illumination, very subtle warm tone, no objects, no vehicles, commercial shoot setup, 8k photorealistic',
  ],
  garagem_premium: [
    'Empty industrial loft garage, textured polished concrete floor, warm amber focused spotlight from above, exposed red brick wall with metal shelving, no vehicles, no people, moody atmospheric automotive workshop, 8k photorealistic',
    'Empty luxury workshop garage, smooth gray concrete floor, warm Edison bulb string lights overhead, steel beam ceiling, exposed ductwork, no cars, no objects, upscale industrial automotive space, 8k photorealistic',
    'Empty premium car garage, burnished concrete floor with subtle sheen, focused warm pendant lights, raw concrete and steel walls, no vehicles, no people, high-end industrial garage atmosphere, 8k photorealistic',
    'Empty designer garage space, polished gray concrete floor, warm directional lighting, exposed brick pillar and metal details, no cars, no objects, boutique automotive workshop aesthetic, 8k photorealistic',
    'Empty upscale garage interior, textured concrete floor, amber spotlight creating dramatic pool of light, industrial metal wall panels, no vehicles, no people, modern automotive loft space, 8k photorealistic',
  ],
  urbano_noturno: [
    'Empty modern city street at night, wet asphalt reflecting colorful neon signs, blue and pink lights from storefronts, no cars, no pedestrians, cinematic urban atmosphere, rain-soaked road, 8k photorealistic',
    'Empty nighttime urban road, glistening wet tarmac with puddle reflections, purple and teal neon glow from buildings, no vehicles, no people, cyberpunk city atmosphere, moody streetlights, 8k photorealistic',
    'Empty city avenue at night, damp asphalt reflecting amber streetlights and blue neon, no cars, no pedestrians, atmospheric urban photography location, light fog, 8k photorealistic',
    'Empty wet city street after rain, reflective road surface, warm orange and cool blue light mixing from surrounding buildings, no vehicles, no people, dramatic urban night scene, 8k photorealistic',
    'Empty metropolitan street at night, rain-slicked asphalt with vivid reflections, defocused building lights creating bokeh, no cars, no pedestrians, cinematic automotive photography backdrop, 8k photorealistic',
  ],
  neutro_gradiente: [
    'Abstract professional gradient background, smooth transition from medium gray to deep charcoal, subtle centered radial light, no objects, minimalist automotive advertising backdrop, 8k quality',
    'Clean studio gradient background, gentle transition from warm gray to black, soft overhead light creating subtle highlight zone, no objects, professional car catalog background, 8k quality',
    'Minimalist gradient backdrop, smooth dark gray fading to black at edges, centered soft light pool, no distractions, no objects, premium automotive product background, 8k quality',
    'Professional gradient background, cool gray transitioning to near-black, asymmetric soft light from upper left, no objects, sleek automotive advertising backdrop, 8k quality',
    'Abstract dark gradient background, charcoal to black smooth transition, subtle warm radial light in center-bottom area, no objects, premium car showcase background, 8k quality',
  ],
}

const MODEL = 'black-forest-labs/flux-1.1-pro' as const

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function generateAndUpload(cenario: string, variacao: number, prompt: string, attempt = 1): Promise<boolean> {
  const tag = `${cenario}/${String(variacao).padStart(2, '0')}`
  console.log(`  Gerando ${tag}${attempt > 1 ? ` (tentativa ${attempt})` : ''}...`)

  try {
    const output = await replicate.run(MODEL, {
      input: {
        prompt,
        width: 1440,
        height: 810,
        num_inference_steps: 25,
        guidance: 3.5,
        output_format: 'jpg',
        output_quality: 92,
      },
    })

    // output can be a URL string or ReadableStream
    const url = typeof output === 'string' ? output : (output as { url?: () => string })?.url?.() || String(output)
    console.log(`  Baixando ${tag}...`)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    const buffer = await res.arrayBuffer()

    console.log(`  Uploading ${tag} (${(buffer.byteLength / 1024).toFixed(0)} KB)...`)

    const { error } = await supabase.storage
      .from('fundos-cenarios')
      .upload(`${cenario}/${String(variacao).padStart(2, '0')}.jpg`, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) throw error
    console.log(`  ✓ ${tag} uploaded`)
    return true
  } catch (err: any) {
    // Retry on rate limit (429) — up to 3 attempts with exponential backoff
    if (err?.response?.status === 429 && attempt < 3) {
      const retryAfter = parseInt(err?.response?.headers?.get?.('retry-after') || '12', 10)
      const waitMs = Math.max(retryAfter, 12) * 1000
      console.log(`  ⏳ Rate limited, aguardando ${waitMs / 1000}s...`)
      await sleep(waitMs)
      return generateAndUpload(cenario, variacao, prompt, attempt + 1)
    }
    console.error(`  ✗ ${tag} FALHOU:`, err?.message || err)
    return false
  }
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('VenStudio V2 — Geração de 25 fundos')
  console.log('═══════════════════════════════════════')

  let total = 0
  let sucesso = 0
  let falha = 0

  for (const [cenario, prompts] of Object.entries(CENARIOS)) {
    console.log(`\n▸ Cenário: ${cenario} (${prompts.length} variações)`)
    for (let i = 0; i < prompts.length; i++) {
      total++
      const ok = await generateAndUpload(cenario, i + 1, prompts[i])
      if (ok) sucesso++
      else falha++
      // Rate limit: 6 req/min → aguarda 12s entre gerações
      if (i < prompts.length - 1) {
        console.log('  ⏱ Aguardando 12s (rate limit)...')
        await sleep(12000)
      }
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`Total: ${total} | Sucesso: ${sucesso} | Falha: ${falha}`)
  console.log('═══════════════════════════════════════')

  if (falha > 0) {
    console.log('\n⚠ Algumas gerações falharam. Re-execute o script para tentar novamente (upsert=true).')
    process.exit(1)
  }

  console.log('\n✓ Todos os 25 fundos gerados e uploadados com sucesso!')
}

main()
