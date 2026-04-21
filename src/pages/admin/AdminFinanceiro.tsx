import { useState } from 'react'
import { useAdminPagamentos, useAdminKPIs } from '@/hooks/useAdminData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Search, RefreshCw, TrendingUp, CreditCard, AlertTriangle, Receipt } from 'lucide-react'

function formatBRL(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const STATUS_COLOR: Record<string, string> = {
  pago: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pendente: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  falhou: 'bg-red-500/10 text-red-400 border-red-500/20',
  estornado: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const TIPO_LABEL: Record<string, string> = {
  anuncio: 'Anúncio',
  upgrade: 'Upgrade',
  assinatura: 'Assinatura',
}

export default function AdminFinanceiro() {
  const { data: kpis, loading: kpisLoading } = useAdminKPIs()
  const { data: pagamentos, loading: pagLoading, reload } = useAdminPagamentos()
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)

  const loading = kpisLoading || pagLoading

  const filtrados = pagamentos.filter(p => {
    const matchBusca = !busca || p.id.includes(busca)
    const matchStatus = !filtroStatus || p.status === filtroStatus
    return matchBusca && matchStatus
  })

  // Calcular métricas dos pagamentos visíveis
  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valor || 0), 0)
  const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + (p.valor || 0), 0)
  const totalFalhou = pagamentos.filter(p => p.status === 'falhou').reduce((s, p) => s + (p.valor || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <DollarSign className="w-6 h-6" /> Financeiro
          </h1>
          <p className="text-small text-text-secondary">{pagamentos.length} transações</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* KPIs financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-micro text-text-muted uppercase tracking-wide font-medium">MRR</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-semibold text-text-primary">{formatBRL(kpis?.mrr ?? 0)}</p>
          <p className="text-micro text-text-muted">{kpis?.assinaturasAtivas ?? 0} assinaturas ativas</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-micro text-text-muted uppercase tracking-wide font-medium">Receita Total</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-semibold text-text-primary">{formatBRL(totalPago)}</p>
          <p className="text-micro text-text-muted">Pagamentos aprovados</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-micro text-text-muted uppercase tracking-wide font-medium">Pendente</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-semibold text-amber-400">{formatBRL(totalPendente)}</p>
          <p className="text-micro text-text-muted">Aguardando processamento</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-micro text-text-muted uppercase tracking-wide font-medium">Falhas</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-semibold text-red-400">{formatBRL(totalFalhou)}</p>
          <p className="text-micro text-text-muted">Pagamentos com erro</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input placeholder="Buscar por ID..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          <Button variant={filtroStatus === null ? 'default' : 'outline'} size="sm" onClick={() => setFiltroStatus(null)}>Todos</Button>
          {['pago', 'pendente', 'falhou', 'estornado'].map(s => (
            <Button key={s} variant={filtroStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFiltroStatus(s)} className="capitalize">{s}</Button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/50">
                <th className="text-left px-4 py-3 text-text-muted font-medium">ID</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden md:table-cell">Método</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden lg:table-cell">Data</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden lg:table-cell">Pago em</th>
              </tr>
            </thead>
            <tbody>
              {loading && pagamentos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-text-muted">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-text-muted">Nenhum pagamento encontrado</td></tr>
              ) : (
                filtrados.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-micro text-text-muted">{p.id.substring(0, 8)}...</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{TIPO_LABEL[p.tipo] || p.tipo}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{formatBRL(p.valor)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize ${STATUS_COLOR[p.status] || ''}`}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-secondary capitalize">{p.metodo || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-secondary">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-secondary">{formatDate(p.pago_em)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
