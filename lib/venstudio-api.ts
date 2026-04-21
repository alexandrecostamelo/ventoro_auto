// ============================================================
// VenStudio V2 — Shared utilities for Vercel Serverless Functions
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

/** Service-role client (for storage uploads, DB writes) */
export function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

/** Anon client with user's JWT (for auth verification) */
export function getUserClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
}

/** Verify JWT and return user, or null */
export async function verifyUser(authHeader: string | null) {
  if (!authHeader) return null
  const client = getUserClient(authHeader)
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return null
  return user
}

/** Variações disponíveis por cenário */
export const VARIACOES: Record<string, number[]> = {
  showroom_escuro: [1, 3, 4, 5],
  estudio_branco: [1, 2, 3, 4, 5],
  garagem_premium: [1, 2, 3, 4, 5],
  urbano_noturno: [1, 2, 3, 4, 5],
  neutro_gradiente: [1, 2, 3, 4, 5],
}

/** URL pública de um fundo pré-gerado */
export function fundoPublicUrl(cenarioId: string, variacao: number): string {
  const padded = String(variacao).padStart(2, '0')
  return `${SUPABASE_URL}/storage/v1/object/public/fundos-cenarios/${cenarioId}/${padded}.jpg`
}

/** Variação aleatória entre as disponíveis */
export function fundoAleatorioUrl(cenarioId: string): string {
  const disponiveis = VARIACOES[cenarioId] || [1, 2, 3, 4, 5]
  const variacao = disponiveis[Math.floor(Math.random() * disponiveis.length)]
  return fundoPublicUrl(cenarioId, variacao)
}

/** Cenários válidos */
export const CENARIOS_VALIDOS = [
  'showroom_escuro',
  'estudio_branco',
  'garagem_premium',
  'urbano_noturno',
  'neutro_gradiente',
] as const

export type CenarioId = (typeof CENARIOS_VALIDOS)[number]

/** Configuração de ajustes por cenário (server-side) */
export const CENARIO_CONFIG: Record<CenarioId, {
  tom: string
  intensidadeSombra: number
  yRatio: number
  escalaVeiculo: number
  promptFluxFill: string
  ajustesVeiculo: {
    brightness: number
    saturation: number
    contrast: number
    sharpen: number
  }
}> = {
  showroom_escuro: {
    tom: '#1a1a2e',
    intensidadeSombra: 0.7,
    yRatio: 0.62,
    escalaVeiculo: 0.65,
    promptFluxFill: 'Premium dark car showroom, polished black reflective marble floor, dramatic LED side lighting, dark charcoal walls, professional automotive photography, photorealistic',
    ajustesVeiculo: { brightness: 1.05, saturation: 1.1, contrast: 1.08, sharpen: 0.8 },
  },
  estudio_branco: {
    tom: '#f5f5f5',
    intensidadeSombra: 0.25,
    yRatio: 0.65,
    escalaVeiculo: 0.6,
    promptFluxFill: 'Professional white photography studio, infinite white cyclorama, soft diffused overhead lighting, clean seamless floor, commercial product photography, photorealistic',
    ajustesVeiculo: { brightness: 1.08, saturation: 1.05, contrast: 1.02, sharpen: 0.5 },
  },
  garagem_premium: {
    tom: '#3d2b1f',
    intensidadeSombra: 0.5,
    yRatio: 0.63,
    escalaVeiculo: 0.62,
    promptFluxFill: 'Industrial loft garage, textured polished concrete floor, warm amber focused lighting, exposed brick and metal elements, moody atmospheric automotive workshop, photorealistic',
    ajustesVeiculo: { brightness: 1.02, saturation: 1.08, contrast: 1.05, sharpen: 0.6 },
  },
  urbano_noturno: {
    tom: '#0d1b2a',
    intensidadeSombra: 0.6,
    yRatio: 0.60,
    escalaVeiculo: 0.58,
    promptFluxFill: 'Modern city street at night, wet asphalt reflecting neon lights, cyberpunk atmosphere, defocused building lights, cinematic automotive photography, photorealistic',
    ajustesVeiculo: { brightness: 0.95, saturation: 1.15, contrast: 1.1, sharpen: 0.7 },
  },
  neutro_gradiente: {
    tom: '#2d2d2d',
    intensidadeSombra: 0.35,
    yRatio: 0.64,
    escalaVeiculo: 0.6,
    promptFluxFill: 'Professional gradient background, smooth transition charcoal gray to deep black, subtle radial lighting, minimalist automotive advertising background, photorealistic',
    ajustesVeiculo: { brightness: 1.03, saturation: 1.02, contrast: 1.05, sharpen: 0.5 },
  },
}

/** CORS headers para Vercel Functions */
export const ALLOWED_ORIGINS = new Set([
  'https://ventoro.com.br',
  'https://www.ventoro.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://ventoro-auto.vercel.app',
])

export function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://ventoro.com.br'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
