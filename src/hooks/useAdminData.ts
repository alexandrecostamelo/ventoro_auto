import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================
// Hook: useAdminData
// Carrega KPIs globais para o dashboard admin
// ============================================================

export interface AdminKPIs {
  totalUsuarios: number
  usuariosAtivos30d: number
  totalGaragens: number
  garagensAtivas: number
  totalVeiculos: number
  veiculosPublicados: number
  totalLeads: number
  leadsMes: number
  mrr: number
  receitaTotal: number
  assinaturasAtivas: number
  assinaturasTrialAtivas: number
  assinaturasCanceladas: number
  churnRate: number
  pagamentosPendentes: number
  inadimplentes: number
}

export interface AdminUsuario {
  id: string
  email: string
  nome: string | null
  tipo: string
  cidade: string | null
  estado: string | null
  created_at: string
  garagem_id: string | null
  garagem_nome?: string | null
  garagem_plano?: string | null
  veiculos_count?: number
}

export interface AdminGaragem {
  id: string
  nome: string
  slug: string
  cnpj: string | null
  cidade: string
  estado: string
  plano: string
  ativa: boolean
  verificada: boolean
  cnpj_verificado: boolean
  score_confianca: number
  total_vendas: number
  avaliacao: number
  created_at: string
  assinatura_status?: string
  assinatura_valor?: number
}

export interface AdminPagamento {
  id: string
  tipo: string
  plano: string | null
  valor: number
  status: string
  metodo: string | null
  created_at: string
  pago_em: string | null
  anunciante_email?: string
  garagem_nome?: string
}

export interface AdminAssinatura {
  id: string
  garagem_id: string
  plano: string
  status: string
  valor_mensal: number | null
  trial_ate: string | null
  periodo_inicio: string | null
  periodo_fim: string | null
  proxima_cobranca: string | null
  cancelada_em: string | null
  created_at: string
  garagem_nome?: string
  garagem_slug?: string
}

// ── KPIs ──
export function useAdminKPIs() {
  const [data, setData] = useState<AdminKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { count: totalUsuarios },
        { count: totalGaragens },
        { count: garagensAtivas },
        { count: totalVeiculos },
        { count: veiculosPublicados },
        { count: totalLeads },
        { count: assinaturasAtivas },
        { count: assinaturasTrialAtivas },
        { count: assinaturasCanceladas },
        { count: inadimplentes },
        { data: pagamentosData },
        { data: pagamentosPendData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('garagens').select('*', { count: 'exact', head: true }),
        supabase.from('garagens').select('*', { count: 'exact', head: true }).eq('ativa', true),
        supabase.from('veiculos').select('*', { count: 'exact', head: true }),
        supabase.from('veiculos').select('*', { count: 'exact', head: true }).eq('status', 'publicado'),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('assinaturas').select('*', { count: 'exact', head: true }).eq('status', 'ativa'),
        supabase.from('assinaturas').select('*', { count: 'exact', head: true }).eq('status', 'trial'),
        supabase.from('assinaturas').select('*', { count: 'exact', head: true }).eq('status', 'cancelada'),
        supabase.from('assinaturas').select('*', { count: 'exact', head: true }).eq('status', 'inadimplente'),
        supabase.from('pagamentos').select('valor, status'),
        supabase.from('pagamentos').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      ])

      // Calcular receita
      const pagos = (pagamentosData ?? []).filter((p: { status: string }) => p.status === 'pago')
      const receitaTotal = pagos.reduce((sum: number, p: { valor: number }) => sum + (p.valor || 0), 0)

      // MRR = assinaturas ativas * valor médio
      const { data: assinaturasMrr } = await supabase
        .from('assinaturas')
        .select('valor_mensal')
        .eq('status', 'ativa')

      const mrr = (assinaturasMrr ?? []).reduce((sum: number, a: { valor_mensal: number | null }) => sum + (a.valor_mensal || 0), 0)

      // Leads do mês
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)
      const { count: leadsMes } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes.toISOString())

      // Usuários ativos últimos 30 dias (aproximação: profiles criados nos últimos 30d)
      const d30 = new Date()
      d30.setDate(d30.getDate() - 30)
      const { count: usuariosAtivos30d } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', d30.toISOString())

      // Churn rate
      const totalSubs = (assinaturasAtivas ?? 0) + (assinaturasCanceladas ?? 0) + (assinaturasTrialAtivas ?? 0)
      const churnRate = totalSubs > 0 ? ((assinaturasCanceladas ?? 0) / totalSubs) * 100 : 0

      setData({
        totalUsuarios: totalUsuarios ?? 0,
        usuariosAtivos30d: usuariosAtivos30d ?? 0,
        totalGaragens: totalGaragens ?? 0,
        garagensAtivas: garagensAtivas ?? 0,
        totalVeiculos: totalVeiculos ?? 0,
        veiculosPublicados: veiculosPublicados ?? 0,
        totalLeads: totalLeads ?? 0,
        leadsMes: leadsMes ?? 0,
        mrr,
        receitaTotal,
        assinaturasAtivas: assinaturasAtivas ?? 0,
        assinaturasTrialAtivas: assinaturasTrialAtivas ?? 0,
        assinaturasCanceladas: assinaturasCanceladas ?? 0,
        churnRate,
        pagamentosPendentes: pagamentosPendData?.length ?? 0,
        inadimplentes: inadimplentes ?? 0,
      })
    } catch (err) {
      console.error('Admin KPIs error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { data, loading, reload }
}

// ── Usuários ──
export function useAdminUsuarios() {
  const [data, setData] = useState<AdminUsuario[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, nome, tipo, cidade, estado, created_at, garagem_id')
      .order('created_at', { ascending: false })
      .limit(500)

    setData((profiles ?? []) as AdminUsuario[])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { data, loading, reload }
}

// ── Garagens ──
export function useAdminGaragens() {
  const [data, setData] = useState<AdminGaragem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data: garagens } = await supabase
      .from('garagens')
      .select('id, nome, slug, cnpj, cidade, estado, plano, ativa, verificada, cnpj_verificado, score_confianca, total_vendas, avaliacao, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    setData((garagens ?? []) as AdminGaragem[])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { data, loading, reload }
}

// ── Assinaturas ──
export function useAdminAssinaturas() {
  const [data, setData] = useState<AdminAssinatura[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data: subs } = await supabase
      .from('assinaturas')
      .select('id, garagem_id, plano, status, valor_mensal, trial_ate, periodo_inicio, periodo_fim, proxima_cobranca, cancelada_em, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    // Enrich with garage names
    if (subs && subs.length > 0) {
      const garagemIds = [...new Set(subs.map((s: { garagem_id: string }) => s.garagem_id))]
      const { data: garagens } = await supabase
        .from('garagens')
        .select('id, nome, slug')
        .in('id', garagemIds)

      const gMap = new Map((garagens ?? []).map((g: { id: string; nome: string; slug: string }) => [g.id, g]))
      setData(subs.map((s: AdminAssinatura) => {
        const g = gMap.get(s.garagem_id) as { nome: string; slug: string } | undefined
        return { ...s, garagem_nome: g?.nome, garagem_slug: g?.slug }
      }))
    } else {
      setData([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { data, loading, reload }
}

// ── Pagamentos ──
export function useAdminPagamentos() {
  const [data, setData] = useState<AdminPagamento[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data: pagamentos } = await supabase
      .from('pagamentos')
      .select('id, tipo, plano, valor, status, metodo, created_at, pago_em, anunciante_id, garagem_id')
      .order('created_at', { ascending: false })
      .limit(500)

    setData((pagamentos ?? []) as AdminPagamento[])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { data, loading, reload }
}
