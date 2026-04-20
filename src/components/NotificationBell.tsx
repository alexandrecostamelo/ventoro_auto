import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, TrendingDown, Search, AlertTriangle, ShoppingCart, Check, X } from "lucide-react";
import { useNotificacoes, type Notificacao } from "@/hooks/useNotificacoes";
import { formatarDataRelativa } from "@/utils/formatters";

const TIPO_CONFIG: Record<Notificacao["tipo"], { icon: typeof Bell; color: string; bg: string }> = {
  queda_preco: { icon: TrendingDown, color: "text-brand", bg: "bg-brand-light" },
  novo_match: { icon: Search, color: "text-blue-500", bg: "bg-blue-50" },
  alta_procura: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
  vendido: { icon: ShoppingCart, color: "text-red-500", bg: "bg-red-50" },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const recentes = notificacoes.slice(0, 10);

  function handleClick(n: Notificacao) {
    if (!n.lida) marcarComoLida(n.id);
    setOpen(false);
    if (n.veiculo_id) {
      // Navegar pro veículo — precisamos do slug, mas só temos o ID
      // Por enquanto, navegar pra notificações completas
      navigate("/notificacoes");
    } else {
      navigate("/notificacoes");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full transition-colors hover:bg-white/10"
        aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ""}`}
      >
        <Bell className="h-5 w-5 text-white/70" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] rounded-xl border border-border bg-surface-card shadow-elevated z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-display text-sm font-semibold text-text-primary">Notificações</h3>
            {naoLidas > 0 && (
              <button
                onClick={() => marcarTodasComoLidas()}
                className="flex items-center gap-1 text-micro text-brand hover:text-brand-dark transition-colors"
              >
                <Check className="h-3 w-3" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto max-h-[360px]">
            {recentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-small">Nenhuma notificação</p>
              </div>
            ) : (
              recentes.map((n) => {
                const config = TIPO_CONFIG[n.tipo];
                const Icon = config.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-secondary ${
                      !n.lida ? "bg-brand-light/30" : ""
                    }`}
                  >
                    <div className={`flex-shrink-0 h-9 w-9 rounded-full ${config.bg} flex items-center justify-center mt-0.5`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-small leading-snug ${!n.lida ? "font-medium text-text-primary" : "text-text-secondary"}`}>
                        {n.titulo}
                      </p>
                      <p className="text-micro text-text-muted mt-0.5 truncate">{n.mensagem}</p>
                      <p className="text-micro text-text-muted mt-1">{formatarDataRelativa(n.created_at)}</p>
                    </div>
                    {!n.lida && (
                      <div className="flex-shrink-0 mt-2">
                        <div className="h-2 w-2 rounded-full bg-brand" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {recentes.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <Link
                to="/notificacoes"
                onClick={() => setOpen(false)}
                className="block text-center text-small font-medium text-brand hover:text-brand-dark transition-colors"
              >
                Ver todas as notificações
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
