import { useState } from 'react'
import { useAdminGaragens } from '@/hooks/useAdminData'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Search, RefreshCw, CheckCircle2, XCircle, ShieldCheck,
  MoreHorizontal, Star, ArrowUpDown,
} from 'lucide-react'

const PLANO_COLOR: Record<string, string> = {
  starter: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  pro: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  premium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

export default function AdminGaragens() {
  const { data: garagens, loading, reload } = useAdminGaragens()
  const [busca, setBusca] = useState('')
  const [filtroPlano, setFiltroPlano] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  const filtradas = garagens.filter(g => {
    const matchBusca = !busca ||
      g.nome.toLowerCase().includes(busca.toLowerCase()) ||
      g.cnpj?.includes(busca) ||
      g.slug.includes(busca.toLowerCase())
    const matchPlano = !filtroPlano || g.plano === filtroPlano
    return matchBusca && matchPlano
  })

  const handleVerificar = async (id: string, campo: 'verificada' | 'cnpj_verificado', valor: boolean) => {
    await supabase.from('garagens').update({ [campo]: valor }).eq('id', id)
    reload()
    setActionId(null)
  }

  const handleAlterarPlano = async (id: string, plano: string) => {
    await supabase.from('garagens').update({ plano }).eq('id', id)
    reload()
    setActionId(null)
  }

  const handleAtivar = async (id: string, ativa: boolean) => {
    await supabase.from('garagens').update({ ativa }).eq('id', id)
    reload()
    setActionId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <Building2 className="w-6 h-6" /> Garagens
          </h1>
          <p className="text-small text-text-secondary">{garagens.length} cadastradas</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input placeholder="Buscar por nome, CNPJ ou slug..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          <Button variant={filtroPlano === null ? 'default' : 'outline'} size="sm" onClick={() => setFiltroPlano(null)}>Todos</Button>
          {['starter', 'pro', 'premium'].map(p => (
            <Button key={p} variant={filtroPlano === p ? 'default' : 'outline'} size="sm" onClick={() => setFiltroPlano(p)} className="capitalize">{p}</Button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/50">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Garagem</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Plano</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden md:table-cell">Verificação</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden lg:table-cell">Score</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden lg:table-cell">Vendas</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && garagens.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-text-muted">Carregando...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-text-muted">Nenhuma garagem encontrada</td></tr>
              ) : (
                filtradas.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!g.ativa && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-text-primary">{g.nome}</p>
                          <p className="text-micro text-text-muted">{g.cidade}, {g.estado} · /{g.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize ${PLANO_COLOR[g.plano] || ''}`}>{g.plano}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-micro ${g.verificada ? 'text-emerald-400' : 'text-text-muted'}`}>
                          {g.verificada ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          Garagem
                        </span>
                        <span className={`inline-flex items-center gap-1 text-micro ${g.cnpj_verificado ? 'text-emerald-400' : 'text-text-muted'}`}>
                          {g.cnpj_verificado ? <ShieldCheck className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          CNPJ
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <span className="text-text-secondary">{g.score_confianca}</span>
                        <Star className="w-3 h-3 text-amber-400" />
                        <span className="text-text-muted text-micro">({g.avaliacao.toFixed(1)})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-secondary">{g.total_vendas}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <Button variant="ghost" size="sm" onClick={() => setActionId(actionId === g.id ? null : g.id)} className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        {actionId === g.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 w-52">
                            <button onClick={() => handleVerificar(g.id, 'verificada', !g.verificada)} className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" /> {g.verificada ? 'Remover verificação' : 'Verificar garagem'}
                            </button>
                            <button onClick={() => handleVerificar(g.id, 'cnpj_verificado', !g.cnpj_verificado)} className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4" /> {g.cnpj_verificado ? 'Remover CNPJ' : 'Verificar CNPJ'}
                            </button>
                            <div className="border-t border-border my-1" />
                            {['starter', 'pro', 'premium'].filter(p => p !== g.plano).map(p => (
                              <button key={p} onClick={() => handleAlterarPlano(g.id, p)} className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary capitalize">
                                Alterar para {p}
                              </button>
                            ))}
                            <div className="border-t border-border my-1" />
                            <button onClick={() => handleAtivar(g.id, !g.ativa)} className={`w-full text-left px-3 py-2 text-small hover:bg-surface-secondary ${g.ativa ? 'text-red-400' : 'text-emerald-400'}`}>
                              {g.ativa ? 'Desativar garagem' : 'Ativar garagem'}
                            </button>
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
