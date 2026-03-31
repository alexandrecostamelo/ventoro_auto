import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { VentoroLogo } from "@/components/VentoroLogo";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Navbar />
      <div className="flex items-center justify-center pt-28 pb-16 px-4">
        <div className="w-full max-w-[420px] rounded-xl border border-border bg-surface-card p-8 shadow-card">
          <div className="text-center mb-6">
            <Link to="/" className="inline-block mb-4">
              <VentoroLogo variant="light" size="md" />
            </Link>
            <h1 className="font-display text-2xl font-semibold text-text-primary">Bem-vindo de volta</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-micro text-text-muted uppercase tracking-wider block mb-1">Email</label>
              <input type="email" placeholder="seu@email.com" className="w-full rounded-md border border-border bg-surface-card px-4 py-3 text-body text-text-primary outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,158,117,0.15)]" />
            </div>
            <div>
              <label className="text-micro text-text-muted uppercase tracking-wider block mb-1">Senha</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full rounded-md border border-border bg-surface-card px-4 py-3 text-body text-text-primary outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,158,117,0.15)]" />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button onClick={() => { login(); window.location.href = "/minha-conta"; }} className="w-full rounded-full bg-brand px-5 py-3 text-body font-medium text-primary-foreground transition-all hover:brightness-90 active:scale-[0.97]">
              Entrar
            </button>
            <button className="text-small text-brand hover:text-brand-dark w-full text-center">Esqueci minha senha</button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-micro text-text-muted">ou continue com</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-3">
              <button className="flex-1 rounded-md border border-border bg-surface-card px-4 py-2.5 text-small font-medium text-text-primary hover:bg-surface-secondary transition-colors">Google</button>
              <button className="flex-1 rounded-md border border-border bg-surface-card px-4 py-2.5 text-small font-medium text-text-primary hover:bg-surface-secondary transition-colors">WhatsApp</button>
            </div>
          </div>

          <p className="text-center text-small text-text-muted mt-6">
            Não tem conta? <Link to="/cadastrar" className="text-brand font-medium hover:text-brand-dark">Cadastre-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
