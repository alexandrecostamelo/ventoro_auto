import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VehicleCard } from "@/components/VehicleCard";
import { vehicles, garages } from "@/data/mock";
import { formatPrice } from "@/utils/formatters";
import { Star, Clock, Car, Shield, Phone, Mail, MapPin, CheckCircle } from "lucide-react";

export default function GarageProfilePage() {
  const { slug } = useParams();
  const garage = garages.find((g) => g.slug === slug) || garages[0];
  const garageVehicles = vehicles.filter((v) => v.garagem_id === garage.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="relative h-[200px] md:h-[280px] overflow-hidden">
        <img src={garage.capa_url} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Identity card */}
      <div className="container mx-auto px-4 lg:px-8 max-w-[1080px] -mt-16 relative z-10 mb-8">
        <div className="rounded-xl border border-border bg-surface-card p-5 shadow-elevated flex flex-col md:flex-row items-start md:items-center gap-4">
          <img src={garage.logo_url} alt={garage.nome} className="h-16 w-16 rounded-xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-text-primary">{garage.nome}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${
                garage.plano === "premium" ? "bg-garage-light text-garage" : "bg-brand-light text-brand-dark"
              }`}>
                {garage.plano === "premium" ? "Premium" : "Pro"}
              </span>
              {garage.cnpj_verificado && (
                <span className="flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-0.5 text-micro font-medium text-brand-dark">
                  <CheckCircle className="h-3 w-3" /> CNPJ verificado
                </span>
              )}
            </div>
            <p className="text-body text-text-secondary mt-1">{garage.cidade}, {garage.estado} · {garage.especialidade}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-brand-light px-3 py-1.5 text-body font-mono font-medium text-brand-dark">
            <span className="h-2.5 w-2.5 rounded-full bg-trust-high" />
            {garage.score_confianca}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 max-w-[1080px]">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {[
            { icon: Car, value: garage.total_estoque, label: "Veículos em estoque" },
            { icon: Star, value: garage.avaliacao, label: "Avaliação" },
            { icon: Shield, value: garage.total_vendas, label: "Vendas realizadas" },
            { icon: Clock, value: `${garage.tempo_resposta_minutos} min`, label: "Tempo de resposta" },
            { icon: CheckCircle, value: `${garage.anos_plataforma} anos`, label: "Na plataforma" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-lg border border-border bg-surface-card">
              <stat.icon className="h-5 w-5 mx-auto mb-2 text-text-muted" />
              <p className="font-display text-xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-micro text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* About */}
        <div className="mb-10">
          <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Sobre</h2>
          <p className="text-body text-text-secondary">{garage.descricao}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-small text-text-secondary">
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{garage.telefone}</span>
            <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{garage.email}</span>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{garage.cidade}, {garage.estado}</span>
          </div>
        </div>

        {/* Portfolio */}
        <div className="mb-10">
          <h2 className="font-display text-lg font-semibold text-text-primary mb-4">Estoque ({garageVehicles.length > 0 ? garageVehicles.length : vehicles.length} veículos)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(garageVehicles.length > 0 ? garageVehicles : vehicles.slice(0, 6)).map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-10">
          <h2 className="font-display text-lg font-semibold text-text-primary mb-4">O que dizem sobre nós</h2>
          <div className="flex items-center gap-4 mb-6">
            <p className="font-display text-4xl font-bold text-text-primary">{garage.avaliacao}</p>
            <div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-5 w-5 ${s <= Math.round(garage.avaliacao) ? "fill-warning text-warning" : "text-surface-tertiary"}`} />
                ))}
              </div>
              <p className="text-small text-text-muted">{garage.total_vendas} avaliações</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { name: "Carlos M.", rating: 5, date: "Março 2025", text: "Excelente atendimento! Veículo em perfeito estado, exatamente como descrito no anúncio." },
              { name: "Ana P.", rating: 5, date: "Fevereiro 2025", text: "Comprei meu Corolla aqui. Processo transparente do início ao fim. Recomendo!" },
              { name: "Roberto S.", rating: 4, date: "Janeiro 2025", text: "Bom atendimento, veículo conforme anunciado. Demorou um pouco para responder no WhatsApp." },
            ].map((review) => (
              <div key={review.name} className="rounded-lg border border-border bg-surface-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center text-micro font-medium text-text-secondary">{review.name.charAt(0)}</div>
                    <span className="text-small font-medium text-text-primary">{review.name}</span>
                  </div>
                  <span className="text-micro text-text-muted">{review.date}</span>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-warning text-warning" : "text-surface-tertiary"}`} />
                  ))}
                </div>
                <p className="text-small text-text-secondary">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
