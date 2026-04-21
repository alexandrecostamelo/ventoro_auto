/**
 * VenStudio V2 — Regenerar fundos reprovados
 * Sobrescreve no bucket (upsert=true)
 */

import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const MODEL = 'black-forest-labs/flux-1.1-pro' as const

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── Fundos a regenerar com prompts corrigidos ──

const REGENERAR: { path: string; prompt: string }[] = [
  {
    path: 'showroom_escuro/02.jpg',
    prompt: 'Empty luxury car showroom corridor, completely vacant, no vehicles in the entire scene, no cars in foreground or background, no car silhouettes, no vehicle shapes anywhere, pristine empty space, reflective polished black floor, soft overhead lighting, architectural interior photography, 8k photorealistic',
  },
  {
    path: 'urbano_noturno/02.jpg',
    prompt: 'Empty deserted night street, heavy rain, completely abandoned, no cars anywhere in frame, no traffic, no vehicles on road, no vehicles in distance, no vehicle headlights, no taillights, pure empty wet asphalt only, distant city glow from buildings, neon reflections on ground, cinematic plate photography, 8k photorealistic',
  },
  {
    path: 'urbano_noturno/05.jpg',
    prompt: 'Empty deserted night street, heavy rain, completely abandoned road, no cars anywhere in frame, no traffic, no vehicles on road, no vehicles in distance, no vehicle headlights, no taillights, pure empty glossy asphalt only, soft warm streetlamp glow, distant blurred city lights from windows, cinematic plate photography, 8k photorealistic',
  },
]

async function generateAndUpload(item: { path: string; prompt: string }, attempt = 1): Promise<boolean> {
  console.log(`  Gerando ${item.path}${attempt > 1 ? ` (tentativa ${attempt})` : ''}...`)

  try {
    const output = await replicate.run(MODEL, {
      input: {
        prompt: item.prompt,
        width: 1440,
        height: 810,
        num_inference_steps: 25,
        guidance: 3.5,
        output_format: 'jpg',
        output_quality: 92,
      },
    })

    const url = typeof output === 'string' ? output : String(output)
    console.log(`  Baixando ${item.path}...`)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    const buffer = await res.arrayBuffer()

    console.log(`  Uploading ${item.path} (${(buffer.byteLength / 1024).toFixed(0)} KB)...`)

    const { error } = await supabase.storage
      .from('fundos-cenarios')
      .upload(item.path, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) throw error
    console.log(`  ✓ ${item.path} sobrescrito`)
    return true
  } catch (err: any) {
    if (err?.response?.status === 429 && attempt < 4) {
      const retryAfter = parseInt(err?.response?.headers?.get?.('retry-after') || '15', 10)
      const waitMs = Math.max(retryAfter, 15) * 1000
      console.log(`  ⏳ Rate limited, aguardando ${waitMs / 1000}s...`)
      await sleep(waitMs)
      return generateAndUpload(item, attempt + 1)
    }
    console.error(`  ✗ ${item.path} FALHOU:`, err?.message || err)
    return false
  }
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log(`Regenerando ${REGENERAR.length} fundos reprovados`)
  console.log('═══════════════════════════════════════\n')

  let sucesso = 0
  let falha = 0

  for (let i = 0; i < REGENERAR.length; i++) {
    const ok = await generateAndUpload(REGENERAR[i])
    if (ok) sucesso++
    else falha++
    if (i < REGENERAR.length - 1) {
      console.log('  ⏱ Aguardando 12s...')
      await sleep(12000)
    }
  }

  console.log(`\n═══════════════════════════════════════`)
  console.log(`Resultado: ${sucesso} OK / ${falha} falha`)
  console.log('═══════════════════════════════════════')

  if (falha > 0) process.exit(1)
}

main()
