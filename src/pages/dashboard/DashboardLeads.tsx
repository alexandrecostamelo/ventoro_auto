import { useState } from "react";
import { leads as mockLeads } from "@/data/mock";
import { MessageCircle, Phone, Calendar, Archive, Filter } from "lucide-react";
import { USE_REAL_DATA } from "@/config/flags";
import { useLeadsAnunciante } from "@/hooks/useLeadsAnunciante";
import { formatarDataRelativa } from "@/utils/formatters";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-trust-high/10 text-trust-high" },
  em_contato: { label: "Em contato", color: "bg-warning/10 text-warning" },
  proposta: { label: "Proposta", color: "bg-garage/10 text-garage" },
  visita: { label: "Visita", color: "bg-info/10 text-info" },
  negociacao: { label: "Negociação", color: "bg-info/10 text-info" },
  vendido: { label: "Vendido", color: "bg-brand-dark/10 text-brand-dark" },
  perdido: { label: "Perdido", color: "bg-text-muted/10 text-text-muted" },
};

const STATUS_FILTER_OPTIONS = ["todos", "novo", "em_contato", "proposta", "visita", "vendido", "perdido"];

const ORIGIN_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="w-3.5 h-3.5 text-trust-high" />,
  formulario: <Archive className="w-3.5 h-3.5 text-info" />,
  agendamento: <Calendar className="w-3.5 h-3.5 text-garage" />,
  proposta: <Archive className="w-3.5 h-3.5 text-garage" />,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonLeads() {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 border-b border-border last:border-0 px-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-surface-secondary" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 bg-surface-secondary rounded" />
            <div className="h-2.5 w-24 bg-surface-secondary rounded" />
          </div>
          <div className="h-6 w-20 bg-surface-secondary rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Unified display type ─────────────────────────────────────────────────────

interface LeadDisplay {
  id: string;
  nome: string;
  telefone: string;
  veiculo_nome: string;
  origem: string;
  status: string;
  data_iso: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardLeads() {
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const { leads: leadsReais, atualizarStatus, loading } = useLeadsAnunciante();

  // Normalize to unified display type
  const allLeads: LeadDisplay[] = USE_REAL_DATA
    ? leadsReais.map((l) => ({
        id: l.id,
        nome: l.nome,
        telefone: l.telefone,
        veiculo_nome: l.veiculos
          ? `${l.veiculos.marca} ${l.veiculos.modelo}`
          : "Veículo",
        origem: l.origem,
        status: l.status,
        data_iso: l.created_at,
      }))
    : mockLeads.map((l) => ({
        id: l.id,
        nome: l.nome,
        telefone: l.telefone,
        veiculo_nome: l.veiculo_nome,
        origem: l.origem,
        status: l.status,
        data_iso: l.data,
      }));

  const filtered =
    filterStatus === "todos" ? allLeads : allLeads.filter((l) => l.status === filterStatus);

  function buildWhatsAppLink(telefone: string, nome: string) {
    const num = telefone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${nome}, vi seu interesse no anúncio. Como posso ajudar?`);
    return `https://wa.me/55${num}?text=${msg}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-h2 text-text-primary">Leads recebidos</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTER_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-full px-4 py-1.5 text-micro font-medium border transition-colors ${
              filterStatus === s
                ? "bg-brand text-primary-foreground border-brand"
                : "bg-background text-text-secondary border-border hover:border-brand/50"
            }`}
          >
            {s === "todos" ? "Todos" : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {USE_REAL_DATA && loading && <SkeletonLeads />}

      {/* Table */}
      {(!USE_REAL_DATA || !loading) && (
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
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors"
                  >
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
                        {ORIGIN_ICONS[l.origem] ?? <Archive className="w-3.5 h-3.5 text-text-muted" />}
                        <span className="text-micro text-text-secondary capitalize">{l.origem}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {USE_REAL_DATA ? (
                        <select
                          value={l.status}
                          onChange={(e) => atualizarStatus(l.id, e.target.value as Parameters<typeof atualizarStatus>[1])}
                          className={`rounded-full px-2.5 py-0.5 text-micro font-medium border-0 cursor-pointer appearance-none ${STATUS_CONFIG[l.status]?.color ?? ""}`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${STATUS_CONFIG[l.status]?.color ?? ""}`}>
                          {STATUS_CONFIG[l.status]?.label ?? l.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-micro text-text-muted">{formatarDataRelativa(l.data_iso)}</p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <a
                          href={buildWhatsAppLink(l.telefone, l.nome)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${l.telefone.replace(/\D/g, "")}`}
                          className="rounded-lg border border-border p-2 text-text-muted hover:text-brand hover:border-brand transition-colors"
                          title="Ligar"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!USE_REAL_DATA || !loading) && filtered.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-body text-text-secondary">
            {USE_REAL_DATA && filterStatus === "todos"
              ? "Você ainda não recebeu leads."
              : "Nenhum lead com este filtro."}
          </p>
        </div>
      )}
    </div>
  );
}
