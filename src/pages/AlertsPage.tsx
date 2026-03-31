import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellRing, Plus, Search, Trash2, Edit2, ToggleLeft, ToggleRight,
  Sparkles, Car, DollarSign, MapPin, Fuel, Settings2, CheckCircle2,
  X, ChevronRight, Eye, Heart, ArrowRight, Zap, Filter, Clock,
  TrendingDown, AlertTriangle, Star, MessageSquare, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/Navbar";
import { vehicles } from "@/data/mock";
import { useNavigate } from "react-router-dom";

/* ──── Types ──── */
interface Alert {
  id: string;
  name: string;
  marca?: string;
  modelo?: string;
  precoMin?: number;
  precoMax?: number;
  anoMin?: number;
  anoMax?: number;
  kmMax?: number;
  combustivel?: string;
  cambio?: string;
  cidade?: string;
  estado?: string;
  active: boolean;
  createdAt: string;
  matchCount: number;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyWhatsapp: boolean;
}

interface Notification {
  id: string;
  alertId: string;
  alertName: string;
  vehicleId: string;
  vehicleTitle: string;
  vehiclePrice: number;
  vehiclePhoto: string;
  vehicleSlug: string;
  matchScore: number;
  reason: string;
  read: boolean;
  createdAt: string;
}

const MARCAS = ["Toyota", "Honda", "Volkswagen", "Chevrolet", "Hyundai", "Jeep", "Fiat", "BMW", "Mercedes-Benz", "Audi"];
const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico", "Híbrido"];
const CAMBIOS = ["Automático", "Manual", "CVT", "Automatizado"];
const ESTADOS = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "DF"];

/* ──── Mock Data ──── */
const MOCK_ALERTS: Alert[] = [
  {
    id: "a1", name: "Toyota Corolla até 120k", marca: "Toyota", modelo: "Corolla",
    precoMax: 120000, anoMin: 2020, kmMax: 60000, combustivel: "Flex", cambio: "",
    cidade: "", estado: "SP", active: true, createdAt: "2025-03-15",
    matchCount: 4, notifyEmail: true, notifyPush: true, notifyWhatsapp: false,
    precoMin: undefined, anoMax: undefined,
  },
  {
    id: "a2", name: "SUVs baratos", marca: "", modelo: "",
    precoMax: 80000, anoMin: 2018, kmMax: 100000, combustivel: "", cambio: "Automático",
    cidade: "", estado: "", active: true, createdAt: "2025-03-20",
    matchCount: 7, notifyEmail: true, notifyPush: false, notifyWhatsapp: true,
    precoMin: undefined, anoMax: undefined,
  },
  {
    id: "a3", name: "Honda Civic 2022+", marca: "Honda", modelo: "Civic",
    precoMax: 150000, anoMin: 2022, kmMax: 30000, combustivel: "", cambio: "",
    cidade: "São Paulo", estado: "SP", active: false, createdAt: "2025-02-10",
    matchCount: 2, notifyEmail: true, notifyPush: true, notifyWhatsapp: false,
    precoMin: undefined, anoMax: undefined,
  },
];

function generateNotifications(): Notification[] {
  return vehicles.slice(0, 8).map((v, i) => ({
    id: `n${i}`,
    alertId: MOCK_ALERTS[i % MOCK_ALERTS.length].id,
    alertName: MOCK_ALERTS[i % MOCK_ALERTS.length].name,
    vehicleId: v.id,
    vehicleTitle: `${v.marca} ${v.modelo} ${v.versao} ${v.ano}`,
    vehiclePrice: v.preco,
    vehiclePhoto: v.fotos[0],
    vehicleSlug: v.slug,
    matchScore: 75 + Math.floor(Math.random() * 25),
    reason: i % 3 === 0 ? "Preço abaixo da média" : i % 3 === 1 ? "Novo anúncio compatível" : "Queda de preço detectada",
    read: i > 3,
    createdAt: new Date(Date.now() - i * 3600000 * (i + 1)).toISOString(),
  }));
}

/* ──── Main Component ──── */
export default function AlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [notifications, setNotifications] = useState<Notification[]>(generateNotifications);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tab, setTab] = useState("notifications");

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeAlerts = alerts.filter(a => a.active).length;

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const deleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    setNotifications(prev => prev.filter(n => n.alertId !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addAlert = (alert: Alert) => {
    setAlerts(prev => [...prev, alert]);
    setShowCreateDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-3">
                <Zap className="h-4 w-4" /> AlertAI
              </div>
              <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">
                Alertas Inteligentes
              </h1>
              <p className="text-muted-foreground mt-1">
                Receba notificações quando veículos compatíveis aparecerem no Ventoro
              </p>
            </div>
            <div className="flex gap-3">
              <Card className="bg-primary/5 border-primary/20 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-primary font-[family-name:var(--font-mono)]">{activeAlerts}</p>
                <p className="text-xs text-muted-foreground">Alertas Ativos</p>
              </Card>
              <Card className="bg-primary/5 border-primary/20 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-primary font-[family-name:var(--font-mono)]">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Não lidas</p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="notifications" className="gap-1.5">
                <BellRing className="h-4 w-4" /> Notificações
                {unreadCount > 0 && (
                  <Badge className="bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 px-1">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-1.5">
                <Bell className="h-4 w-4" /> Meus Alertas
              </TabsTrigger>
              <TabsTrigger value="matching" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Matching IA
              </TabsTrigger>
            </TabsList>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-1" /> Novo Alerta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" /> Criar Alerta Inteligente
                  </DialogTitle>
                </DialogHeader>
                <CreateAlertForm onSubmit={addAlert} />
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="notifications">
            <NotificationsTab
              notifications={notifications}
              markAsRead={markAsRead}
              markAllRead={markAllRead}
              navigate={navigate}
            />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsTab
              alerts={alerts}
              toggleAlert={toggleAlert}
              deleteAlert={deleteAlert}
            />
          </TabsContent>

          <TabsContent value="matching">
            <MatchingTab alerts={alerts} navigate={navigate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ──── Notifications Tab ──── */
function NotificationsTab({ notifications, markAsRead, markAllRead, navigate }: {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  navigate: (path: string) => void;
}) {
  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  const ReasonIcon = ({ reason }: { reason: string }) => {
    if (reason.includes("Preço")) return <TrendingDown className="h-3.5 w-3.5 text-trust-high" />;
    if (reason.includes("Queda")) return <DollarSign className="h-3.5 w-3.5 text-trust-medium" />;
    return <Star className="h-3.5 w-3.5 text-primary" />;
  };

  const renderNotification = (n: Notification) => (
    <Card
      key={n.id}
      className={`cursor-pointer transition-all hover:shadow-md ${!n.read ? "bg-primary/5 border-primary/20" : ""}`}
      onClick={() => { markAsRead(n.id); navigate(`/veiculo/${n.vehicleSlug}`); }}
    >
      <CardContent className="p-4 flex gap-4">
        <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          <img src={n.vehiclePhoto} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm truncate">{n.vehicleTitle}</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-primary">
                R$ {n.vehiclePrice.toLocaleString("pt-BR")}
              </p>
            </div>
            <Badge variant="outline" className="flex-shrink-0 gap-1 text-[10px]">
              <Sparkles className="h-3 w-3" /> {n.matchScore}% match
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[10px] gap-1">
              <ReasonIcon reason={n.reason} /> {n.reason}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              via "{n.alertName}" • {formatTimeAgo(n.createdAt)}
            </span>
          </div>
        </div>
        {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {unread.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{unread.length} não lida(s)</p>
          <Button variant="ghost" size="sm" onClick={markAllRead}>Marcar todas como lidas</Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <BellRing className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhuma notificação ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Crie alertas para receber notificações de veículos compatíveis</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {unread.map(renderNotification)}
          {read.length > 0 && unread.length > 0 && (
            <p className="text-xs text-muted-foreground pt-2">Lidas anteriormente</p>
          )}
          {read.map(renderNotification)}
        </div>
      )}
    </div>
  );
}

/* ──── Alerts Manager Tab ──── */
function AlertsTab({ alerts, toggleAlert, deleteAlert }: {
  alerts: Alert[]; toggleAlert: (id: string) => void; deleteAlert: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhum alerta criado</p>
            <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro alerta para começar</p>
          </CardContent>
        </Card>
      ) : (
        alerts.map(alert => (
          <Card key={alert.id} className={`transition-all ${!alert.active ? "opacity-60" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{alert.name}</h3>
                    <Badge variant={alert.active ? "default" : "secondary"} className={`text-[10px] ${alert.active ? "bg-primary" : ""}`}>
                      {alert.active ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {alert.marca && <Badge variant="outline" className="text-[10px] gap-1"><Car className="h-3 w-3" />{alert.marca} {alert.modelo}</Badge>}
                    {alert.precoMax && <Badge variant="outline" className="text-[10px] gap-1"><DollarSign className="h-3 w-3" />até R$ {alert.precoMax.toLocaleString("pt-BR")}</Badge>}
                    {alert.anoMin && <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-3 w-3" />{alert.anoMin}+</Badge>}
                    {alert.kmMax && <Badge variant="outline" className="text-[10px] gap-1"><Settings2 className="h-3 w-3" />até {(alert.kmMax / 1000).toFixed(0)}k km</Badge>}
                    {alert.combustivel && <Badge variant="outline" className="text-[10px] gap-1"><Fuel className="h-3 w-3" />{alert.combustivel}</Badge>}
                    {alert.estado && <Badge variant="outline" className="text-[10px] gap-1"><MapPin className="h-3 w-3" />{alert.estado}</Badge>}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>{alert.matchCount} veículos compatíveis</span>
                    <span>Criado em {new Date(alert.createdAt).toLocaleDateString("pt-BR")}</span>
                    <span className="flex items-center gap-1">
                      Notificações: {alert.notifyEmail && "E-mail"}{alert.notifyPush && " • Push"}{alert.notifyWhatsapp && " • WhatsApp"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={alert.active} onCheckedChange={() => toggleAlert(alert.id)} />
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteAlert(alert.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

/* ──── Matching IA Tab ──── */
function MatchingTab({ alerts, navigate }: { alerts: Alert[]; navigate: (path: string) => void }) {
  const activeAlerts = alerts.filter(a => a.active);

  const getMatches = (alert: Alert) => {
    return vehicles.filter(v => {
      if (alert.marca && v.marca !== alert.marca) return false;
      if (alert.modelo && !v.modelo.toLowerCase().includes(alert.modelo.toLowerCase())) return false;
      if (alert.precoMax && v.preco > alert.precoMax) return false;
      if (alert.precoMin && v.preco < alert.precoMin) return false;
      if (alert.anoMin && v.ano < alert.anoMin) return false;
      if (alert.kmMax && v.quilometragem > alert.kmMax) return false;
      if (alert.combustivel && v.combustivel !== alert.combustivel) return false;
      if (alert.estado && v.estado !== alert.estado) return false;
      return true;
    }).map(v => ({
      ...v,
      matchScore: calculateMatchScore(v, alert),
    })).sort((a, b) => b.matchScore - a.matchScore);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-center gap-4">
          <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold">Motor de Matching Inteligente</p>
            <p className="text-sm text-muted-foreground">
              A AlertAI analisa novos anúncios em tempo real e calcula a compatibilidade com seus critérios
            </p>
          </div>
        </CardContent>
      </Card>

      {activeAlerts.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Nenhum alerta ativo</p>
            <p className="text-sm text-muted-foreground mt-1">Ative ou crie alertas para ver o matching</p>
          </CardContent>
        </Card>
      ) : (
        activeAlerts.map(alert => {
          const matches = getMatches(alert);
          return (
            <div key={alert.id}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                {alert.name}
                <Badge variant="outline" className="text-[10px]">{matches.length} resultados</Badge>
              </h3>
              {matches.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6 mb-4">Nenhum veículo compatível no momento</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {matches.slice(0, 4).map(v => (
                    <Card key={v.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate(`/veiculo/${v.slug}`)}>
                      <CardContent className="p-3 flex gap-3">
                        <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          <img src={v.fotos[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{v.marca} {v.modelo} {v.ano}</p>
                          <p className="font-bold font-[family-name:var(--font-mono)] text-primary">
                            R$ {v.preco.toLocaleString("pt-BR")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-[10px] ${
                              (v as any).matchScore >= 90 ? "bg-trust-high text-white" :
                              (v as any).matchScore >= 75 ? "bg-primary text-primary-foreground" :
                              "bg-trust-medium text-white"
                            }`}>
                              <Sparkles className="h-3 w-3 mr-0.5" /> {(v as any).matchScore}% match
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{v.cidade}/{v.estado}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ──── Create Alert Form ──── */
function CreateAlertForm({ onSubmit }: { onSubmit: (alert: Alert) => void }) {
  const [name, setName] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [anoMin, setAnoMin] = useState("");
  const [kmMax, setKmMax] = useState("");
  const [combustivel, setCombustivel] = useState("");
  const [estado, setEstado] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      id: `a${Date.now()}`,
      name: name.trim(),
      marca: marca || undefined,
      modelo: modelo || undefined,
      precoMax: precoMax ? Number(precoMax) : undefined,
      anoMin: anoMin ? Number(anoMin) : undefined,
      kmMax: kmMax ? Number(kmMax) : undefined,
      combustivel: combustivel || undefined,
      estado: estado || undefined,
      active: true,
      createdAt: new Date().toISOString(),
      matchCount: 0,
      notifyEmail, notifyPush, notifyWhatsapp,
      precoMin: undefined, anoMax: undefined, cambio: undefined, cidade: undefined,
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Nome do Alerta *</Label>
        <Input placeholder="Ex: Toyota Corolla até 120k" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Marca</Label>
          <Select value={marca} onValueChange={setMarca}>
            <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>{MARCAS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Modelo</Label>
          <Input placeholder="Ex: Corolla" value={modelo} onChange={e => setModelo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Preço máximo</Label>
          <Input type="number" placeholder="Ex: 120000" value={precoMax} onChange={e => setPrecoMax(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Ano mínimo</Label>
          <Input type="number" placeholder="Ex: 2020" value={anoMin} onChange={e => setAnoMin(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>KM máxima</Label>
          <Input type="number" placeholder="Ex: 60000" value={kmMax} onChange={e => setKmMax(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Combustível</Label>
          <Select value={combustivel} onValueChange={setCombustivel}>
            <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>{COMBUSTIVEIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-semibold">Canais de Notificação</Label>
        <div className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">E-mail</span>
            <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Push (navegador)</span>
            <Switch checked={notifyPush} onCheckedChange={setNotifyPush} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">WhatsApp</span>
            <Switch checked={notifyWhatsapp} onCheckedChange={setNotifyWhatsapp} />
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!name.trim()} className="w-full bg-primary hover:bg-primary/90">
        <Zap className="h-4 w-4 mr-2" /> Criar Alerta
      </Button>
    </div>
  );
}

/* ──── Helpers ──── */
function calculateMatchScore(vehicle: any, alert: Alert): number {
  let score = 60;
  if (alert.marca && vehicle.marca === alert.marca) score += 15;
  if (alert.modelo && vehicle.modelo.toLowerCase().includes(alert.modelo.toLowerCase())) score += 10;
  if (alert.precoMax && vehicle.preco <= alert.precoMax * 0.9) score += 10;
  if (vehicle.score_confianca >= 85) score += 5;
  if (vehicle.preco_status === "abaixo") score += 5;
  if (vehicle.selo_studio_ia) score += 3;
  return Math.min(score, 99);
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}
