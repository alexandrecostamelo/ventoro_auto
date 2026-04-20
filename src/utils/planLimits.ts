// ============================================================
// Limites e configuração dos planos de garagem
// Price IDs são PLACEHOLDER — substituir pelos reais do Stripe Dashboard
// ============================================================

export type PlanoGaragem = 'starter' | 'pro' | 'premium'

export interface PlanLimits {
  veiculos: number
  destaquesmes: number
  venstudio: boolean
  venstudioTierB: boolean   // Troca de fundo determinística (Sharp)
  venstudioTierC: boolean   // Troca de fundo premium (Flux Fill + mask + fingerprint)
  fotosIaMes: number        // 0 = não incluído, 999 = ilimitado (legacy, soma B+C)
  fotosIaTierBMes: number   // Fotos Tier B por mês
  fotosIaTierCMes: number   // Fotos Tier C por mês
  alertas: boolean
  relatorios: 'basico' | 'completo'
  preco: number // centavos BRL
  precoDisplay: string
}

export const PLAN_LIMITS: Record<PlanoGaragem, PlanLimits> = {
  starter: {
    veiculos: 10,
    destaquesmes: 0,
    venstudio: false,
    venstudioTierB: false,
    venstudioTierC: false,
    fotosIaMes: 0,
    fotosIaTierBMes: 0,
    fotosIaTierCMes: 0,
    alertas: false,
    relatorios: 'basico',
    preco: 9990, // R$ 99,90
    precoDisplay: 'R$ 99,90',
  },
  pro: {
    veiculos: 30,
    destaquesmes: 5,
    venstudio: true,
    venstudioTierB: true,
    venstudioTierC: false,
    fotosIaMes: 30,
    fotosIaTierBMes: 30,
    fotosIaTierCMes: 0,
    alertas: true,
    relatorios: 'completo',
    preco: 29990, // R$ 299,90
    precoDisplay: 'R$ 299,90',
  },
  premium: {
    veiculos: 999,
    destaquesmes: 999,
    venstudio: true,
    venstudioTierB: true,
    venstudioTierC: true,
    fotosIaMes: 999,
    fotosIaTierBMes: 999,
    fotosIaTierCMes: 50,
    alertas: true,
    relatorios: 'completo',
    preco: 49990, // R$ 499,90
    precoDisplay: 'R$ 499,90',
  },
}

// ============================================================
// Stripe Price IDs — SUBSTITUIR pelos reais após criar no Dashboard
// Stripe Dashboard → Test Mode → Products → Create product
// ============================================================
export const STRIPE_PRICES: Record<PlanoGaragem | 'destaque', string> = {
  starter: 'price_PLACEHOLDER_STARTER',
  pro: 'price_PLACEHOLDER_PRO',
  premium: 'price_PLACEHOLDER_PREMIUM',
  destaque: 'price_PLACEHOLDER_DESTAQUE', // one-time R$ 29,90
}

export const DESTAQUE_PRECO = 2990 // R$ 29,90
export const DESTAQUE_DIAS = 7
export const TRIAL_DIAS = 14
export const VENSTUDIO_PRECO_FOTO = 190 // R$ 1,90 por foto (particular/starter)

// ============================================================
// Helpers
// ============================================================

export function getLimits(plano: string): PlanLimits {
  return PLAN_LIMITS[plano as PlanoGaragem] ?? PLAN_LIMITS.starter
}

export function canPublish(plano: string, veiculosAtivos: number): boolean {
  const limits = getLimits(plano)
  return veiculosAtivos < limits.veiculos
}

export function canUseFeature(plano: string, feature: 'venstudio' | 'venstudioTierB' | 'venstudioTierC' | 'alertas' | 'destaques'): boolean {
  const limits = getLimits(plano)
  switch (feature) {
    case 'venstudio': return limits.venstudio
    case 'venstudioTierB': return limits.venstudioTierB
    case 'venstudioTierC': return limits.venstudioTierC
    case 'alertas': return limits.alertas
    case 'destaques': return limits.destaquesmes > 0
  }
}

export function getUpgradeSuggestion(plano: string, feature: string): string {
  if (plano === 'starter') return `Disponível no plano Pro. Faça upgrade para desbloquear.`
  if (plano === 'pro') return `Disponível no plano Premium.`
  return ''
}

export const PLAN_FEATURES: Record<PlanoGaragem, string[]> = {
  starter: [
    'Até 10 veículos ativos',
    'Página da garagem',
    'Leads por formulário',
    'Relatórios básicos',
  ],
  pro: [
    'Até 30 veículos ativos',
    '5 destaques por mês',
    'VenStudio Tier B — 30 fotos/mês (troca de fundo)',
    'Alertas avançados',
    'Relatórios completos',
    'Selo "Pro" verificado',
  ],
  premium: [
    'Veículos ilimitados',
    'Destaques ilimitados',
    'VenStudio Tier B — fotos ilimitadas',
    'VenStudio Tier C — 50 fotos/mês (fundo premium IA)',
    'Alertas avançados',
    'Relatórios completos',
    'Selo "Premium" + prioridade no ranking',
    'Suporte prioritário',
  ],
}
