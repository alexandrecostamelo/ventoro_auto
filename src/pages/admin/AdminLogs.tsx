import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollText, Search, RefreshCw } from 'lucide-react'

interface LogEntry {
  id: string
  acao: string
  entidade: string
  entidade_id: string | null
  admin_id: string
  admin_email: string | null
  detalhes: Record<string, unknown> | null
  created_at: string
}

const ACAO_COLOR: Record<string, string> = {
  criar: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  atualizar: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  deletar: 'bg-red-500/10 text-red-400 border-red-500/20',
  verificar: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  cancelar: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('logs_admin')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    setLogs((data ?? []) as LogEntry[])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const filtrados = logs.filter(l => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return l.acao.includes(q) || l.entidade.includes(q) || l.admin_email?.includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <ScrollText className="w-6 h-6" /> Logs de Auditoria
          </h1>
          <p className="text-small text-text-secondary">
            {logs.length === 0 && !loading ? 'Nenhum log registrado ainda. A tabela será populada conforme ações admin forem executadas.' : `${logs.length} entradas`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input placeholder="Filtrar logs..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/50">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Data</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Ação</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Entidade</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden md:table-cell">Admin</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium hidden lg:table-cell">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-text-muted">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-text-muted">Nenhum log encontrado</td></tr>
              ) : (
                filtrados.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-text-secondary text-micro whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={ACAO_COLOR[l.acao] || ''}>{l.acao}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-text-primary">{l.entidade}</span>
                      {l.entidade_id && <span className="text-micro text-text-muted ml-1">({l.entidade_id.substring(0, 8)})</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-muted text-micro">{l.admin_email || l.admin_id.substring(0, 8)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-micro text-text-muted font-mono max-w-xs truncate">
                      {l.detalhes ? JSON.stringify(l.detalhes).substring(0, 80) : '—'}
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
