import { Check, Star } from "lucide-react";
import { useMinhaGaragem } from "@/hooks/useMinhaGaragem";

const PLANO_LIMITE: Record<string, number | null> = {
  starter: 15,
  pro: 30,
  premium: null,
};

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: "R$ 199",
    period: "/mês",
    features: ["Até 15 veículos", "Vitrine pública básica", "Leads por WhatsApp", "Suporte por email"],
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "R$ 499",
    period: "/mês",
    badge: "Mais popular",
    features: ["Até 30 veículos", "VenStudio IA incluso", "Pipeline CRM completo", "Landing page por veículo", "Relatórios avançados", "Gestão de equipe (até 3)", "Suporte prioritário"],
    highlight: true,
  },
  {
    key: "premium",
    name: "Premium",
    price: "R$ 999",
    period: "/mês",
    features: ["Veículos ilimitados", "Tudo do Pro", "Equipe ilimitada", "API de integração", "Impulsionamento incluso", "Gerente de conta dedicado", "SLA de resposta 2h"],
    highlight: false,
  },
];

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export default function GaragePlans() {
  const { garagem, assinatura, loading } = useMinhaGaragem();

  if (loading || !garagem) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-garage border-t-transparent animate-spin" />
      </div>
    );
  }

  const planoAtual = assinatura?.plano ?? garagem.plano;
  const limite = PLANO_LIMITE[planoAtual];
  const uso = garagem.total_estoque;
  const planoNome = plans.find((p) => p.key === planoAtual)?.name ?? planoAtual;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 text-text-primary">Planos e cobrança</h1>
        <p className="text-body text-text-secondary mt-1">Gerencie seu plano e método de pagamento.</p>
      </div>

      {/* Current plan */}
      <div className="rounded-xl border border-garage bg-garage-light p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-micro text-garage uppercase tracking-wider font-semibold">Plano atual</p>
          <p className="text-h3 text-text-primary">{planoNome}</p>
          <p className="text-small text-text-secondary">
            {assinatura?.proxima_cobranca
              ? `Renova em ${formatarData(assinatura.proxima_cobranca)}`
              : "Sem data de renovação"}{" "}
            · {uso}/{limite ?? "∞"} veículos utilizados
          </p>
        </div>
        <button
          disabled
          title="Em breve — integração Stripe"
          className="rounded-full border border-garage/40 text-garage/40 px-5 py-2 text-small font-medium cursor-not-allowed"
        >
          Alterar plano
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = plan.key === planoAtual;
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
                <span className="font-display text-[32px] font-bold text-text-primary">{plan.price}</span>
                <span className="text-small text-text-muted">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-small text-text-secondary">
                    <Check className="w-4 h-4 text-garage flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                title={isCurrent ? undefined : "Em breve — integração Stripe"}
                className={`w-full rounded-full py-2.5 text-small font-medium transition-all cursor-not-allowed ${
                  isCurrent
                    ? "bg-garage/10 text-garage border border-garage"
                    : "border border-border/50 text-text-muted opacity-50"
                }`}
              >
                {isCurrent ? "Plano atual" : "Escolher plano"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment method — decorativo */}
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h4 text-text-primary">Método de pagamento</h3>
        </div>
        <div className="rounded-lg bg-surface-secondary p-4 text-center">
          <p className="text-small text-text-muted">Nenhum método de pagamento cadastrado.</p>
          <button
            disabled
            title="Em breve — integração Stripe"
            className="mt-3 rounded-full border border-border/50 px-4 py-1.5 text-micro font-medium text-text-muted opacity-50 cursor-not-allowed"
          >
            Adicionar cartão
          </button>
        </div>
      </div>

      {/* Billing history — vazio */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-5">
          <h3 className="text-h4 text-text-primary mb-4">Histórico de cobrança</h3>
          <div className="text-center py-8">
            <p className="text-small text-text-muted">Nenhuma cobrança registrada.</p>
            <p className="text-micro text-text-muted mt-1">O histórico aparecerá aqui após a integração com Stripe.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
