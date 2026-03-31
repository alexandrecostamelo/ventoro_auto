import { Link } from "react-router-dom";
import { VentoroLogo } from "@/components/VentoroLogo";

export function Footer() {
  return (
    <footer className="bg-surface-dark text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link to="/" className="inline-block mb-4">
              <VentoroLogo size="md" />
            </Link>
            <p className="text-small text-primary-foreground/60 mb-6 max-w-xs">
              Marketplace de veículos com inteligência artificial. Compre e venda com confiança.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display text-sm font-semibold mb-4 text-primary-foreground/80 uppercase tracking-wider">Produto</h4>
            <ul className="space-y-2.5">
              {["Comprar veículo", "Comparar veículos", "VenStudio IA", "Pedido de busca"].map((item) => (
                <li key={item}><span className="text-small text-primary-foreground/50 hover:text-primary-foreground transition-colors cursor-pointer">{item}</span></li>
              ))}
            </ul>
          </div>

          {/* For advertisers */}
          <div>
            <h4 className="font-display text-sm font-semibold mb-4 text-primary-foreground/80 uppercase tracking-wider">Para anunciantes</h4>
            <ul className="space-y-2.5">
              {["Anunciar veículo", "Planos e preços", "Dashboard", "Para garagens"].map((item) => (
                <li key={item}><span className="text-small text-primary-foreground/50 hover:text-primary-foreground transition-colors cursor-pointer">{item}</span></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-sm font-semibold mb-4 text-primary-foreground/80 uppercase tracking-wider">Contato</h4>
            <ul className="space-y-2.5">
              {["Central de ajuda", "Fale conosco", "contato@ventoro.com.br"].map((item) => (
                <li key={item}><span className="text-small text-primary-foreground/50">{item}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-micro text-primary-foreground/40">© 2025 Ventoro. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            {["Termos de uso", "Privacidade", "Cookies"].map((item) => (
              <span key={item} className="text-micro text-primary-foreground/40 hover:text-primary-foreground/60 cursor-pointer transition-colors">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
