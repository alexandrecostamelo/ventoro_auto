import { useState } from 'react'
import { useAdminAssinaturas } from '@/hooks/useAdminData'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Search, RefreshCw, MoreHorizontal } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  ativa: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelada: 'bg-red-500/10 text-red-400 border-red-500/20',
  inadimplente: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  expirada: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

function formatBRL(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function AdminAssinaturas() {
  const { data: assinaturas, loading, reload } = useAdminAssinaturas()
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  const filtradas = assinaturas.filter(a => {
    const matchBusca = !busca || a.garagem_nome?.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = !filtroStatus || a.status === filtroStatus
    return matchBusca && matchStatus
  })

  const handleAlterarStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status }
    if (status === 'cancelada') updates.cancelada_em = new Date().toISOString()
    if (status === 'ativa') updates.cancelada_em = null

    await supabase.from('assinaturas').update(updates).eq('id', id)
    reload()
    setActionId(null)
  }

  const handleAlterarPlano = async (id: string, plano: string, garagemId: string) => {
    const valores: Record<string, number> = { starter: 99.90, pro: 299.90, premium: 499.90 }
    await Promise.all([
      supabase.from('assinaturas').update({ plano, valor_mensal: valores[plano] }).eq('id', id),
      supabase.from('garagens').update({ plano }).eq('id', garagemId),
    ])
    reload()
    setActionId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <CreditCard className="w-6 h-6" /> Assinaturas
          </h1>
          <p className="text-small text-text-secondary">{assinaturas.length} registradas</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input placeholder="Buscar por garagem..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant={filtroStatus === null ? 'default' : 'outline'} size="sm" onClick={() => setFiltroStatus(null)}>Todos</Button>
          {['ativa', 'trial', 'cancelada', 'inadimplente', 'expirada'].map(s => (
            <Button key={s} variant={filtroStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFiltroStatus(s)} className="capitalize">{s}</Button>
          ))}
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/50">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Garagem</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Plano</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Status</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden md:table-cell">Valor</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden lg:table-cell">Próx. Cobrança</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden lg:table-cell">Trial até</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && assinaturas.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-text-muted">Carregando...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-text-muted">Nenhuma assinatura encontrada</td></tr>
              ) : (
                filtradas.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{a.garagem_nome || '—'}</p>
                      <p className="text-micro text-text-muted">/{a.garagem_slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize ${a.plano === 'premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : a.plano === 'pro' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}`}>
                        {a.plano}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize ${STATUS_COLOR[a.status] || ''}`}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-secondary">{formatBRL(a.valor_mensal)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-secondary">{formatDate(a.proxima_cobranca)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-secondary">{formatDate(a.trial_ate)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <Button variant="ghost" size="sm" onClick={() => setActionId(actionId === a.id ? null : a.id)} className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        {actionId === a.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 w-52">
                            {a.status !== 'ativa' && (
                              <button onClick={() => handleAlterarStatus(a.id, 'ativa')} className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary text-emerald-400">
                                Reativar
                              </button>
                            )}
                            {a.status !== 'cancelada' && (
                              <button onClick={() => handleAlterarStatus(a.id, 'cancelada')} className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary text-red-400">
                                Cancelar
                              </button>
                            )}
                            <div className="border-t border-border my-1" />
                            {['starter', 'pro', 'premium'].filter(p => p !== a.plano).map(p => (
                              <button key={p} onClick={() => handleAlterarPlano(a.id, p, a.garagem_id)} className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary capitalize">
                                Migrar para {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
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
