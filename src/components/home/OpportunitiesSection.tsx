import { vehicles, formatPrice, formatKm } from "@/data/mock";
import { VehicleCard } from "@/components/VehicleCard";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function OpportunitiesSection() {
  const opportunities = vehicles.filter((v) => v.preco_status === "abaixo").slice(0, 3);

  return (
    <section className="py-16 bg-surface-dark">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-h2 text-primary-foreground mb-2">Oportunidades identificadas pela IA</h2>
          <p className="text-body text-text-muted">Veículos com preço abaixo da média e alta procedência.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto">
          {opportunities.map((vehicle, i) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="relative"
            >
              <div className="absolute -top-2 left-4 z-10 flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-micro font-medium text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                Oportunidade IA
              </div>
              <div className="rounded-lg border border-brand/30 overflow-hidden">
                <VehicleCard vehicle={vehicle} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
