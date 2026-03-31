import { Link } from "react-router-dom";
import { vehicles } from "@/data/mock";
import { VehicleCard } from "@/components/VehicleCard";
import { motion } from "framer-motion";

export function FeaturedVehicles() {
  const featured = vehicles.filter((v) => v.destaque).slice(0, 8);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-h2 text-text-primary">Destaques da região</h2>
          <Link to="/buscar" className="text-body font-medium text-brand hover:text-brand-dark transition-colors">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((vehicle, i) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <VehicleCard vehicle={vehicle} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
