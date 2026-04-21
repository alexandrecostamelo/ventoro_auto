// ============================================================
// VenStudio Premium V2 — Tipos TypeScript
// Pipeline async com Flux Fill Pro + validação pHash
// ============================================================

/** IDs dos 5 presets visuais */
export type PresetId =
  | 'luxury_showroom'
  | 'premium_studio'
  | 'modern_garage'
  | 'neutro_gradiente'
  | 'urban_premium'

/** Status do job assíncrono */
export type JobStatus =
  | 'processando'
  | 'concluido'
  | 'erro'
  | 'rejeitado'
  | 'fallback_elegivel'

/** Configuração completa de um preset visual */
export interface PresetConfig {
  id: PresetId
  nome: string
  desc: string
  /** Classe Tailwind para gradient do card */
  gradient: string
  /** Cor predominante para UI (hex) */
  cor: string
  /** Prompt positivo para Flux Fill Pro */
  promptPositive: string
  /** Prompt negativo — o que evitar na geração */
  promptNegative: string
  /** Guidance scale para Flux Fill (1-30, menor = mais conservador) */
  guidance: number
  /** Inference steps (20-50, menor = menos "criatividade") */
  steps: number
  /** Seed fixa para consistência visual (null = random) */
  seed: number | null
  /** Ajustes cosméticos Sharp para o veículo neste preset */
  ajustesVeiculo: {
    brightness: number   // 0.8–1.2
    saturation: number   // 0.8–1.3
    contrast: number     // 0.9–1.2
    sharpen: number      // 0–2 (sigma)
  }
}

/** Payload do frontend para iniciar processamento */
export interface PremiumJobRequest {
  veiculo_png_url: string
  foto_original_url: string
  preset_id: PresetId
  veiculo_id: string
  foto_id?: string
}

/** Resposta imediata ao criar job */
export interface PremiumJobResponse {
  success: boolean
  jobId: string
  status: JobStatus
  message?: string
}

/** Resposta do polling de status */
export interface JobStatusResponse {
  id: string
  status: JobStatus
  aprovado: boolean | null
  url_processada: string | null
  hamming_distance: number | null
  erro: string | null
  preset_id: string
  tentativas: number
  created_at: string
  updated_at: string
}

/** Resultado da validação de integridade do veículo */
export interface IntegrityResult {
  approved: boolean
  originalHash: string
  generatedHash: string
  hammingDistance: number
  reason?: string
}

/** Payload do webhook do Replicate */
export interface ReplicateWebhookPayload {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[]
  error?: string
  metrics?: { predict_time?: number }
}

/** Registro completo no banco processamentos_ia (V2) */
export interface ProcessamentoIAV2 {
  id: string
  veiculo_id: string
  foto_id: string | null
  foto_original_url: string
  foto_processada_url: string | null
  cenario: string
  pipeline_versao: 'v2_premium_async'
  status: JobStatus
  replicate_prediction_id: string | null
  preset_id: PresetId
  prompt_usado: string | null
  fingerprint_original: string | null
  fingerprint_processado: string | null
  fingerprint_match: boolean | null
  hamming_distance: number | null
  aprovado: boolean | null
  custo_estimado: number
  tempo_processamento_ms: number | null
  tentativas: number
  erro: string | null
  input_path: string | null
  mask_path: string | null
  created_at: string
  updated_at: string
}
