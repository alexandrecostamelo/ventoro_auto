import { vehicles, leads, alerts, mockUser, formatPrice, formatKm } from "@/data/mock";
import { Link } from "react-router-dom";
import {
  Eye, Users, Heart, TrendingUp, ArrowUpRight, ArrowDownRight,
  Sparkles, ChevronRight, MessageCircle, Clock, Megaphone, Bell,
} from "lucide-react";

const myVehicles = vehicles.filter((v) => v.tipo_anunciante === "particular").slice(0, 3);
const recentLeads = leads.slice(0, 3);

const metrics = [
  { label: "Visualizações", value: "2.847", change: "+12%", up: true, icon: Eye },
  { label: "Leads recebidos", value: "34", change: "+8%", up: true, icon: Users },
  { label: "Favoritos", value: "89", change: "+5%", up: true, icon: Heart },
  { label: "Taxa de contato", value: "4,2%", change: "-0.3%", up: false, icon: TrendingUp },
];

const aiSuggestions = [
  {
    text: "Suas fotos são boas, mas adicionar uma foto do motor pode aumentar contatos em 40%.",
    action: "Adicionar foto",
  },
  {
    text: "O preço do seu Civic está 4% abaixo da média. Considere subir R$ 3.000 para maximizar o retorno.",
    action: "Ajustar preço",
  },
  {
    text: "Veículos com vídeo recebem 2x mais leads. Grave um vídeo curto do seu veículo.",
    action: "Saiba mais",
  },
];

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-h2 text-text-primary">
          Olá, {mockUser.nome}! 👋
        </h1>
        <p className="text-body text-text-secondary mt-1">
          Aqui está o desempenho dos seus anúncios.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-border bg-background p-5 hover:shadow-card transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-brand-light p-2">
                <m.icon className="w-4 h-4 text-brand" />
              </div>
              <span
                className={`flex items-center gap-0.5 text-micro font-medium ${
                  m.up ? "text-trust-high" : "text-trust-low"
                }`}
              >
                {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {m.change}
              </span>
            </div>
            <p className="font-display text-[26px] font-bold text-text-primary">{m.value}</p>
            <p className="text-micro text-text-muted mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Active ads */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3 text-text-primary">Seus anúncios ativos</h2>
          <Link to="/minha-conta/anuncios" className="text-small text-brand hover:underline flex items-center gap-1">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {myVehicles.map((v) => (
            <div
              key={v.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-border bg-background p-4 hover:shadow-card transition-shadow"
            >
              <img src={v.fotos[0]} alt={v.modelo} className="w-full sm:w-24 h-20 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-h4 text-text-primary truncate">
                  {v.marca} {v.modelo} {v.versao}
                </p>
                <p className="text-small text-text-secondary">
                  {v.ano} · {formatKm(v.quilometragem)} · {v.cambio}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-display text-lg font-bold text-text-primary">{formatPrice(v.preco)}</p>
                <div className="flex items-center gap-3 mt-1 text-micro text-text-muted">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.visualizacoes}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {v.leads_count}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {v.favoritos_count}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  to={`/veiculo/${v.slug}`}
                  className="rounded-full border border-border px-4 py-1.5 text-micro font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
                >
                  Ver
                </Link>
                <button className="rounded-full border border-border px-4 py-1.5 text-micro font-medium text-text-secondary hover:bg-surface-secondary transition-colors">
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent leads */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 text-text-primary">Leads recentes</h2>
            <Link to="/minha-conta/leads" className="text-small text-brand hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentLeads.map((l) => {
              const statusColors: Record<string, string> = {
                novo: "bg-trust-high/10 text-trust-high",
                em_contato: "bg-warning/10 text-warning",
                proposta: "bg-garage/10 text-garage",
                visita: "bg-info/10 text-info",
                vendido: "bg-brand-dark/10 text-brand-dark",
                perdido: "bg-text-muted/10 text-text-muted",
              };
              const statusLabels: Record<string, string> = {
                novo: "Novo", em_contato: "Em contato", proposta: "Proposta",
                visita: "Visita", vendido: "Vendido", perdido: "Perdido",
              };
              return (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                  <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
                    <span className="text-micro font-bold text-brand">{l.nome.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-medium text-text-primary truncate">{l.nome}</p>
                    <p className="text-micro text-text-muted truncate">{l.veiculo_nome}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${statusColors[l.status]}`}>
                      {statusLabels[l.status]}
                    </span>
                    <button className="rounded-full bg-brand p-2 text-primary-foreground hover:brightness-90 transition-all">
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Suggestions */}
        <section>
          <h2 className="text-h3 text-text-primary mb-4">
            <Sparkles className="w-4 h-4 text-brand inline mr-1.5" />
            Sugestões da IA
          </h2>
          <div className="space-y-3">
            {aiSuggestions.map((s, i) => (
              <div key={i} className="rounded-xl border border-brand/20 bg-brand-light/50 p-4">
                <p className="text-body text-text-primary mb-3">{s.text}</p>
                <button className="rounded-full bg-brand text-primary-foreground px-4 py-1.5 text-micro font-medium hover:brightness-90 transition-all">
                  {s.action}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Active alerts */}
      <section>
        <h2 className="text-h3 text-text-primary mb-4">Alertas ativos</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
              <Bell className="w-4 h-4 text-brand flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-small font-medium text-text-primary truncate">{a.nome}</p>
                <p className="text-micro text-text-muted">{a.total_matches} encontrados</p>
              </div>
              <div
                className={`w-8 h-5 rounded-full flex items-center transition-colors cursor-pointer ${
                  a.ativo ? "bg-brand justify-end" : "bg-border justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow mx-0.5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
