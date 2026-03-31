import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { VentoroLogo } from "@/components/VentoroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { label: "Comprar", href: "/buscar" },
  { label: "Garagens", href: "/garagem/mb-motors-premium" },
  { label: "Anunciar", href: "/anunciar" },
  { label: "Como funciona", href: "/#como-funciona" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300 ${
        scrolled
          ? "bg-[#0C0C0A]/95 backdrop-blur-md shadow-card border-b border-white/10"
          : isHome
          ? "bg-transparent"
          : "bg-[#0C0C0A] border-b border-white/10"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link to="/">
          <VentoroLogo size="md" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-body font-body transition-colors text-white/70 hover:text-white`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link to="/minha-conta" className="flex items-center gap-2">
                <img src={user?.avatar_url} alt={user?.nome} className="h-8 w-8 rounded-full" />
                <span className="text-small font-medium text-white">
                  {user?.nome}
                </span>
              </Link>
              <button
                onClick={logout}
                className={`text-small transition-colors ${scrolled || !isHome ? "text-text-secondary hover:text-text-primary" : "text-primary-foreground/70 hover:text-primary-foreground"}`}
              >
                Sair
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/entrar"
                className={`text-body font-medium transition-colors ${scrolled || !isHome ? "text-brand hover:text-brand-dark" : "text-primary-foreground hover:text-primary-foreground/80"}`}
              >
                Entrar
              </Link>
              <Link
                to="/anunciar"
                className="rounded-full bg-brand px-5 py-2.5 text-small font-medium text-primary-foreground transition-all hover:brightness-90 active:scale-[0.97]"
              >
                Anunciar grátis
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`md:hidden p-2 ${scrolled || !isHome ? "text-text-primary" : "text-primary-foreground"}`}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-16 right-0 bottom-0 w-72 bg-surface-card shadow-elevated z-50 flex flex-col p-6 gap-4 border-l border-border"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-body text-text-secondary hover:text-text-primary py-2"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-border my-2" />
            {isAuthenticated ? (
              <>
                <Link to="/minha-conta" onClick={() => setMenuOpen(false)} className="text-body text-text-primary font-medium">
                  Minha conta
                </Link>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="text-body text-text-secondary text-left">
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link to="/entrar" onClick={() => setMenuOpen(false)} className="text-body text-brand font-medium">
                  Entrar
                </Link>
                <Link
                  to="/anunciar"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full bg-brand px-5 py-2.5 text-center text-small font-medium text-primary-foreground"
                >
                  Anunciar grátis
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
