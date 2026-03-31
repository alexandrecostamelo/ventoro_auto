import { Link } from "react-router-dom";
import { garages } from "@/data/mock";
import { Star, Clock, Car } from "lucide-react";
import { motion } from "framer-motion";

export function GaragesSection() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-h2 text-text-primary mb-2">Garagens verificadas</h2>
          <p className="text-body text-text-secondary">Lojistas com score de confiança máximo na plataforma.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {garages.map((garage, i) => (
            <motion.div
              key={garage.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link to={`/garagem/${garage.slug}`} className="group block">
                <div className="rounded-lg border border-border bg-surface-card p-5 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={garage.logo_url} alt={garage.nome} className="h-12 w-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-display text-[15px] font-semibold text-text-primary">{garage.nome}</p>
                      <p className="text-small text-text-secondary">{garage.cidade}, {garage.estado}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    <span className="flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-micro font-medium text-brand-dark font-mono">
                      <span className="h-2 w-2 rounded-full bg-trust-high" />
                      {garage.score_confianca}
                    </span>
                    {garage.plano !== "starter" && (
                      <span className={`rounded-full px-2 py-0.5 text-micro font-medium ${
                        garage.plano === "premium" ? "bg-garage-light text-garage" : "bg-brand-light text-brand-dark"
                      }`}>
                        {garage.plano === "premium" ? "Premium" : "Pro"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-text-muted">
                        <Car className="h-3 w-3" />
                      </div>
                      <p className="text-micro font-medium text-text-primary">{garage.total_estoque}</p>
                      <p className="text-micro text-text-muted">veículos</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-text-muted">
                        <Star className="h-3 w-3" />
                      </div>
                      <p className="text-micro font-medium text-text-primary">{garage.avaliacao}</p>
                      <p className="text-micro text-text-muted">avaliação</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-text-muted">
                        <Clock className="h-3 w-3" />
                      </div>
                      <p className="text-micro font-medium text-text-primary">{garage.anos_plataforma}a</p>
                      <p className="text-micro text-text-muted">na plat.</p>
                    </div>
                  </div>

                  <button className="mt-3 w-full text-center text-small font-medium text-brand hover:text-brand-dark transition-colors">
                    Ver vitrine →
                  </button>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
