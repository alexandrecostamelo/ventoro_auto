import { useState } from 'react'
import { useAdminUsuarios } from '@/hooks/useAdminData'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Users, Search, RefreshCw, ShieldCheck, Building2, User, ShoppingCart,
  MoreHorizontal, Ban, KeyRound, ArrowUpDown,
} from 'lucide-react'

const TIPO_LABEL: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: ShieldCheck },
  garagem: { label: 'Garagem', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Building2 },
  particular: { label: 'Particular', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: User },
  comprador: { label: 'Comprador', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: ShoppingCart },
}

export default function AdminUsuarios() {
  const { data: usuarios, loading, reload } = useAdminUsuarios()
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [actionUserId, setActionUserId] = useState<string | null>(null)

  const filtrados = usuarios.filter(u => {
    const matchBusca = !busca ||
      u.email?.toLowerCase().includes(busca.toLowerCase()) ||
      u.nome?.toLowerCase().includes(busca.toLowerCase())
    const matchTipo = !filtroTipo || u.tipo === filtroTipo
    return matchBusca && matchTipo
  })

  const handleAlterarTipo = async (userId: string, novoTipo: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ tipo: novoTipo })
      .eq('id', userId)

    if (!error) {
      reload()
      setActionUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <Users className="w-6 h-6" /> Usuários
          </h1>
          <p className="text-small text-text-secondary">{usuarios.length} registrados</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={filtroTipo === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipo(null)}
          >
            Todos
          </Button>
          {Object.entries(TIPO_LABEL).map(([tipo, cfg]) => (
            <Button
              key={tipo}
              variant={filtroTipo === tipo ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo(tipo)}
              className="gap-1.5"
            >
              <cfg.icon className="w-3.5 h-3.5" />
              {cfg.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/50">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Usuário</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden md:table-cell">Localização</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden lg:table-cell">
                  <span className="flex items-center gap-1">Criado em <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-right px-4 py-3 text-text-muted font-medium w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && usuarios.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-text-muted">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-text-muted">Nenhum usuário encontrado</td></tr>
              ) : (
                filtrados.map((u) => {
                  const tipoCfg = TIPO_LABEL[u.tipo] || TIPO_LABEL.comprador
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{u.nome || '—'}</p>
                        <p className="text-micro text-text-muted">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={tipoCfg.color}>
                          {tipoCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-secondary">
                        {u.cidade && u.estado ? `${u.cidade}, ${u.estado}` : '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-text-secondary">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionUserId(actionUserId === u.id ? null : u.id)}
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                          {actionUserId === u.id && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 w-48">
                              <button
                                onClick={() => handleAlterarTipo(u.id, u.tipo === 'admin' ? 'comprador' : 'admin')}
                                className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary flex items-center gap-2"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                {u.tipo === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                              </button>
                              <button
                                onClick={() => handleAlterarTipo(u.id, 'comprador')}
                                className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary flex items-center gap-2 text-red-400"
                              >
                                <Ban className="w-4 h-4" />
                                Rebaixar p/ Comprador
                              </button>
                              <button
                                onClick={() => { setActionUserId(null) }}
                                className="w-full text-left px-3 py-2 text-small hover:bg-surface-secondary flex items-center gap-2"
                              >
                                <KeyRound className="w-4 h-4" />
                                Resetar Senha (em breve)
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
