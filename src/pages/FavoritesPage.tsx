import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Trash2, TrendingDown, ArrowRightLeft, Bell, BellOff,
  Eye, MapPin, Sparkles, SortAsc, X, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/Navbar";
import { vehicles, formatPrice, formatKm } from "@/data/mock";
import { useFavoritos, type FavoritoEnriquecido } from "@/hooks/useFavoritos";
import { useAuth } from "@/contexts/AuthContext";
import { USE_REAL_DATA } from "@/config/flags";

// ─── Mock local ───────────────────────────────────────────────────────────────

interface FavVehicle {
  vehicleId: string;
  savedAt: string;
  priceAtSave: number;
  priceAlertEnabled: boolean;
}

const MOCK_FAVORITES: FavVehicle[] = vehicles.slice(0, 6).map((v, i) => ({
  vehicleId: v.id,
  savedAt: new Date(Date.now() - i * 86400000 * (i + 1)).toISOString(),
  priceAtSave: v.preco + (i % 3 === 0 ? 5000 : i % 3 === 1 ? -2000 : 0),
  priceAlertEnabled: i < 4,
}));

type SortBy = "recent" | "price_asc" | "price_desc" | "price_drop";

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { favoritosEnriquecidos, toggleFavorito, loading: favLoading, error } = useFavoritos();

  // Estado mock (usado quando USE_REAL_DATA = false)
  const [mockFavs, setMockFavs] = useState<FavVehicle[]>(MOCK_FAVORITES);

  // Alertas de preço locais (persistência futura — por enquanto só React state)
  const [priceAlerts, setPriceAlerts] = useState<Record<string, boolean>>(() => {
    if (!USE_REAL_DATA) {
      return Object.fromEntries(MOCK_FAVORITES.map(f => [f.vehicleId, f.priceAlertEnabled]));
    }
    return {};
  });

  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // ── Dados resolvidos ─────────────────────────────────────────────────────────

  const favoritosData: FavoritoEnriquecido[] = useMemo(() => {
    if (USE_REAL_DATA) return favoritosEnriquecidos;
    return mockFavs
      .map(fav => {
        const v = vehicles.find(x => x.id === fav.vehicleId);
        if (!v) return null;
        return {
          id: fav.vehicleId,
          veiculo_id: fav.vehicleId,
          savedAt: fav.savedAt,
          lista_nome: "Sem categoria",
          vehicle: v,
          priceDiff: v.preco - fav.priceAtSave,
        } satisfies FavoritoEnriquecido;
      })
      .filter((f): f is FavoritoEnriquecido => f !== null);
  }, [USE_REAL_DATA ? favoritosEnriquecidos : mockFavs]);

  const sorted = useMemo(() => {
    const copy = [...favoritosData];
    switch (sortBy) {
      case "price_asc": return copy.sort((a, b) => a.vehicle.preco - b.vehicle.preco);
      case "price_desc": return copy.sort((a, b) => b.vehicle.preco - a.vehicle.preco);
      case "price_drop": return copy.sort((a, b) => a.priceDiff - b.priceDiff);
      default: return copy.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }
  }, [favoritosData, sortBy]);

  const priceDropCount = favoritosData.filter(e => e.priceDiff < 0).length;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleRemove(veiculoId: string) {
    if (USE_REAL_DATA) {
      toggleFavorito(veiculoId); // optimistic via hook
    } else {
      setMockFavs(prev => prev.filter(f => f.vehicleId !== veiculoId));
    }
    setCompareIds(prev => prev.filter(c => c !== veiculoId));
  }

  function togglePriceAlert(id: string) {
    setPriceAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleCompare(id: string) {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  // ── Estados de loading / auth ────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (USE_REAL_DATA && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Heart className="h-14 w-14 text-text-muted mb-4" />
          <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
            Faça login para ver seus favoritos
          </h1>
          <p className="text-body text-text-secondary mb-6 max-w-sm">
            Salve os veículos que você gosta e acompanhe as variações de preço.
          </p>
          <div className="flex gap-3">
            <Link
              to="/entrar"
              className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-body font-medium text-primary-foreground hover:brightness-90 transition-all"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
            <Link
              to="/buscar"
              className="rounded-full border border-border px-6 py-3 text-body font-medium text-text-primary hover:bg-surface-secondary transition-all"
            >
              Explorar veículos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (USE_REAL_DATA && favLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <FavoritesHero total={0} priceDropCount={0} />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <SkeletonFavorites />
        </div>
      </div>
    );
  }

  if (USE_REAL_DATA && error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  // ── Render principal ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <FavoritesHero
        total={favoritosData.length}
        priceDropCount={priceDropCount}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[200px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="price_asc">Menor preço</SelectItem>
              <SelectItem value="price_desc">Maior preço</SelectItem>
              <SelectItem value="price_drop">Maior queda de preço</SelectItem>
            </SelectContent>
          </Select>

          {compareIds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <ArrowRightLeft className="h-3 w-3" /> {compareIds.length}/3 selecionados
              </Badge>
              <Button size="sm" onClick={() => navigate("/comparar")} className="bg-primary hover:bg-primary/90">
                Comparar <ArrowRightLeft className="h-4 w-4 ml-1" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCompareIds([])}>
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Price Drop Alert Banner */}
        {priceDropCount > 0 && (
          <Card className="mb-6 bg-trust-high/5 border-trust-high/20">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-trust-high flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{priceDropCount} veículo(s) com queda de preço!</p>
                <p className="text-xs text-muted-foreground">Preços atualizados desde que você salvou</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista ou estado vazio */}
        {sorted.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-16 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-semibold text-lg">Nenhum favorito salvo</p>
              <p className="text-muted-foreground mt-1 mb-4">
                Explore veículos e toque no ♥ para salvar aqui
              </p>
              <Button onClick={() => navigate("/buscar")} className="bg-primary hover:bg-primary/90">
                Explorar Veículos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sorted.map(({ vehicle: v, priceDiff, savedAt, veiculo_id }) => {
                const isComparing = compareIds.includes(veiculo_id);
                const hasDrop = priceDiff < 0;
                const hasIncrease = priceDiff > 0;
                const alertActive = priceAlerts[veiculo_id] ?? false;

                return (
                  <motion.div
                    key={veiculo_id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                  >
                    <Card className={`transition-all hover:shadow-md ${isComparing ? "ring-2 ring-primary" : ""} ${hasDrop ? "border-l-4 border-l-trust-high" : ""}`}>
                      <CardContent className="p-4 flex gap-4">
                        {/* Foto */}
                        <div
                          className="w-32 h-24 md:w-40 md:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-muted cursor-pointer relative"
                          onClick={() => navigate(`/veiculo/${v.slug}`)}
                        >
                          <img
                            src={v.fotos[0]}
                            alt={v.modelo}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-car.jpg"; }}
                          />
                          {v.selo_studio_ia && (
                            <Badge className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Studio
                            </Badge>
                          )}
                        </div>

                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="cursor-pointer" onClick={() => navigate(`/veiculo/${v.slug}`)}>
                              <p className="font-semibold truncate">{v.marca} {v.modelo} {v.versao}</p>
                              <p className="text-xs text-muted-foreground">{v.ano} • {formatKm(v.quilometragem)} • {v.combustivel}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-primary">
                                {formatPrice(v.preco)}
                              </p>
                              {hasDrop && (
                                <p className="text-xs font-medium text-trust-high flex items-center justify-end gap-0.5">
                                  <TrendingDown className="h-3 w-3" />
                                  -{formatPrice(Math.abs(priceDiff))}
                                </p>
                              )}
                              {hasIncrease && (
                                <p className="text-xs font-medium text-trust-low flex items-center justify-end gap-0.5">
                                  +{formatPrice(priceDiff)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <MapPin className="h-3 w-3" /> {v.cidade}/{v.estado}
                            </Badge>
                            <Badge
                              variant={v.preco_status === "abaixo" ? "default" : "outline"}
                              className={`text-[10px] ${v.preco_status === "abaixo" ? "bg-trust-high text-white" : ""}`}
                            >
                              {v.preco_status === "abaixo" ? "Abaixo da média" : v.preco_status === "acima" ? "Acima da média" : "Na média"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Eye className="h-3 w-3" /> {v.visualizacoes}
                            </Badge>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant={isComparing ? "default" : "outline"}
                              className={`text-xs h-7 ${isComparing ? "bg-primary" : ""}`}
                              onClick={() => toggleCompare(veiculo_id)}
                            >
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              {isComparing ? "Selecionado" : "Comparar"}
                            </Button>
                            <Button
                              size="sm" variant="outline" className="text-xs h-7 gap-1"
                              onClick={() => togglePriceAlert(veiculo_id)}
                            >
                              {alertActive ? <Bell className="h-3 w-3 text-primary" /> : <BellOff className="h-3 w-3" />}
                              {alertActive ? "Alerta ativo" : "Ativar alerta"}
                            </Button>
                            <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline">
                              Salvo em {new Date(savedAt).toLocaleDateString("pt-BR")}
                            </span>
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemove(veiculo_id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Footer info */}
        {sorted.length > 0 && (
          <Card className="mt-8 bg-primary/5 border-primary/20">
            <CardContent className="p-5 flex items-center gap-4">
              <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Alertas de Queda de Preço</p>
                <p className="text-xs text-muted-foreground">
                  A Ventoro IA monitora os preços dos seus favoritos e te avisa quando houver reduções.
                  Ative o sino em cada veículo para receber notificações.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function FavoritesHero({ total, priceDropCount }: { total: number; priceDropCount: number }) {
  return (
    <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-3">
              <Heart className="h-4 w-4" /> Favoritos
            </div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">Meus Favoritos</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe os veículos que você salvou e receba alertas de queda de preço
            </p>
          </div>
          <div className="flex gap-3">
            <Card className="bg-primary/5 border-primary/20 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-primary font-[family-name:var(--font-mono)]">{total}</p>
              <p className="text-xs text-muted-foreground">Salvos</p>
            </Card>
            {priceDropCount > 0 && (
              <Card className="bg-trust-high/10 border-trust-high/20 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-trust-high font-[family-name:var(--font-mono)]">{priceDropCount}</p>
                <p className="text-xs text-muted-foreground">Com queda</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonFavorites() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface-card p-4 flex gap-4">
          <Skeleton className="w-32 h-24 md:w-40 md:h-28 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-7 w-24 rounded-md" />
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
