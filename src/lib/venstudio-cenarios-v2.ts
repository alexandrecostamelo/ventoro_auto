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
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/showroom.svg',
    gradient: 'from-amber-100 to-stone-200',
    emoji: '🏛️',
  },
  estudio: {
    id: 'estudio',
    label: 'Estúdio Profissional',
    descricao: 'Fundo neutro clean, estilo catálogo',
    prompt: 'Professional photography studio, seamless white infinity backdrop, perfectly smooth light gray polished concrete floor with soft reflections, high-key studio lighting with large softboxes, clean minimalist commercial automotive photography, no shadows, bright even lighting',
    light_source_direction: 'above' as const,
    light_source_strength: 0.8,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/estudio.svg',
    gradient: 'from-gray-100 to-white',
    emoji: '📸',
  },
  garagem_luxo: {
    id: 'garagem_luxo',
    label: 'Garagem de Luxo',
    descricao: 'Garagem subterrânea privativa com LED',
    prompt: 'Underground private luxury garage, smooth dark epoxy floor with subtle reflections, exposed concrete ceiling with industrial pendant lights, matte black walls with LED strip accent lighting along the edges, vintage racing posters slightly blurred in background, single warm spotlight highlighting center of space, exclusive private car collection atmosphere',
    light_source_direction: 'above' as const,
    light_source_strength: 0.75,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/garagem_luxo.svg',
    gradient: 'from-gray-800 to-gray-900',
    emoji: '🏎️',
  },
  externo: {
    id: 'externo',
    label: 'Externo Premium',
    descricao: 'Paisagem elegante ao pôr do sol',
    prompt: 'Elegant outdoor scenic location at golden hour, smooth clean asphalt road, lush green manicured lawn on the sides, soft warm sunset light from the left, clear sky with gentle warm gradient from blue to golden orange, distant modern architecture blurred in background, professional automotive photography, cinematic atmosphere',
    light_source_direction: 'left' as const,
    light_source_strength: 0.7,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/externo.svg',
    gradient: 'from-amber-200 to-orange-400',
    emoji: '🌅',
  },
  urbano: {
    id: 'urbano',
    label: 'Urbano Noturno',
    descricao: 'Cidade à noite com reflexos e neon',
    prompt: 'Modern city street at night, wet asphalt road with beautiful reflections, soft neon lights from nearby buildings in blue and purple tones, subtle bokeh city lights in background, dramatic moody atmosphere, gentle rain puddle reflections on the ground, professional automotive night photography',
    light_source_direction: 'right' as const,
    light_source_strength: 0.6,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/urbano.svg',
    gradient: 'from-indigo-900 to-purple-900',
    emoji: '🌃',
  },
} as const

export type CenarioV2Id = keyof typeof CENARIOS_V2

export const CENARIOS_V2_LIST = Object.values(CENARIOS_V2)

export const CENARIO_V2_IDS = Object.keys(CENARIOS_V2) as CenarioV2Id[]
