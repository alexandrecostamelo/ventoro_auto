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
  /** Sombra adaptativa por cenário */
  sombra: {
    cor: string        // hex: cor da sombra
    opacidade: number  // 0–1: fill-opacity do SVG
    blur: number       // px: sigma do blur
    blend: 'over' | 'multiply'  // blend mode no composite
  }
}

export const CENARIOS: Record<CenarioId, CenarioConfig> = {
  showroom_escuro: {
    id: 'showroom_escuro',
    nome: 'Showroom Escuro',
    desc: 'Piso polido reflexivo, iluminação lateral dramática',
    gradient: 'from-gray-900 to-gray-800',
    tom: '#1a1a2e',
    yRatio: 0.92,
    escalaVeiculo: 0.65,
    promptFluxFill: 'Clean empty car dealership showroom interior, dark reflective tile floor, simple modern overhead lighting, plain dark walls, no decorations, no text, no logos, no other vehicles, background only, photographic, 8k',
    ajustesVeiculo: { brightness: 1.05, saturation: 1.1, contrast: 1.08, sharpen: 0.8 },
    sombra: { cor: '#000000', opacidade: 0.65, blur: 50, blend: 'multiply' },
  },
  estudio_branco: {
    id: 'estudio_branco',
    nome: 'Estúdio Branco',
    desc: 'Fundo branco infinito, luz difusa, sombra suave',
    gradient: 'from-gray-100 to-white',
    tom: '#f5f5f5',
    yRatio: 0.92,
    escalaVeiculo: 0.6,
    promptFluxFill: 'Empty white room, plain white floor and walls, soft even overhead lighting, no equipment visible, no text, no logos, simple clean white background, bright and luminous, photographic, 8k',
    ajustesVeiculo: { brightness: 1.08, saturation: 1.05, contrast: 1.02, sharpen: 0.5 },
    sombra: { cor: '#333333', opacidade: 0.35, blur: 40, blend: 'over' },
  },
  garagem_premium: {
    id: 'garagem_premium',
    nome: 'Garagem Premium',
    desc: 'Concreto texturizado, luz quente focada, industrial',
    gradient: 'from-amber-900 to-stone-800',
    tom: '#3d2b1f',
    yRatio: 0.92,
    escalaVeiculo: 0.62,
    promptFluxFill: 'Simple clean garage interior, concrete floor, warm overhead lighting, plain walls, no decorations, no text, no logos, no other vehicles, background only, photographic, 8k',
    ajustesVeiculo: { brightness: 1.02, saturation: 1.08, contrast: 1.05, sharpen: 0.6 },
    sombra: { cor: '#1a0f00', opacidade: 0.55, blur: 50, blend: 'multiply' },
  },
  urbano_noturno: {
    id: 'urbano_noturno',
    nome: 'Urbano Noturno',
    desc: 'Rua molhada com neons desfocados',
    gradient: 'from-blue-900 to-purple-900',
    tom: '#0d1b2a',
    yRatio: 0.92,
    escalaVeiculo: 0.58,
    promptFluxFill: 'City street at night, dark wet asphalt road, distant blurred city lights, no text, no signs, no logos, no other vehicles, background only, photographic, 8k',
    ajustesVeiculo: { brightness: 0.95, saturation: 1.15, contrast: 1.1, sharpen: 0.7 },
    sombra: { cor: '#000000', opacidade: 0.7, blur: 45, blend: 'multiply' },
  },
  neutro_gradiente: {
    id: 'neutro_gradiente',
    nome: 'Fundo Neutro',
    desc: 'Gradiente cinza para preto, sem distrações',
    gradient: 'from-gray-600 to-gray-900',
    tom: '#2d2d2d',
    yRatio: 0.92,
    escalaVeiculo: 0.6,
    promptFluxFill: 'Plain dark gradient background, smooth gray to black transition, subtle center lighting, no text, no logos, no patterns, simple clean backdrop, photographic, 8k',
    ajustesVeiculo: { brightness: 1.03, saturation: 1.02, contrast: 1.05, sharpen: 0.5 },
    sombra: { cor: '#000000', opacidade: 0.45, blur: 55, blend: 'over' },
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
