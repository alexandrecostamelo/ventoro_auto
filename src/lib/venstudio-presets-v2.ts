// ============================================================
// VenStudio Premium V2 — Presets visuais controlados
// 5 estilos de ambiente com prompts, parâmetros e restrições
// ============================================================
//
// Regras de prompt:
// - NUNCA usar "8k" (Flux renderiza como texto literal)
// - NUNCA usar palavras indutoras (luxury, premium, professional, enhanced, high-end)
// - Descrever o AMBIENTE, não o carro
// - Incluir "no text, no logos" em todos
// - Prompt negativo padrão compartilhado
//
// Para expandir no futuro:
// - Adicionar presets por tipo de veículo (SUV, sedan, hatch, picape, moto)
// - Ajustar ajustesVeiculo por cor do carro (carros escuros precisam de mais brightness)
// - Seed consistente pode ser habilitada por preset para resultados reproduzíveis
// ============================================================

import type { PresetId, PresetConfig } from './venstudio-types-v2'

/** Prompt negativo padrão — compartilhado por todos os presets */
export const NEGATIVE_PROMPT_BASE =
  'text, words, letters, numbers, writing, caption, title, subtitle, watermark, ' +
  'logo, brand, signature, stamp, label, sign, banner, ' +
  'people, person, human, pedestrian, crowd, ' +
  'other cars, other vehicles, motorcycle, bicycle, ' +
  'distortion, deformation, blurry, out of focus, low quality, artifacts, noise, ' +
  'cartoon, illustration, painting, drawing, anime, CGI, render, ' +
  'oversaturated, neon colors, unrealistic lighting'

export const PRESETS: Record<PresetId, PresetConfig> = {

  // ── 1. Showroom de Luxo ──────────────────────────────────
  // Objetivo: concessionária moderna, piso escuro reflexivo
  // Atmosfera: elegante, contida, foco total no veículo
  // Restrições: sem objetos, sem pessoas, sem decoração excessiva
  luxury_showroom: {
    id: 'luxury_showroom',
    nome: 'Showroom',
    desc: 'Concessionária moderna com piso espelhado escuro',
    gradient: 'from-gray-900 to-gray-800',
    cor: '#1a1a2e',
    promptPositive:
      'Empty modern car dealership interior, dark polished tile floor with subtle reflections, ' +
      'clean recessed ceiling lights, smooth dark gray walls, spacious open room, ' +
      'even soft ambient lighting, no furniture, no decorations, ' +
      'no text, no logos, no other vehicles, photorealistic photograph',
    promptNegative: NEGATIVE_PROMPT_BASE,
    guidance: 15,
    steps: 40,
    seed: null,
    ajustesVeiculo: {
      brightness: 1.05,
      saturation: 1.08,
      contrast: 1.06,
      sharpen: 0.7,
    },
  },

  // ── 2. Estúdio Premium ───────────────────────────────────
  // Objetivo: fundo branco infinito (cyclorama), iluminação difusa
  // Atmosfera: limpa, comercial, catálogo
  // Restrições: sem equipamento visível, branco puro
  premium_studio: {
    id: 'premium_studio',
    nome: 'Estúdio',
    desc: 'Fundo branco infinito com luz difusa suave',
    gradient: 'from-gray-100 to-white',
    cor: '#f5f5f5',
    promptPositive:
      'Empty bright white room, seamless white floor blending into white walls, ' +
      'soft diffused overhead lighting creating gentle shadows on floor, ' +
      'clean and minimal, bright luminous atmosphere, ' +
      'no equipment, no furniture, no decorations, ' +
      'no text, no logos, photorealistic commercial photograph',
    promptNegative: NEGATIVE_PROMPT_BASE + ', dark, shadows, gray, dim',
    guidance: 12, // mais baixo para evitar "inventar" estúdio complexo
    steps: 40,
    seed: null,
    ajustesVeiculo: {
      brightness: 1.08,
      saturation: 1.04,
      contrast: 1.02,
      sharpen: 0.5,
    },
  },

  // ── 3. Garagem Moderna ───────────────────────────────────
  // Objetivo: garagem industrial limpa, concreto, iluminação quente
  // Atmosfera: moody, editorial, workshop
  // Restrições: sem ferramentas, sem bagunça, sem texto
  modern_garage: {
    id: 'modern_garage',
    nome: 'Garagem',
    desc: 'Interior industrial limpo com concreto e luz quente',
    gradient: 'from-amber-900 to-stone-800',
    cor: '#3d2b1f',
    promptPositive:
      'Clean empty garage interior, smooth concrete floor, ' +
      'warm overhead lighting, plain concrete walls, ' +
      'simple industrial space, no tools, no clutter, no shelves, ' +
      'no text, no logos, no other vehicles, ' +
      'photorealistic photograph with warm tones',
    promptNegative: NEGATIVE_PROMPT_BASE + ', messy, dirty, rusty, cluttered, tools',
    guidance: 15,
    steps: 40,
    seed: null,
    ajustesVeiculo: {
      brightness: 1.02,
      saturation: 1.06,
      contrast: 1.05,
      sharpen: 0.6,
    },
  },

  // ── 4. Neutro Gradiente ──────────────────────────────────
  // Objetivo: fundo gradiente escuro sem distrações
  // Atmosfera: catálogo, foco 100% no veículo
  // Restrições: sem padrões, sem texturas, sem objetos
  neutro_gradiente: {
    id: 'neutro_gradiente',
    nome: 'Neutro',
    desc: 'Gradiente escuro minimalista sem distrações',
    gradient: 'from-gray-600 to-gray-900',
    cor: '#2d2d2d',
    promptPositive:
      'Plain dark gradient background, smooth gray to black transition, ' +
      'subtle center lighting, clean and minimal, ' +
      'no patterns, no textures, no objects, ' +
      'no text, no logos, ' +
      'simple clean dark backdrop, photorealistic photograph',
    promptNegative: NEGATIVE_PROMPT_BASE + ', bright, colorful, outdoor, indoor, room',
    guidance: 12,
    steps: 40,
    seed: null,
    ajustesVeiculo: {
      brightness: 1.03,
      saturation: 1.02,
      contrast: 1.05,
      sharpen: 0.5,
    },
  },

  // ── 5. Urbano Premium ────────────────────────────────────
  // Objetivo: rua urbana noturna, asfalto molhado, luzes desfocadas
  // Atmosfera: cinematic, moody, editorial
  // Restrições: sem texto visível, sem placas legíveis
  urban_premium: {
    id: 'urban_premium',
    nome: 'Urbano',
    desc: 'Rua noturna com asfalto molhado e luzes desfocadas',
    gradient: 'from-blue-900 to-purple-900',
    cor: '#0d1b2a',
    promptPositive:
      'Empty city street at night, dark wet asphalt road with subtle reflections, ' +
      'distant blurred warm and cool lights in background, ' +
      'moody atmospheric lighting, shallow depth of field, ' +
      'no people, no signs, no readable text, ' +
      'no logos, no other vehicles, ' +
      'photorealistic cinematic night photograph',
    promptNegative: NEGATIVE_PROMPT_BASE + ', daytime, bright, sunny, indoor',
    guidance: 15,
    steps: 40,
    seed: null,
    ajustesVeiculo: {
      brightness: 0.96,
      saturation: 1.12,
      contrast: 1.08,
      sharpen: 0.7,
    },
  },
}

export const PRESET_LIST = Object.values(PRESETS)
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[]

/** Retorna config completa de um preset */
export function getPreset(id: PresetId): PresetConfig {
  return PRESETS[id]
}

/** Monta o prompt final para Flux Fill com contexto opcional do veículo */
export function buildPrompt(presetId: PresetId, _vehicleContext?: {
  tipo?: 'suv' | 'sedan' | 'hatch' | 'picape' | 'moto'
  cor?: string
}): { positive: string; negative: string } {
  const preset = PRESETS[presetId]

  // Futuro: ajustar prompt com base no tipo/cor do veículo
  // Ex: SUV precisa de teto mais alto, picape precisa de espaço traseiro
  // Ex: carro preto em fundo escuro pode precisar de mais contraste

  return {
    positive: preset.promptPositive,
    negative: preset.promptNegative,
  }
}

/** Preset padrão recomendado para MVP */
export const DEFAULT_PRESET: PresetId = 'luxury_showroom'
