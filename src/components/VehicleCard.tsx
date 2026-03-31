import { Link } from "react-router-dom";
import { Vehicle, formatPrice, formatKm } from "@/data/mock";
import { MapPin, Fuel, Sparkles } from "lucide-react";

interface VehicleCardProps {
  vehicle: Vehicle;
  layout?: "grid" | "list";
}

export function VehicleCard({ vehicle, layout = "grid" }: VehicleCardProps) {
  const priceTag = {
    abaixo: { label: "▼ abaixo da média", className: "bg-brand-light text-brand-dark" },
    na_media: { label: "= preço justo", className: "bg-amber-50 text-amber-700" },
    acima: { label: "▲ acima da média", className: "bg-red-50 text-red-700" },
  }[vehicle.preco_status];

  const scoreColor = vehicle.score_confianca >= 90 ? "bg-trust-high" : vehicle.score_confianca >= 75 ? "bg-trust-medium" : "bg-trust-low";

  const badge = vehicle.selo_studio_ia
    ? { label: "VenStudio IA", className: "bg-brand text-primary-foreground" }
    : vehicle.tipo_anunciante === "garagem"
    ? { label: "Garagem Pro", className: "bg-garage text-primary-foreground" }
    : vehicle.destaque
    ? { label: "Destaque", className: "bg-warning text-primary-foreground" }
    : null;

  if (layout === "list") {
    return (
      <Link to={`/veiculo/${vehicle.slug}`} className="group block">
        <div className="flex gap-4 rounded-lg border border-border bg-surface-card p-3 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5">
          <div className="relative w-[200px] h-[150px] flex-shrink-0 overflow-hidden rounded-md">
            <img src={vehicle.fotos[0]} alt={`${vehicle.marca} ${vehicle.modelo}`} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
          </div>
          <div className="flex flex-1 flex-col justify-between py-1">
            <div>
              <p className="font-display text-[15px] font-semibold text-text-primary">{vehicle.marca} {vehicle.modelo} {vehicle.versao}</p>
              <p className="text-small text-text-secondary">{vehicle.ano} · {formatKm(vehicle.quilometragem)} · {vehicle.cambio}</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-text-primary">{formatPrice(vehicle.preco)}</p>
              <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-micro ${priceTag.className}`}>{priceTag.label}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/veiculo/${vehicle.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-border bg-surface-card shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-[3px]">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={vehicle.fotos[0]} alt={`${vehicle.marca} ${vehicle.modelo}`} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" loading="lazy" />
          {badge && (
            <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-micro font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-micro text-primary-foreground font-mono">
            <span className={`h-2 w-2 rounded-full ${scoreColor}`} />
            {vehicle.score_confianca}
          </span>
        </div>

        {/* Content */}
        <div className="px-4 pt-3.5 pb-3">
          <p className="font-display text-[15px] font-semibold text-text-primary truncate">
            {vehicle.marca} {vehicle.modelo} {vehicle.versao}
          </p>
          <p className="mt-0.5 text-small text-text-secondary">
            {vehicle.ano} · {formatKm(vehicle.quilometragem)} · {vehicle.cambio}
          </p>
          <p className="mt-2 font-display text-xl font-bold text-text-primary">
            {formatPrice(vehicle.preco)}
          </p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-micro ${priceTag.className}`}>
            {priceTag.label}
          </span>

          {/* IA label */}
          {(vehicle.selo_studio_ia || vehicle.selo_video_ia) && (
            <div className="mt-2.5 flex items-center gap-1 border-t border-border pt-2.5">
              <Sparkles className="h-3 w-3 text-brand" />
              <span className="text-micro text-brand">
                {vehicle.selo_video_ia ? "Vídeo disponível" : "Validado por IA"}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center gap-3 text-text-muted">
            <span className="flex items-center gap-1 text-micro">
              <MapPin className="h-3 w-3" />
              {vehicle.cidade}
            </span>
            <span className="flex items-center gap-1 text-micro">
              <Fuel className="h-3 w-3" />
              {vehicle.combustivel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
