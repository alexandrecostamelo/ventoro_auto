import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, CheckCircle2 } from 'lucide-react'

// Planos atuais do Ventoro (hardcoded — futuro: mover para tabela configuracoes_sistema)
const PLANOS = [
  {
    id: 'starter',
    nome: 'Starter',
    preco: 99.90,
    features: ['10 veículos ativos', 'Relatórios básicos', 'Sem VenStudio', '0 destaques/mês'],
  },
  {
    id: 'pro',
    nome: 'Pro',
    preco: 299.90,
    features: ['30 veículos ativos', 'VenStudio Tier B (30/mês)', 'Relatórios completos', '5 destaques/mês', 'Alertas habilitados', 'Badge Pro'],
  },
  {
    id: 'premium',
    nome: 'Premium',
    preco: 499.90,
    features: ['Veículos ilimitados', 'VenStudio Tier B + C (50/mês)', 'Relatórios completos', 'Destaques ilimitados', 'Ranking prioritário', 'Badge Premium', 'Suporte prioritário'],
  },
]

const CONFIGS = [
  { key: 'trial_dias', label: 'Período de Trial (dias)', valor: '14', tipo: 'number' },
  { key: 'rate_limit_dia', label: 'Rate Limit IA / dia', valor: '20', tipo: 'number' },
  { key: 'destaque_preco', label: 'Preço Destaque Avulso (R$)', valor: '29.90', tipo: 'number' },
  { key: 'venstudio_preco_foto', label: 'Preço VenStudio / foto (R$)', valor: '1.90', tipo: 'number' },
  { key: 'phash_threshold', label: 'Threshold pHash (Tier C)', valor: '10', tipo: 'number' },
]

export default function AdminConfiguracoes() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Futuro: salvar no banco (tabela configuracoes_sistema)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <Settings className="w-6 h-6" /> Configurações
        </h1>
        <p className="text-small text-text-secondary">Planos, preços e parâmetros do sistema</p>
      </div>

      {/* Planos */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Planos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANOS.map((plano) => (
            <div key={plano.id} className="bg-background rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary">{plano.nome}</h3>
                <Badge variant="outline" className="capitalize">{plano.id}</Badge>
              </div>
              <p className="text-2xl font-bold text-[var(--color-brand-primary)] mb-4">
                R$ {plano.preco.toFixed(2).replace('.', ',')}
                <span className="text-small font-normal text-text-muted">/mês</span>
              </p>
              <ul className="space-y-2">
                {plano.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-small text-text-secondary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-micro text-text-muted mt-3">
          Para alterar preços, edite os Stripe Price IDs e o arquivo src/utils/planLimits.ts
        </p>
      </div>

      {/* Configurações gerais */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Parâmetros do Sistema</h2>
        <div className="bg-background rounded-xl border border-border p-5 space-y-4 max-w-lg">
          {CONFIGS.map((cfg) => (
            <div key={cfg.key} className="flex items-center gap-4">
              <label className="flex-1 text-small text-text-secondary">{cfg.label}</label>
              <Input
                type={cfg.tipo}
                defaultValue={cfg.valor}
                className="w-32 text-right"
              />
            </div>
          ))}
          <div className="pt-2 border-t border-border">
            <Button onClick={handleSave} className="gap-2">
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Salvo!' : 'Salvar Configurações'}
            </Button>
            <p className="text-micro text-text-muted mt-2">
              Nota: as configurações serão salvas na tabela configuracoes_sistema quando a migration for aplicada.
              Por enquanto, edite diretamente em src/utils/planLimits.ts.
            </p>
          </div>
        </div>
      </div>

      {/* Informações do sistema */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Informações do Sistema</h2>
        <div className="bg-background rounded-xl border border-border p-5 max-w-lg">
          <table className="w-full text-small">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 text-text-muted">Stack</td>
                <td className="py-2 text-text-primary text-right">React + Vite + Supabase</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 text-text-muted">Pagamentos</td>
                <td className="py-2 text-text-primary text-right">Stripe</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 text-text-muted">IA Imagem</td>
                <td className="py-2 text-text-primary text-right">Replicate (Flux Fill Pro)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 text-text-muted">IA Texto</td>
                <td className="py-2 text-text-primary text-right">Claude (Anthropic)</td>
              </tr>
              <tr>
                <td className="py-2 text-text-muted">VenStudio</td>
                <td className="py-2 text-text-primary text-right">Tier B (Sharp) + Tier C (Flux Fill)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
