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
    descricao: 'Showroom escuro, piso preto espelhado, spotlight dramático',
    prompt: 'Pitch black luxury car showroom at night, very dark polished black granite floor with subtle mirror reflections, single dramatic warm spotlight from directly above, dark charcoal walls, dark ceiling, floor-to-ceiling tinted windows showing distant city lights, extremely dark moody cinematic atmosphere, all surfaces are dark, no white surfaces, professional automotive photography',
    light_source_direction: 'above' as const,
    light_source_strength: 0.5,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/showroom.svg',
    gradient: 'from-gray-800 to-gray-900',
    emoji: '🏛️',
  },
  estudio: {
    id: 'estudio',
    label: 'Estúdio Dark',
    descricao: 'Fundo 100% preto, iluminação cinematográfica lateral',
    prompt: 'Pitch black photography studio, seamless pure black backdrop and black floor, single dramatic key light from upper left creating sharp highlights and deep shadows on the car only, subtle rim light on edges, very dark polished black concrete floor with faint reflection, extreme high contrast, all surfaces are black, no white surfaces, cinematic product photography',
    light_source_direction: 'left' as const,
    light_source_strength: 0.5,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/estudio.svg',
    gradient: 'from-gray-900 to-black',
    emoji: '📸',
  },
  garagem_luxo: {
    id: 'garagem_luxo',
    label: 'Garagem de Luxo',
    descricao: 'Garagem subterrânea escura, piso preto, LED âmbar',
    prompt: 'Pitch black underground private luxury garage at night, very dark black epoxy floor with wet reflections, raw dark concrete ceiling with single warm pendant spotlight, matte black walls with dim amber LED strip along base, deep shadows everywhere, extreme contrast, all surfaces are dark, no white surfaces, exclusive private car vault, cinematic dark mood',
    light_source_direction: 'above' as const,
    light_source_strength: 0.5,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/garagem_luxo.svg',
    gradient: 'from-gray-800 to-gray-900',
    emoji: '🏎️',
  },
  externo: {
    id: 'externo',
    label: 'Externo Noturno',
    descricao: 'Estrada escura à noite, asfalto preto, céu dramático',
    prompt: 'Very dark outdoor scenic road at night, pitch black clean dark asphalt road, dramatic dark twilight sky with deep purple and orange gradient on horizon only, distant city skyline silhouette with small warm lights, dark moody atmospheric fog, all ground surfaces are dark black asphalt, no white surfaces, professional automotive photography, cinematic dark atmosphere',
    light_source_direction: 'left' as const,
    light_source_strength: 0.5,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/externo.svg',
    gradient: 'from-gray-800 to-indigo-900',
    emoji: '🌅',
  },
  urbano: {
    id: 'urbano',
    label: 'Urbano Noturno',
    descricao: 'Rua escura após chuva, neon, asfalto preto molhado',
    prompt: 'Pitch black empty city street at night after rain, wet black asphalt with colorful neon reflections, very dark scene, moody purple and orange city lights in blurred background, dramatic fog and mist, all ground surfaces are wet dark black asphalt, no white surfaces, no people, no other vehicles, cinematic night photography, extremely dark atmospheric urban scene',
    light_source_direction: 'right' as const,
    light_source_strength: 0.4,
    preserve_original_subject: 1.0,
    thumbnail: '/images/cenarios/urbano.svg',
    gradient: 'from-indigo-900 to-purple-900',
    emoji: '🌃',
  },
} as const

export type CenarioV2Id = keyof typeof CENARIOS_V2

export const CENARIOS_V2_LIST = Object.values(CENARIOS_V2)

export const CENARIO_V2_IDS = Object.keys(CENARIOS_V2) as CenarioV2Id[]
