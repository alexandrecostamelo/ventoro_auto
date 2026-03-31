import { leads } from "@/data/mock";
import { useState } from "react";
import { MessageCircle, Phone, X, ChevronRight, User, Clock } from "lucide-react";

type Stage = "novo" | "em_contato" | "proposta" | "visita" | "negociacao" | "vendido" | "perdido";

interface KanbanLead {
  id: string;
  nome: string;
  veiculo_nome: string;
  telefone: string;
  mensagem: string;
  vendedor: string;
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

const vendors = ["Carlos Silva", "Ana Oliveira", "Pedro Santos"];

const initialLeads: KanbanLead[] = leads.map((l, i) => ({
  id: l.id,
  nome: l.nome,
  veiculo_nome: l.veiculo_nome,
  telefone: l.telefone,
  mensagem: l.mensagem,
  vendedor: vendors[i % vendors.length],
  dias: Math.floor(Math.random() * 10) + 1,
  stage: l.status === "novo" ? "novo" :
    l.status === "em_contato" ? "em_contato" :
    l.status === "proposta" ? "proposta" :
    l.status === "visita" ? "visita" :
    l.status === "vendido" ? "vendido" :
    l.status === "perdido" ? "perdido" : "novo",
}));

export default function GarageCRM() {
  const [kanbanLeads, setKanbanLeads] = useState<KanbanLead[]>(initialLeads);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stage: Stage) => {
    if (!dragging) return;
    setKanbanLeads((prev) =>
      prev.map((l) => (l.id === dragging ? { ...l, stage } : l))
    );
    setDragging(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-h2 text-text-primary">Pipeline CRM</h1>

      {/* Kanban */}
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
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <User className="w-3 h-3" /> {l.vendedor.split(" ")[0]}
                      </span>
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
                  <span className="font-display text-lg font-bold text-garage">{selectedLead.nome.charAt(0)}</span>
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
              <div className="rounded-lg bg-surface-secondary p-4 space-y-2">
                <p className="text-micro text-text-muted uppercase tracking-wider">Mensagem</p>
                <p className="text-body text-text-secondary">{selectedLead.mensagem}</p>
              </div>
              <div className="rounded-lg bg-surface-secondary p-4 space-y-2">
                <p className="text-micro text-text-muted uppercase tracking-wider">Vendedor responsável</p>
                <p className="text-body text-text-primary">{selectedLead.vendedor}</p>
              </div>
              <div className="rounded-lg bg-surface-secondary p-4 space-y-2">
                <p className="text-micro text-text-muted uppercase tracking-wider">Tempo no estágio</p>
                <p className="text-body text-text-primary">{selectedLead.dias} dias</p>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded-full bg-trust-high text-white py-2.5 text-small font-medium flex items-center justify-center gap-2 hover:brightness-90 transition-all">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button className="flex-1 rounded-full border border-border text-text-primary py-2.5 text-small font-medium flex items-center justify-center gap-2 hover:bg-surface-secondary transition-colors">
                  <Phone className="w-4 h-4" /> Ligar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
