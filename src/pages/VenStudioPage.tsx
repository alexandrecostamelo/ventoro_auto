import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CENARIOS_V2_LIST } from "@/lib/venstudio-cenarios-v2";

export default function VenStudioPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-28 pb-16 px-4">
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10 text-[var(--color-brand-primary)]" />
          </div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary mb-3">
            VenStudio IA
          </h1>
          <p className="text-text-secondary max-w-lg mx-auto">
            Transforme as fotos do seu veículo com cenários profissionais gerados por inteligência artificial.
            O VenStudio está integrado ao fluxo de publicação do anúncio.
          </p>
        </div>

        {/* Cenários disponíveis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {CENARIOS_V2_LIST.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-surface-primary p-5 flex items-start gap-4"
            >
              <div className="text-3xl">{c.emoji}</div>
              <div>
                <h3 className="font-semibold text-text-primary">{c.label}</h3>
                <p className="text-sm text-text-secondary mt-1">{c.descricao}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={() => navigate("/publicar")} className="gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90 text-white">
            Publicar anúncio <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
