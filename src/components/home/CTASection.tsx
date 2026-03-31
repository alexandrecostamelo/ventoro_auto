import { Link } from "react-router-dom";
import { Sparkles, Shield, FileText } from "lucide-react";

const features = [
  { icon: Sparkles, label: "AutoStudio IA incluso" },
  { icon: Shield, label: "Score de confiança" },
  { icon: FileText, label: "Landing page por veículo" },
];

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-brand-dark to-brand">
      <div className="container mx-auto px-4 lg:px-8 text-center">
        <h2 className="text-h1 text-primary-foreground mb-4 max-w-2xl mx-auto">
          Seu veículo anunciado com inteligência.
        </h2>
        <p className="text-body-lg text-primary-foreground/80 mb-8 max-w-lg mx-auto">
          Fotos profissionais, preço validado por IA e landing page própria para cada anúncio.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-10">
          <Link
            to="/anunciar"
            className="rounded-full bg-primary-foreground px-8 py-3 text-body font-medium text-brand transition-all hover:bg-primary-foreground/90 active:scale-[0.97]"
          >
            Anunciar agora
          </Link>
          <Link
            to="/anunciar"
            className="rounded-full border border-primary-foreground/30 px-8 py-3 text-body font-medium text-primary-foreground transition-all hover:bg-primary-foreground/10"
          >
            Ver planos
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {features.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <f.icon className="h-4 w-4 text-brand-accent" />
              <span className="text-small text-primary-foreground/80">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
