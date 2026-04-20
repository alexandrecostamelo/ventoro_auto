import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useNotificacoes, type Notificacao } from "@/hooks/useNotificacoes";
import { useAuth } from "@/contexts/AuthContext";
import { formatarDataRelativa } from "@/utils/formatters";
import {
  Bell, TrendingDown, Search, AlertTriangle, ShoppingCart,
  Check, Trash2, Filter, ArrowLeft,
} from "lucide-react";

const TIPO_CONFIG: Record<Notificacao["tipo"], { icon: typeof Bell; color: string; bg: string; label: string }> = {
  queda_preco: { icon: TrendingDown, color: "text-brand", bg: "bg-brand-light", label: "Queda de preço" },
  novo_match: { icon: Search, color: "text-blue-500", bg: "bg-blue-50", label: "Novo match" },
  alta_procura: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "Alta procura" },
  vendido: { icon: ShoppingCart, color: "text-red-500", bg: "bg-red-50", label: "Vendido" },
};

const TIPOS_FILTRO = [
  { value: "todos", label: "Todos" },
  { value: "queda_preco", label: "Queda de preço" },
  { value: "novo_match", label: "Novos matches" },
  { value: "alta_procura", label: "Alta procura" },
  { value: "vendido", label: "Vendidos" },
] as const;

export default function NotificacoesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notificacoes, naoLidas, loading, marcarComoLida, marcarTodasComoLidas, excluir } = useNotificacoes();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  // Redirect se não logado
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Bell className="h-12 w-12 text-text-muted mb-4" />
          <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Faça login para ver suas notificações</h1>
          <Link to="/entrar" className="mt-4 rounded-full bg-brand px-6 py-3 text-body font-medium text-primary-foreground hover:brightness-90 transition-all">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  const filtradas = filtroTipo === "todos"
    ? notificacoes
    : notificacoes.filter((n) => n.tipo === filtroTipo);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-4 lg:px-8 max-w-[720px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-surface-secondary transition-colors">
              <ArrowLeft className="h-5 w-5 text-text-muted" />
            </button>
            <h1 className="font-display text-2xl font-bold text-text-primary">Notificações</h1>
            {naoLidas > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-micro font-bold text-white">
                {naoLidas}
              </span>
            )}
          </div>
          {naoLidas > 0 && (
            <button
              onClick={() => marcarTodasComoLidas()}
              className="flex items-center gap-1.5 text-small text-brand hover:text-brand-dark transition-colors"
            >
              <Check className="h-4 w-4" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-text-muted flex-shrink-0" />
          {TIPOS_FILTRO.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroTipo(f.value)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-small font-medium transition-colors ${
                filtroTipo === f.value
                  ? "bg-brand text-primary-foreground"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-surface-secondary animate-pulse" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Bell className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-body font-medium">
              {filtroTipo === "todos"
                ? "Nenhuma notificação ainda"
                : "Nenhuma notificação deste tipo"}
            </p>
            <p className="text-small mt-1">
              Favorite veículos e salve buscas para receber alertas.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map((n) => {
              const config = TIPO_CONFIG[n.tipo];
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                    !n.lida
                      ? "border-brand/20 bg-brand-light/20"
                      : "border-border bg-surface-card hover:bg-surface-secondary"
                  }`}
                >
                  <div className={`flex-shrink-0 h-10 w-10 rounded-full ${config.bg} flex items-center justify-center mt-0.5`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-body leading-snug ${!n.lida ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`}>
                          {n.titulo}
                        </p>
                        <p className="text-small text-text-secondary mt-0.5">{n.mensagem}</p>
                      </div>
                      {!n.lida && <div className="flex-shrink-0 mt-1.5"><div className="h-2.5 w-2.5 rounded-full bg-brand" /></div>}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-micro text-text-muted">{formatarDataRelativa(n.created_at)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-micro font-medium ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.lida && (
                      <button
                        onClick={() => marcarComoLida(n.id)}
                        className="p-1.5 rounded-full hover:bg-surface-tertiary transition-colors"
                        title="Marcar como lida"
                      >
                        <Check className="h-4 w-4 text-text-muted" />
                      </button>
                    )}
                    <button
                      onClick={() => excluir(n.id)}
                      className="p-1.5 rounded-full hover:bg-red-50 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-text-muted hover:text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="pb-10" />
      <Footer />
    </div>
  );
}
