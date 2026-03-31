import { leads } from "@/data/mock";
import { MessageCircle, Phone, Calendar, Archive, Filter } from "lucide-react";
import { useState } from "react";

const statusConfig: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-trust-high/10 text-trust-high" },
  em_contato: { label: "Em contato", color: "bg-warning/10 text-warning" },
  proposta: { label: "Proposta", color: "bg-garage/10 text-garage" },
  visita: { label: "Visita", color: "bg-info/10 text-info" },
  vendido: { label: "Vendido", color: "bg-brand-dark/10 text-brand-dark" },
  perdido: { label: "Perdido", color: "bg-text-muted/10 text-text-muted" },
};

const originIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="w-3.5 h-3.5 text-trust-high" />,
  formulario: <Archive className="w-3.5 h-3.5 text-info" />,
  agendamento: <Calendar className="w-3.5 h-3.5 text-garage" />,
};

export default function DashboardLeads() {
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const filtered = filterStatus === "todos" ? leads : leads.filter((l) => l.status === filterStatus);

  return (
    <div className="space-y-6">
      <h1 className="text-h2 text-text-primary">Leads recebidos</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["todos", "novo", "em_contato", "proposta", "visita", "vendido", "perdido"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-full px-4 py-1.5 text-micro font-medium border transition-colors ${
              filterStatus === s
                ? "bg-brand text-primary-foreground border-brand"
                : "bg-background text-text-secondary border-border hover:border-brand/50"
            }`}
          >
            {s === "todos" ? "Todos" : statusConfig[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Contato</th>
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Veículo</th>
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Origem</th>
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Status</th>
                <th className="text-left text-micro font-medium text-text-muted uppercase tracking-wider p-4">Data</th>
                <th className="text-right text-micro font-medium text-text-muted uppercase tracking-wider p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const date = new Date(l.data);
                const timeAgo = `${Math.floor((Date.now() - date.getTime()) / 86400000)}d atrás`;
                return (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
                          <span className="text-micro font-bold text-brand">{l.nome.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-small font-medium text-text-primary">{l.nome}</p>
                          <p className="text-micro text-text-muted">{l.telefone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-small text-text-primary">{l.veiculo_nome}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {originIcons[l.origem]}
                        <span className="text-micro text-text-secondary capitalize">{l.origem}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${statusConfig[l.status]?.color}`}>
                        {statusConfig[l.status]?.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-micro text-text-muted">{timeAgo}</p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors" title="WhatsApp">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors" title="Ligar">
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-body text-text-secondary">Nenhum lead com este filtro.</p>
        </div>
      )}
    </div>
  );
}
