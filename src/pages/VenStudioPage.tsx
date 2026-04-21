import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function VenStudioPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center pt-28 pb-16 px-4">
        <div className="w-full max-w-lg text-center">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10 text-[var(--color-brand-primary)]" />
          </div>
          <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/20 text-sm px-3 py-1">
            Em Breve
          </Badge>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary mb-3">
            VenStudio IA
          </h1>
          <p className="text-text-secondary max-w-md mx-auto mb-8">
            Estamos desenvolvendo uma tecnologia exclusiva para transformar suas fotos em imagens profissionais, preservando cada detalhe do seu veículo.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
