import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getLimits, canPublish, canUseFeature, type PlanoGaragem } from '@/utils/planLimits'

export function usePlanLimits(garagemId: string | undefined, plano: string = 'starter') {
  const [veiculosAtivos, setVeiculosAtivos] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!garagemId) {
      setLoading(false)
      return
    }

    async function contar() {
      const { count } = await supabase
        .from('veiculos')
        .select('*', { count: 'exact', head: true })
        .eq('garagem_id', garagemId)
        .in('status', ['publicado', 'pausado'])

      setVeiculosAtivos(count ?? 0)
      setLoading(false)
    }

    contar()
  }, [garagemId])

  const limits = getLimits(plano)

  return {
    limits,
    veiculosAtivos,
    limiteVeiculos: limits.veiculos,
    porcentagemUso: limits.veiculos > 0 ? Math.round((veiculosAtivos / limits.veiculos) * 100) : 0,
    podePublicar: canPublish(plano, veiculosAtivos),
    podeUsarVenstudio: canUseFeature(plano, 'venstudio'),
    podeUsarVenstudioTierB: canUseFeature(plano, 'venstudioTierB'),
    podeUsarVenstudioTierC: canUseFeature(plano, 'venstudioTierC'),
    fotosIaTierBMes: limits.fotosIaTierBMes,
    fotosIaTierCMes: limits.fotosIaTierCMes,
    podeUsarAlertas: canUseFeature(plano, 'alertas'),
    podeUsarDestaques: canUseFeature(plano, 'destaques'),
    loading,
  }
}
