import { useState } from "react";
import { Search, Camera, FileText, MessageCircle, Car, Sparkles, BarChart3, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const buyerSteps = [
  { icon: Search, title: "Busque com IA", desc: "Descreva o que procura e a IA encontra os melhores veículos para você." },
  { icon: BarChart3, title: "Compare com segurança", desc: "Compare até 3 veículos lado a lado com score de confiança detalhado." },
  { icon: FileText, title: "Visualize a landing page", desc: "Cada veículo tem uma página de vendas inteligente com todos os detalhes." },
  { icon: MessageCircle, title: "Entre em contato", desc: "WhatsApp, agendamento ou proposta — escolha como falar com o vendedor." },
];

const sellerSteps = [
  { icon: Car, title: "Cadastre o veículo", desc: "Preencha os dados ou use a placa para preenchimento automático." },
  { icon: Camera, title: "Use o VenStudio IA", desc: "Transforme suas fotos em imagens profissionais com cenários premium." },
  { icon: Sparkles, title: "Publique com IA copiloto", desc: "A IA cria título, descrição e destaques persuasivos para você." },
  { icon: Users, title: "Receba leads qualificados", desc: "Acompanhe métricas, leads e sugestões de melhoria no seu dashboard." },
];

export function HowItWorksSection() {
  const [tab, setTab] = useState<"compradores" | "anunciantes">("compradores");
  const steps = tab === "compradores" ? buyerSteps : sellerSteps;

  return (
    <section id="como-funciona" className="py-16 bg-surface-secondary">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className="text-h2 text-text-primary text-center mb-2">Como funciona o Ventoro</h2>
        <p className="text-body text-text-secondary text-center mb-8">Simples, rápido e inteligente.</p>

        {/* Tabs */}
        <div className="flex justify-center gap-1 mb-10 bg-surface-tertiary rounded-full p-1 max-w-sm mx-auto">
          {(["compradores", "anunciantes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-5 py-2.5 text-small font-medium transition-all duration-200 ${
                tab === t ? "bg-surface-card text-text-primary shadow-card" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Para {t}
            </button>
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="flex justify-center mb-4">
                  <span className="font-display text-4xl font-bold text-brand/20">{i + 1}</span>
                </div>
                <div className="flex justify-center mb-3">
                  <div className="rounded-xl bg-brand-light p-3">
                    <step.icon className="h-6 w-6 text-brand" />
                  </div>
                </div>
                <h3 className="font-display text-base font-semibold text-text-primary mb-2">{step.title}</h3>
                <p className="text-small text-text-secondary">{step.desc}</p>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
