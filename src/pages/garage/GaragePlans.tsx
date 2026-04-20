import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Star, AlertTriangle, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useMinhaGaragem } from "@/hooks/useMinhaGaragem";
import { useAssinatura } from "@/hooks/useAssinatura";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { STRIPE_PRICES, PLAN_FEATURES, PLAN_LIMITS, type PlanoGaragem } from "@/utils/planLimits";
import { formatarPreco } from "@/utils/formatters";
import { supabase } from "@/lib/supabase";

interface Pagamento {
  id: string;
  created_at: string;
  valor: number;
  status: string;
  pago_em: string | null;
}

const plans: { key: PlanoGaragem; name: string; badge?: string; highlight: boolean }[] = [
  { key: "starter", name: "Starter", highlight: false },
  { key: "pro", name: "Pro", badge: "Mais popular", highlight: true },
  { key: "premium", name: "Premium", highlight: false },
];

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export default function GaragePlans() {
  const { garagem, assinatura: assinaturaMinhaGaragem, loading } = useMinhaGaragem();
  const [searchParams] = useSearchParams();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [pagamentosLoading, setPagamentosLoading] = useState(false);

  const garagemId = garagem?.id;
  const {
    assinatura,
    planoAtivo,
    inadimplente,
    diasRestantes,
    checkoutLoading,
    iniciarCheckout,
    abrirPortal,
  } = useAssinatura(garagemId);

  const planoAtual = (assinatura?.plano ?? assinaturaMinhaGaragem?.plano ?? garagem?.plano ?? 'starter') as PlanoGaragem;
  const { veiculosAtivos, limiteVeiculos, porcentagemUso } = usePlanLimits(garagemId, planoAtual);

  const sucesso = searchParams.get("sucesso") === "true";
  const cancelado = searchParams.get("cancelado") === "true";

  // Buscar histórico de pagamentos
  useEffect(() => {
    if (!garagemId) return;
    setPagamentosLoading(true);
    supabase
      .from("pagamentos")
      .select("id, created_at, valor, status, pago_em")
      .eq("garagem_id", garagemId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setPagamentos((data as Pagamento[]) ?? []);
        setPagamentosLoading(false);
      });
  }, [garagemId]);

  if (loading || !garagem) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-garage border-t-transparent animate-spin" />
      </div>
    );
  }

  const planoNome = plans.find((p) => p.key === planoAtual)?.name ?? planoAtual;
  const temStripe = !!assinatura?.stripe_customer_id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 text-text-primary">Planos e cobrança</h1>
        <p className="text-body text-text-secondary mt-1">Gerencie seu plano e método de pagamento.</p>
      </div>

      {/* Banners de status */}
      {sucesso && (
        <div className="rounded-xl border border-brand bg-brand-light p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-brand flex-shrink-0" />
          <p className="text-body text-brand-dark font-medium">Assinatura ativada com sucesso! Seu plano já está ativo.</p>
        </div>
      )}
      {cancelado && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-body text-amber-800 font-medium">Checkout cancelado. Nenhuma cobrança foi realizada.</p>
        </div>
      )}
      {inadimplente && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-body text-red-800 font-semibold">Pagamento pendente</p>
            <p className="text-small text-red-700">Atualize seu cartão para evitar a suspensão do plano.</p>
          </div>
          {temStripe && (
            <button
              onClick={abrirPortal}
              disabled={checkoutLoading}
              className="rounded-full bg-red-600 text-white px-4 py-2 text-small font-medium hover:bg-red-700 transition-colors"
            >
              Atualizar cartão
            </button>
          )}
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-xl border border-garage bg-garage-light p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-micro text-garage uppercase tracking-wider font-semibold">Plano atual</p>
          <p className="text-h3 text-text-primary">{planoNome}</p>
          <p className="text-small text-text-secondary">
            {assinatura?.status === 'trial' && diasRestantes > 0
              ? `Trial: ${diasRestantes} dias restantes`
              : assinatura?.proxima_cobranca
                ? `Renova em ${formatarData(assinatura.proxima_cobranca)}`
                : "Sem data de renovação"
            }
            {" · "}
            {veiculosAtivos}/{limiteVeiculos >= 999 ? "∞" : limiteVeiculos} veículos utilizados
          </p>
          {porcentagemUso >= 80 && limiteVeiculos < 999 && (
            <p className="text-micro text-amber-600 mt-1 font-medium">
              ⚠ Você está usando {porcentagemUso}% do limite de veículos
            </p>
          )}
        </div>
        {temStripe && (
          <button
            onClick={abrirPortal}
            disabled={checkoutLoading}
            className="rounded-full border border-garage text-garage px-5 py-2 text-small font-medium hover:bg-garage hover:text-white transition-all flex items-center gap-2"
          >
            {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Gerenciar assinatura
          </button>
        )}
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = plan.key === planoAtual;
          const limits = PLAN_LIMITS[plan.key];
          const features = PLAN_FEATURES[plan.key];
          const isUpgrade = plans.findIndex((p) => p.key === plan.key) > plans.findIndex((p) => p.key === planoAtual);
          const isDowngrade = plans.findIndex((p) => p.key === plan.key) < plans.findIndex((p) => p.key === planoAtual);

          return (
            <div
              key={plan.key}
              className={`rounded-xl border-2 p-6 relative ${
                plan.highlight ? "border-garage bg-garage-light/30" : "border-border bg-background"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-garage text-white px-4 py-1 text-micro font-medium flex items-center gap-1">
                  <Star className="w-3 h-3" /> {plan.badge}
                </span>
              )}
              <h3 className="text-h3 text-text-primary mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-display text-[32px] font-bold text-text-primary">{limits.precoDisplay}</span>
                <span className="text-small text-text-muted">/mês</span>
              </div>
              <ul className="space-y-2 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-small text-text-secondary">
                    <Check className="w-4 h-4 text-garage flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button
                  disabled
                  className="w-full rounded-full py-2.5 text-small font-medium bg-garage/10 text-garage border border-garage"
                >
                  Plano atual
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => iniciarCheckout(STRIPE_PRICES[plan.key], plan.key)}
                  disabled={checkoutLoading}
                  className="w-full rounded-full py-2.5 text-small font-medium bg-garage text-white hover:brightness-90 transition-all flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Fazer upgrade
                </button>
              ) : isDowngrade && temStripe ? (
                <button
                  onClick={abrirPortal}
                  disabled={checkoutLoading}
                  className="w-full rounded-full py-2.5 text-small font-medium border border-border text-text-secondary hover:bg-surface-secondary transition-all"
                >
                  Alterar no portal
                </button>
              ) : (
                <button
                  onClick={() => iniciarCheckout(STRIPE_PRICES[plan.key], plan.key)}
                  disabled={checkoutLoading}
                  className="w-full rounded-full py-2.5 text-small font-medium border border-garage text-garage hover:bg-garage hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Escolher plano
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment method */}
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h4 text-text-primary">Método de pagamento</h3>
        </div>
        {temStripe ? (
          <div className="rounded-lg bg-surface-secondary p-4 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-text-muted" />
            <div className="flex-1">
              <p className="text-small text-text-primary font-medium">Gerenciado pelo Stripe</p>
              <p className="text-micro text-text-muted">Use o portal de cobrança para atualizar seu cartão.</p>
            </div>
            <button
              onClick={abrirPortal}
              disabled={checkoutLoading}
              className="rounded-full border border-border px-4 py-1.5 text-micro font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
            >
              Gerenciar
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-surface-secondary p-4 text-center">
            <p className="text-small text-text-muted">Nenhum método de pagamento cadastrado.</p>
            <p className="text-micro text-text-muted mt-1">Assine um plano para adicionar seu cartão.</p>
          </div>
        )}
      </div>

      {/* Billing history */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-5">
          <h3 className="text-h4 text-text-primary mb-4">Histórico de cobrança</h3>
          {pagamentosLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : pagamentos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-small text-text-muted">Nenhuma cobrança registrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-micro text-text-muted font-medium uppercase">Data</th>
                    <th className="py-2 text-micro text-text-muted font-medium uppercase">Valor</th>
                    <th className="py-2 text-micro text-text-muted font-medium uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-3 text-small text-text-secondary">{formatarData(p.pago_em ?? p.created_at)}</td>
                      <td className="py-3 text-small text-text-primary font-medium">{formatarPreco(p.valor)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${
                          p.status === 'pago' ? 'bg-brand-light text-brand-dark' :
                          p.status === 'falhou' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {p.status === 'pago' ? 'Pago' : p.status === 'falhou' ? 'Falhou' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
