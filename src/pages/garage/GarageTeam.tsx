import { Plus, Mail, MoreHorizontal } from "lucide-react";
import { useState } from "react";

const teamMembers = [
  { name: "Carlos Silva", email: "carlos@mbmotors.com.br", role: "Gerente", leads: 18, conversions: 5, active: true },
  { name: "Ana Oliveira", email: "ana@mbmotors.com.br", role: "Vendedora", leads: 15, conversions: 4, active: true },
  { name: "Pedro Santos", email: "pedro@mbmotors.com.br", role: "Vendedor", leads: 14, conversions: 3, active: true },
  { name: "Mariana Costa", email: "mariana@mbmotors.com.br", role: "Vendedora", leads: 8, conversions: 1, active: false },
];

export default function GarageTeam() {
  const [showInvite, setShowInvite] = useState(false);
  const [distribution, setDistribution] = useState<"auto" | "manual">("auto");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-h2 text-text-primary">Gestão de equipe</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 rounded-full bg-garage text-white px-5 py-2.5 text-small font-medium hover:brightness-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Convidar vendedor
        </button>
      </div>

      {/* Lead distribution */}
      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-h4 text-text-primary mb-3">Distribuição de leads</h3>
        <div className="flex gap-3">
          {(["auto", "manual"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setDistribution(opt)}
              className={`flex-1 rounded-xl border-2 p-4 text-center transition-colors ${
                distribution === opt ? "border-garage bg-garage-light" : "border-border"
              }`}
            >
              <p className="text-small font-medium text-text-primary">{opt === "auto" ? "Round-robin automático" : "Atribuição manual"}</p>
              <p className="text-micro text-text-muted mt-1">
                {opt === "auto" ? "Leads distribuídos igualmente entre vendedores ativos" : "Gerente atribui cada lead manualmente"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Team table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Membro</th>
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Função</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Leads</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Conversões</th>
                <th className="text-center text-micro font-medium text-text-muted uppercase tracking-wider p-4">Status</th>
                <th className="p-4 w-10" />
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => (
                <tr key={m.email} className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-garage-light flex items-center justify-center">
                        <span className="text-micro font-bold text-garage">{m.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-small font-medium text-text-primary">{m.name}</p>
                        <p className="text-micro text-text-muted">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-small text-text-secondary">{m.role}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{m.leads}</td>
                  <td className="p-4 text-right text-small text-text-secondary">{m.conversions}</td>
                  <td className="p-4 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${m.active ? "bg-trust-high/10 text-trust-high" : "bg-text-muted/10 text-text-muted"}`}>
                      {m.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-text-muted hover:text-text-primary"><MoreHorizontal className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowInvite(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-2xl border border-border shadow-elevated z-50 p-6">
            <h3 className="text-h3 text-text-primary mb-4">Convidar vendedor</h3>
            <div className="space-y-3">
              <div>
                <label className="text-micro text-text-muted mb-1 block">Email</label>
                <input type="email" placeholder="vendedor@email.com" className="w-full rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-body text-text-primary outline-none focus:border-garage" />
              </div>
              <div>
                <label className="text-micro text-text-muted mb-1 block">Função</label>
                <select className="w-full rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-body text-text-primary outline-none focus:border-garage">
                  <option>Vendedor</option>
                  <option>Gerente</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowInvite(false)} className="flex-1 rounded-full border border-border py-2.5 text-small font-medium text-text-secondary hover:bg-surface-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={() => setShowInvite(false)} className="flex-1 rounded-full bg-garage text-white py-2.5 text-small font-medium hover:brightness-90 transition-all flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" /> Enviar convite
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
