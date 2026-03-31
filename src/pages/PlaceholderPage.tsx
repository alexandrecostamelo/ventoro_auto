import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center pt-32 pb-16 px-4">
        <div className="rounded-xl bg-surface-secondary p-4 mb-4">
          <Construction className="h-10 w-10 text-brand" />
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">{title}</h1>
        <p className="text-body text-text-secondary mb-6 text-center max-w-md">
          {description || "Esta página está em construção. Em breve estará disponível."}
        </p>
        <Link to="/" className="rounded-full bg-brand px-6 py-2.5 text-small font-medium text-primary-foreground transition-all hover:brightness-90">
          Voltar ao início
        </Link>
      </div>
      <Footer />
    </div>
  );
}
