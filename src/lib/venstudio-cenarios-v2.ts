// ============================================================
// VenStudio V2 — Cenários Stability AI (Replace Background & Relight)
// Engine: POST /v2beta/stable-image/edit/replace-background-and-relight
// ============================================================

export interface CenarioV2Config {
  id: string
  label: string
  descricao: string
  prompt: string
  light_source_direction: 'above' | 'left' | 'right' | 'below'
  light_source_strength: number
  preserve_original_subject: number
  thumbnail: string
  gradient: string // para UI cards
  emoji: string
}

export const CENARIOS_V2 = {
  showroom: {
    id: 'showroom',
    label: 'Showroom Premium',
    descricao: 'Concessionária de luxo com piso de mármore',
    prompt: 'Premium car dealership showroom interior, polished white marble floor with mirror reflections, warm recessed ceiling spotlights, dark walnut wood accent walls, floor-to-ceiling glass windows showing soft golden hour cityscape, minimalist modern furniture in background, clean luxurious atmosphere',
    light_source_direction: 'above' as const,
    light_source_strength: 0.7,
    preserve_original_subject: 0.95,
    thumbnail: '/images/cenarios/showroom.svg',
    gradient: 'from-amber-100 to-stone-200',
    emoji: '🏛️',
  },
  deserto: {
    id: 'deserto',
    label: 'Deserto',
    descricao: 'Rodovia no deserto ao pôr do sol',
    prompt: 'Empty desert highway at golden hour, warm orange sand dunes on both sides, dramatic long shadows on smooth asphalt road, clear blue sky fading to warm orange at horizon, distant rocky mountains, cinematic wide landscape, professional automotive photography',
    light_source_direction: 'left' as const,
    light_source_strength: 0.8,
    preserve_original_subject: 0.95,
    thumbnail: '/images/cenarios/deserto.svg',
    gradient: 'from-orange-300 to-amber-600',
    emoji: '🏜️',
  },
  neve: {
    id: 'neve',
    label: 'Neve',
    descricao: 'Estrada de montanha no inverno',
    prompt: 'Scenic mountain road in winter, fresh white snow covering pine trees and ground, crisp clear blue sky, soft morning sunlight reflecting off snow, majestic snow-capped peaks in background, clean plowed asphalt road, peaceful cold atmosphere, professional automotive photography',
    light_source_direction: 'above' as const,
    light_source_strength: 0.6,
    preserve_original_subject: 0.95,
    thumbnail: '/images/cenarios/neve.svg',
    gradient: 'from-sky-100 to-blue-200',
    emoji: '❄️',
  },
  garagem_luxo: {
    id: 'garagem_luxo',
    label: 'Garagem de Luxo',
    descricao: 'Garagem subterrânea privativa',
    prompt: 'Underground private luxury garage, smooth dark epoxy floor with subtle reflections, exposed concrete ceiling with industrial pendant lights, matte black walls with LED strip accent lighting along the edges, vintage racing posters slightly blurred in background, single warm spotlight highlighting center of space, exclusive private car collection atmosphere',
    light_source_direction: 'above' as const,
    light_source_strength: 0.75,
    preserve_original_subject: 0.95,
    thumbnail: '/images/cenarios/garagem_luxo.svg',
    gradient: 'from-gray-800 to-gray-900',
    emoji: '🏎️',
  },
} as const

export type CenarioV2Id = keyof typeof CENARIOS_V2

export const CENARIOS_V2_LIST = Object.values(CENARIOS_V2)

export const CENARIO_V2_IDS = Object.keys(CENARIOS_V2) as CenarioV2Id[]
