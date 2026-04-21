import { useAdminKPIs } from '@/hooks/useAdminData'
import {
  Users, Building2, Car, MessageSquare, DollarSign,
  TrendingUp, CreditCard, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}

function KPICard({ label, value, sub, icon: Icon, color }: KPICardProps) {
  return (
    <div className="bg-background rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-micro text-text-muted uppercase tracking-wide font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-micro text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const { data: kpis, loading, reload } = useAdminKPIs()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-small text-text-secondary">Visão geral do sistema</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={reload}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading && !kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-background rounded-xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-surface-secondary rounded w-24 mb-3" />
              <div className="h-8 bg-surface-secondary rounded w-16" />
            </div>
          ))}
        </div>
      ) : kpis ? (
        <>
          {/* Receita */}
          <div>
            <h2 className="text-small font-semibold text-text-muted uppercase tracking-wide mb-3">Receita</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="MRR"
                value={formatBRL(kpis.mrr)}
                sub={`${kpis.assinaturasAtivas} assinaturas ativas`}
                icon={DollarSign}
                color="bg-emerald-500/10 text-emerald-500"
              />
              <KPICard
                label="Receita Total"
                value={formatBRL(kpis.receitaTotal)}
                sub="Todos os pagamentos aprovados"
                icon={TrendingUp}
                color="bg-blue-500/10 text-blue-500"
              />
              <KPICard
                label="Assinaturas"
                value={kpis.assinaturasAtivas}
                sub={`${kpis.assinaturasTrialAtivas} em trial`}
                icon={CreditCard}
                color="bg-violet-500/10 text-violet-500"
              />
              <KPICard
                label="Churn Rate"
                value={`${kpis.churnRate.toFixed(1)}%`}
                sub={`${kpis.assinaturasCanceladas} canceladas`}
                icon={AlertTriangle}
                color={kpis.churnRate > 10 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}
              />
            </div>
          </div>

          {/* Usuários & Garagens */}
          <div>
            <h2 className="text-small font-semibold text-text-muted uppercase tracking-wide mb-3">Usuários & Garagens</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Total Usuários"
                value={kpis.totalUsuarios}
                sub={`${kpis.usuariosAtivos30d} novos em 30 dias`}
                icon={Users}
                color="bg-sky-500/10 text-sky-500"
              />
              <KPICard
                label="Garagens Ativas"
                value={kpis.garagensAtivas}
                sub={`${kpis.totalGaragens} total`}
                icon={Building2}
                color="bg-amber-500/10 text-amber-500"
              />
              <KPICard
                label="Veículos Publicados"
                value={kpis.veiculosPublicados}
                sub={`${kpis.totalVeiculos} total`}
                icon={Car}
                color="bg-rose-500/10 text-rose-500"
              />
              <KPICard
                label="Leads do Mês"
                value={kpis.leadsMes}
                sub={`${kpis.totalLeads} total`}
                icon={MessageSquare}
                color="bg-indigo-500/10 text-indigo-500"
              />
            </div>
          </div>

          {/* Alertas */}
          {(kpis.inadimplentes > 0 || kpis.pagamentosPendentes > 0) && (
            <div>
              <h2 className="text-small font-semibold text-text-muted uppercase tracking-wide mb-3">Alertas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {kpis.inadimplentes > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-small font-medium text-red-400">{kpis.inadimplentes} assinatura(s) inadimplente(s)</p>
                      <p className="text-micro text-text-muted">Pagamento não processado</p>
                    </div>
                  </div>
                )}
                {kpis.pagamentosPendentes > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-small font-medium text-amber-400">{kpis.pagamentosPendentes} pagamento(s) pendente(s)</p>
                      <p className="text-micro text-text-muted">Aguardando processamento</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
