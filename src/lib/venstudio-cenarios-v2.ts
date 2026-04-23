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
    descricao: 'Concessionária de luxo noturna, piso escuro espelhado',
    prompt: 'Dark luxury car dealership showroom at night, polished black granite floor with mirror reflections, dramatic warm spotlights from above creating pools of light, dark charcoal walls with subtle LED accent strips, floor-to-ceiling tinted windows showing distant city lights at night, moody cinematic atmosphere, professional automotive photography',
    light_source_direction: 'above' as const,
    light_source_strength: 0.7,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/showroom.svg',
    gradient: 'from-amber-100 to-stone-200',
    emoji: '🏛️',
  },
  estudio: {
    id: 'estudio',
    label: 'Estúdio Dark',
    descricao: 'Fundo escuro dramático, iluminação cinematográfica',
    prompt: 'Professional dark photography studio, seamless black backdrop, single dramatic key light from upper left creating sharp highlights and deep shadows, subtle rim light on edges, polished dark concrete floor with faint reflection, high contrast cinematic product photography, dark moody atmosphere',
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
    descricao: 'Garagem subterrânea escura, spotlight dramático',
    prompt: 'Underground private luxury garage at night, smooth dark epoxy floor with wet reflections, exposed raw concrete ceiling with single warm pendant spotlight, matte black walls with amber LED strip lighting along base, deep shadows, dramatic contrast, exclusive private car vault atmosphere, cinematic dark mood',
    light_source_direction: 'above' as const,
    light_source_strength: 0.75,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/garagem_luxo.svg',
    gradient: 'from-gray-800 to-gray-900',
    emoji: '🏎️',
  },
  externo: {
    id: 'externo',
    label: 'Externo Noturno',
    descricao: 'Estrada elegante ao anoitecer, céu dramático',
    prompt: 'Dark elegant outdoor scenic road at dusk, smooth clean dark asphalt, dramatic twilight sky with deep purple and orange gradient, distant city skyline silhouette with warm lights, moody atmospheric fog, professional automotive photography, cinematic dark atmosphere',
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
    descricao: 'Rua da cidade à noite com neon e chuva',
    prompt: 'Dark empty city street at night after rain, wet black asphalt with colorful neon reflections, moody purple and orange city lights in blurred background, dramatic fog and mist, no people, no other vehicles, cinematic night photography, dark atmospheric urban scene',
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
