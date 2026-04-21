import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/SearchPage";
import VehicleDetailPage from "./pages/VehicleDetailPage";
import VehicleLandingPage from "./pages/VehicleLandingPage";
import GarageProfilePage from "./pages/GarageProfilePage";
import LoginPage from "./pages/LoginPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import ComparePage from "./pages/ComparePage";
import PublishAdPage from "./pages/PublishAdPage";
import VenStudioPage from "./pages/VenStudioPage";
import VenStudioPremiumPage from "./pages/VenStudioPremiumPage";
import InspecaoPage from "./pages/InspecaoPage";
import AlertsPage from "./pages/AlertsPage";
import FavoritesPage from "./pages/FavoritesPage";
import SearchRequestPage from "./pages/SearchRequestPage";
import NotificacoesPage from "./pages/NotificacoesPage";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import DashboardAds from "./pages/dashboard/DashboardAds";
import DashboardLeads from "./pages/dashboard/DashboardLeads";
import DashboardMetrics from "./pages/dashboard/DashboardMetrics";
import GarageDashboardLayout from "./components/dashboard/GarageDashboardLayout";
import GarageDashboardHome from "./pages/garage/GarageDashboardHome";
import GarageInventory from "./pages/garage/GarageInventory";
import GarageCRM from "./pages/garage/GarageCRM";
import GarageStorefront from "./pages/garage/GarageStorefront";
import GarageTeam from "./pages/garage/GarageTeam";
import GarageReports from "./pages/garage/GarageReports";
import GaragePlans from "./pages/garage/GaragePlans";
import GarageMarketing from "./pages/garage/GarageMarketing";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminGaragens from "./pages/admin/AdminGaragens";
import AdminAssinaturas from "./pages/admin/AdminAssinaturas";
import AdminFinanceiro from "./pages/admin/AdminFinanceiro";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/buscar" element={<SearchPage />} />
            <Route path="/veiculo/:slug" element={<VehicleDetailPage />} />
            <Route path="/veiculo/:slug/landing" element={<VehicleLandingPage />} />
            <Route path="/garagem/:slug" element={<GarageProfilePage />} />
            <Route path="/comparar" element={<ComparePage />} />
            <Route path="/anunciar" element={<PublishAdPage />} />
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/cadastrar" element={<PlaceholderPage title="Criar Conta" description="Crie sua conta no Ventoro." />} />

            {/* Dashboard do anunciante particular */}
            <Route path="/minha-conta" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
            <Route path="/minha-conta/anuncios" element={<DashboardLayout><DashboardAds /></DashboardLayout>} />
            <Route path="/minha-conta/leads" element={<DashboardLayout><DashboardLeads /></DashboardLayout>} />
            <Route path="/minha-conta/metricas" element={<DashboardLayout><DashboardMetrics /></DashboardLayout>} />
            <Route path="/minha-conta/configuracoes" element={<DashboardLayout><PlaceholderPage title="Configurações" description="Gerencie suas preferências e dados da conta." /></DashboardLayout>} />

            {/* Dashboard da garagem */}
            <Route path="/painel" element={<GarageDashboardLayout><GarageDashboardHome /></GarageDashboardLayout>} />
            <Route path="/painel/estoque" element={<GarageDashboardLayout><GarageInventory /></GarageDashboardLayout>} />
            <Route path="/painel/leads" element={<GarageDashboardLayout><GarageCRM /></GarageDashboardLayout>} />
            <Route path="/painel/vitrine" element={<GarageDashboardLayout><GarageStorefront /></GarageDashboardLayout>} />
            <Route path="/painel/equipe" element={<GarageDashboardLayout><GarageTeam /></GarageDashboardLayout>} />
            <Route path="/painel/marketing" element={<GarageDashboardLayout><GarageMarketing /></GarageDashboardLayout>} />
            <Route path="/painel/relatorios" element={<GarageDashboardLayout><GarageReports /></GarageDashboardLayout>} />
            <Route path="/painel/planos" element={<GarageDashboardLayout><GaragePlans /></GarageDashboardLayout>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/usuarios" element={<AdminLayout><AdminUsuarios /></AdminLayout>} />
            <Route path="/admin/garagens" element={<AdminLayout><AdminGaragens /></AdminLayout>} />
            <Route path="/admin/assinaturas" element={<AdminLayout><AdminAssinaturas /></AdminLayout>} />
            <Route path="/admin/financeiro" element={<AdminLayout><AdminFinanceiro /></AdminLayout>} />
            <Route path="/admin/logs" element={<AdminLayout><AdminLogs /></AdminLayout>} />
            <Route path="/admin/configuracoes" element={<AdminLayout><AdminConfiguracoes /></AdminLayout>} />

            <Route path="/studio" element={<VenStudioPage />} />
            <Route path="/studio-pro" element={<VenStudioPremiumPage />} />
            <Route path="/inspecionar/:slug" element={<InspecaoPage />} />
            <Route path="/alertas" element={<AlertsPage />} />
            <Route path="/favoritos" element={<FavoritesPage />} />
            <Route path="/notificacoes" element={<NotificacoesPage />} />
            <Route path="/pedido-de-busca" element={<SearchRequestPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
