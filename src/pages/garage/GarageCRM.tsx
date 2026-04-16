import { useState, useEffect } from "react";
import { MessageCircle, Phone, X, Clock } from "lucide-react";
import { useMinhaGaragem } from "@/hooks/useMinhaGaragem";
import { useLeadsGaragem } from "@/hooks/useLeadsGaragem";
import type { Database } from "@/types/database.types";

type Stage = Database["public"]["Tables"]["leads"]["Row"]["status"];

interface KanbanLead {
  id: string;
  nome: string;
  veiculo_nome: string;
  telefone: string;
  email: string | null;
  mensagem: string | null;
  dias: number;
  stage: Stage;
}

const stageConfig: { key: Stage; label: string; color: string }[] = [
  { key: "novo", label: "Novo", color: "bg-trust-high" },
  { key: "em_contato", label: "Em contato", color: "bg-warning" },
  { key: "proposta", label: "Proposta", color: "bg-garage" },
  { key: "visita", label: "Visita", color: "bg-info" },
  { key: "negociacao", label: "Negociação", color: "bg-brand-accent" },
  { key: "vendido", label: "Vendido", color: "bg-brand-dark" },
  { key: "perdido", label: "Perdido", color: "bg-text-muted" },
];

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function GarageCRM() {
  const { garagem } = useMinhaGaragem();
  const { leads, atualizarStatus, loading } = useLeadsGaragem(garagem?.id ?? null);

  const [kanbanLeads, setKanbanLeads] = useState<KanbanLead[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);

  // Sincroniza estado local quando os leads carregam
  useEffect(() => {
    setKanbanLeads(
      leads.map((l) => ({
        id: l.id,
        nome: l.nome,
        veiculo_nome: l.veiculos ? `${l.veiculos.marca} ${l.veiculos.modelo}` : "Veículo",
        telefone: l.telefone,
        email: l.email,
        mensagem: l.mensagem,
        dias: diasDesde(l.created_at),
        stage: l.status,
      }))
    );
  }, [leads]);

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (stage: Stage) => {
    if (!dragging) return;
    // Atualização otimista
    setKanbanLeads((prev) => prev.map((l) => (l.id === dragging ? { ...l, stage } : l)));
    if (selectedLead?.id === dragging) setSelectedLead((prev) => prev ? { ...prev, stage } : null);
    await atualizarStatus(dragging, stage);
    setDragging(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-garage border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 text-text-primary">Pipeline CRM</h1>
        <span className="text-small text-text-muted">{leads.length} leads</span>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <p className="text-body text-text-muted">Nenhum lead registrado para esta garagem ainda.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {stageConfig.map((stage) => {
            const stageLeads = kanbanLeads.filter((l) => l.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-[260px] rounded-xl bg-background border border-border"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.key)}
              >
                <div className="p-3 border-b border-border flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                  <span className="text-small font-medium text-text-primary">{stage.label}</span>
                  <span className="text-micro text-text-muted ml-auto">{stageLeads.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {stageLeads.map((l) => (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={() => handleDragStart(l.id)}
                      onClick={() => setSelectedLead(l)}
                      className={`rounded-lg border bg-surface-card p-3 cursor-grab active:cursor-grabbing hover:shadow-card transition-shadow ${
                        dragging === l.id ? "opacity-50 border-garage" : "border-border"
                      }`}
                    >
                      <p className="text-small font-medium text-text-primary truncate">{l.nome}</p>
                      <p className="text-micro text-text-muted truncate mt-0.5">{l.veiculo_nome}</p>
                      <div className="flex items-center justify-end mt-2">
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {l.dias}d
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead detail drawer */}
      {selectedLead && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedLead(null)} />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-background border-l border-border z-50 flex flex-col overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-h3 text-text-primary">Detalhes do lead</h3>
              <button onClick={() => setSelectedLead(null)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-garage-light flex items-center justify-center">
                  <span className="font-display text-lg font-bold text-garage">
                    {selectedLead.nome.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-h4 text-text-primary">{selectedLead.nome}</p>
                  <p className="text-small text-text-muted">{selectedLead.telefone}</p>
                </div>
              </div>

              <div className="rounded-lg bg-surface-secondary p-4 space-y-2">
                <p className="text-micro text-text-muted uppercase tracking-wider">Veículo de interesse</p>
                <p className="text-body font-medium text-text-primary">{selectedLead.veiculo_nome}</p>
              </div>

              {selectedLead.mensagem && (
                <div className="rounded-lg bg-surface-secondary p-4 space-y-2">
                  <p className="text-micro text-text-muted uppercase tracking-wider">Mensagem</p>
                  <p className="text-body text-text-secondary">{selectedLead.mensagem}</p>
                </div>
              )}

              <div className="rounded-lg bg-surface-secondary p-4 space-y-2">
                <p className="text-micro text-text-muted uppercase tracking-wider">Mover para estágio</p>
                <select
                  value={selectedLead.stage}
                  onChange={(e) => handleDrop(e.target.value as Stage)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-body text-text-primary outline-none focus:border-garage"
                >
                  {stageConfig.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-surface-secondary p-4 space-y-2">
                <p className="text-micro text-text-muted uppercase tracking-wider">Tempo no estágio</p>
                <p className="text-body text-text-primary">{selectedLead.dias} dias</p>
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${selectedLead.nome}, vi seu interesse em ${selectedLead.veiculo_nome}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-full bg-trust-high text-white py-2.5 text-small font-medium flex items-center justify-center gap-2 hover:brightness-90 transition-all"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <a
                  href={`tel:${selectedLead.telefone.replace(/\D/g, "")}`}
                  className="flex-1 rounded-full border border-border text-text-primary py-2.5 text-small font-medium flex items-center justify-center gap-2 hover:bg-surface-secondary transition-colors"
                >
                  <Phone className="w-4 h-4" /> Ligar
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
