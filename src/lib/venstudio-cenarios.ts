// ============================================================
// VenStudio V2 — Metadata dos cenários
// 5 cenários × 5 variações = 25 fundos pré-gerados
// Fundos armazenados em: fundos-cenarios/{cenarioId}/{01-05}.jpg
// ============================================================

export type CenarioId =
  | 'showroom_escuro'
  | 'estudio_branco'
  | 'garagem_premium'
  | 'urbano_noturno'
  | 'neutro_gradiente'

export interface CenarioConfig {
  id: CenarioId
  nome: string
  desc: string
  gradient: string // para UI cards
  /** Tom predominante para color matching Sharp (RGB hex) */
  tom: string
  /** Intensidade da sombra projetada (0–1) */
  intensidadeSombra: number
  /** Posição vertical do veículo no fundo (0=topo, 1=base). Típico: 0.55–0.72 */
  yRatio: number
  /** Escala relativa do veículo no fundo (0.5 = 50% da largura) */
  escalaVeiculo: number
  /** Prompt para Flux Fill (Tier C) — inpainting do fundo */
  promptFluxFill: string
  /** Ajustes cosméticos Sharp para o veículo neste cenário */
  ajustesVeiculo: {
    brightness: number   // 0.8–1.2
    saturation: number   // 0.8–1.3
    contrast: number     // 0.9–1.2 (via linear)
    sharpen: number      // 0–2 (sigma)
  }
}

export const CENARIOS: Record<CenarioId, CenarioConfig> = {
  showroom_escuro: {
    id: 'showroom_escuro',
    nome: 'Showroom Escuro',
    desc: 'Piso polido reflexivo, iluminação lateral dramática',
    gradient: 'from-gray-900 to-gray-800',
    tom: '#1a1a2e',
    intensidadeSombra: 0.7,
    yRatio: 0.62,
    escalaVeiculo: 0.65,
    promptFluxFill: 'Premium dark car showroom, polished black reflective marble floor, dramatic LED side lighting, dark charcoal walls, professional automotive photography, photorealistic',
    ajustesVeiculo: {
      brightness: 1.05,
      saturation: 1.1,
      contrast: 1.08,
      sharpen: 0.8,
    },
  },
  estudio_branco: {
    id: 'estudio_branco',
    nome: 'Estúdio Branco',
    desc: 'Fundo branco infinito, luz difusa, sombra suave',
    gradient: 'from-gray-100 to-white',
    tom: '#f5f5f5',
    intensidadeSombra: 0.25,
    yRatio: 0.65,
    escalaVeiculo: 0.6,
    promptFluxFill: 'Professional white photography studio, infinite white cyclorama, soft diffused overhead lighting, clean seamless floor, commercial product photography, photorealistic',
    ajustesVeiculo: {
      brightness: 1.08,
      saturation: 1.05,
      contrast: 1.02,
      sharpen: 0.5,
    },
  },
  garagem_premium: {
    id: 'garagem_premium',
    nome: 'Garagem Premium',
    desc: 'Concreto texturizado, luz quente focada, industrial',
    gradient: 'from-amber-900 to-stone-800',
    tom: '#3d2b1f',
    intensidadeSombra: 0.5,
    yRatio: 0.63,
    escalaVeiculo: 0.62,
    promptFluxFill: 'Industrial loft garage, textured polished concrete floor, warm amber focused lighting, exposed brick and metal elements, moody atmospheric automotive workshop, photorealistic',
    ajustesVeiculo: {
      brightness: 1.02,
      saturation: 1.08,
      contrast: 1.05,
      sharpen: 0.6,
    },
  },
  urbano_noturno: {
    id: 'urbano_noturno',
    nome: 'Urbano Noturno',
    desc: 'Rua molhada com neons desfocados',
    gradient: 'from-blue-900 to-purple-900',
    tom: '#0d1b2a',
    intensidadeSombra: 0.6,
    yRatio: 0.60,
    escalaVeiculo: 0.58,
    promptFluxFill: 'Modern city street at night, wet asphalt reflecting neon lights, cyberpunk atmosphere, defocused building lights, cinematic automotive photography, photorealistic',
    ajustesVeiculo: {
      brightness: 0.95,
      saturation: 1.15,
      contrast: 1.1,
      sharpen: 0.7,
    },
  },
  neutro_gradiente: {
    id: 'neutro_gradiente',
    nome: 'Fundo Neutro',
    desc: 'Gradiente cinza para preto, sem distrações',
    gradient: 'from-gray-600 to-gray-900',
    tom: '#2d2d2d',
    intensidadeSombra: 0.35,
    yRatio: 0.64,
    escalaVeiculo: 0.6,
    promptFluxFill: 'Professional gradient background, smooth transition charcoal gray to deep black, subtle radial lighting, minimalist automotive advertising background, photorealistic',
    ajustesVeiculo: {
      brightness: 1.03,
      saturation: 1.02,
      contrast: 1.05,
      sharpen: 0.5,
    },
  },
}

export const CENARIOS_LIST = Object.values(CENARIOS)

export const CENARIO_IDS = Object.keys(CENARIOS) as CenarioId[]

/** Variações disponíveis por cenário (arquivos aprovados no bucket) */
export const VARIACOES: Record<CenarioId, number[]> = {
  showroom_escuro: [1, 3, 4, 5],       // 02 deletado (carro fantasma persistente)
  estudio_branco: [1, 2, 3, 4, 5],
  garagem_premium: [1, 2, 3, 4, 5],
  urbano_noturno: [1, 2, 3, 4, 5],
  neutro_gradiente: [1, 2, 3, 4, 5],
}

/** Retorna URL pública de um fundo pré-gerado */
export function fundoUrl(cenarioId: CenarioId, variacao: number): string {
  const base = import.meta.env.VITE_SUPABASE_URL
  const padded = String(variacao).padStart(2, '0')
  return `${base}/storage/v1/object/public/fundos-cenarios/${cenarioId}/${padded}.jpg`
}

/** Variação aleatória entre as disponíveis do cenário */
export function fundoAleatorio(cenarioId: CenarioId): string {
  const disponiveis = VARIACOES[cenarioId]
  const variacao = disponiveis[Math.floor(Math.random() * disponiveis.length)]
  return fundoUrl(cenarioId, variacao)
}
