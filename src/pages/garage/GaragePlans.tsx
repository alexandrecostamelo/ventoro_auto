import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "R$ 199",
    period: "/mês",
    features: ["Até 15 veículos", "Vitrine pública básica", "Leads por WhatsApp", "Suporte por email"],
    current: false,
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 499",
    period: "/mês",
    badge: "Mais popular",
    features: ["Até 30 veículos", "VenStudio IA incluso", "Pipeline CRM completo", "Landing page por veículo", "Relatórios avançados", "Gestão de equipe (até 3)", "Suporte prioritário"],
    current: true,
    highlight: true,
  },
  {
    name: "Premium",
    price: "R$ 999",
    period: "/mês",
    features: ["Veículos ilimitados", "Tudo do Pro", "Equipe ilimitada", "API de integração", "Impulsionamento incluso", "Gerente de conta dedicado", "SLA de resposta 2h"],
    current: false,
    highlight: false,
  },
];

export default function GaragePlans() {
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
          <p className="text-h3 text-text-primary">Pro</p>
          <p className="text-small text-text-secondary">Renova em 15 de abril de 2025 · 18/30 veículos utilizados</p>
        </div>
        <button className="rounded-full border border-garage text-garage px-5 py-2 text-small font-medium hover:bg-garage hover:text-white transition-colors">
          Alterar plano
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
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
              className={`w-full rounded-full py-2.5 text-small font-medium transition-all ${
                plan.current
                  ? "bg-garage/10 text-garage border border-garage cursor-default"
                  : plan.highlight
                  ? "bg-garage text-white hover:brightness-90"
                  : "border border-border text-text-secondary hover:bg-surface-secondary"
              }`}
              disabled={plan.current}
            >
              {plan.current ? "Plano atual" : "Escolher plano"}
            </button>
          </div>
        ))}
      </div>

      {/* Payment method */}
      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-h4 text-text-primary mb-4">Método de pagamento</h3>
        <div className="flex items-center gap-3 rounded-lg bg-surface-secondary p-4">
          <div className="w-10 h-7 bg-garage/10 rounded flex items-center justify-center text-micro font-bold text-garage">
            VISA
          </div>
          <div className="flex-1">
            <p className="text-small text-text-primary">•••• •••• •••• 4242</p>
            <p className="text-micro text-text-muted">Expira em 12/2027</p>
          </div>
          <button className="text-small text-garage hover:underline">Alterar</button>
        </div>
      </div>

      {/* Billing history */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-5 pb-0"><h3 className="text-h4 text-text-primary mb-4">Histórico de cobrança</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Data</th>
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Descrição</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Valor</th>
                <th className="text-center text-micro font-medium text-text-muted uppercase tracking-wider p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: "15/03/2025", desc: "Plano Pro — Março", value: "R$ 499", status: "Pago" },
                { date: "15/02/2025", desc: "Plano Pro — Fevereiro", value: "R$ 499", status: "Pago" },
                { date: "15/01/2025", desc: "Plano Pro — Janeiro", value: "R$ 499", status: "Pago" },
              ].map((row) => (
                <tr key={row.date} className="border-b border-border last:border-0">
                  <td className="p-4 text-small text-text-secondary">{row.date}</td>
                  <td className="p-4 text-small text-text-primary">{row.desc}</td>
                  <td className="p-4 text-right text-small text-text-primary font-medium">{row.value}</td>
                  <td className="p-4 text-center">
                    <span className="rounded-full bg-trust-high/10 text-trust-high px-2.5 py-0.5 text-micro font-medium">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
