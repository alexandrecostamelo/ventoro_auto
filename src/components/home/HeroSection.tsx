import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-car.jpg";

const quickChips = ["SUV", "Sedan", "Pickup", "Hatch", "Elétrico", "Até R$ 50k"];
const stats = [
  { value: "47.000+", label: "Anúncios" },
  { value: "2.300", label: "Garagens" },
  { value: "98%", label: "Satisfação" },
];

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      <div className="relative z-10 container mx-auto px-4 lg:px-8 text-center pt-16">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full bg-brand/20 border border-brand/30 px-4 py-1.5 mb-6"
        >
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="text-small font-medium text-brand-accent">Plataforma com IA integrada</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-hero text-primary-foreground max-w-3xl mx-auto mb-4"
        >
          Encontre seu próximo veículo com{" "}
          <span className="text-brand">inteligência</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-body-lg text-primary-foreground/85 max-w-lg mx-auto mb-8"
        >
          Fotos profissionais, preço justo e score de confiança em cada anúncio.
        </motion.p>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-[680px] mx-auto mb-6"
        >
          <div className="flex items-center bg-surface-card rounded-xl shadow-elevated p-2 gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Marca, modelo ou garagem..."
              className="flex-1 px-4 py-3 text-body text-text-primary bg-transparent outline-none placeholder:text-text-muted"
            />
            <div className="hidden md:block w-px h-8 bg-border" />
            <select className="hidden md:block px-4 py-3 text-body text-text-secondary bg-transparent outline-none cursor-pointer">
              <option>Todas as cidades</option>
              <option>São Paulo</option>
              <option>Campinas</option>
              <option>Ribeirão Preto</option>
              <option>Presidente Prudente</option>
            </select>
            <button
              onClick={() => navigate("/buscar")}
              className="flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-small font-medium text-primary-foreground transition-all hover:brightness-90 active:scale-[0.97]"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>
        </motion.div>

        {/* Quick chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => navigate("/buscar")}
              className="rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1.5 text-small text-primary-foreground/90 backdrop-blur-sm transition-all hover:bg-primary-foreground/20"
            >
              {chip}
            </button>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-center gap-8 md:gap-16"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-small text-primary-foreground/60">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
