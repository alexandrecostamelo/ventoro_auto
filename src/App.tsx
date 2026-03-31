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

            {/* Dashboard da garagem */}
            <Route path="/painel" element={<GarageDashboardLayout><GarageDashboardHome /></GarageDashboardLayout>} />
            <Route path="/painel/estoque" element={<GarageDashboardLayout><GarageInventory /></GarageDashboardLayout>} />
            <Route path="/painel/leads" element={<GarageDashboardLayout><GarageCRM /></GarageDashboardLayout>} />
            <Route path="/painel/vitrine" element={<GarageDashboardLayout><GarageStorefront /></GarageDashboardLayout>} />
            <Route path="/painel/equipe" element={<GarageDashboardLayout><GarageTeam /></GarageDashboardLayout>} />
            <Route path="/painel/relatorios" element={<GarageDashboardLayout><GarageReports /></GarageDashboardLayout>} />
            <Route path="/painel/planos" element={<GarageDashboardLayout><GaragePlans /></GarageDashboardLayout>} />

            <Route path="/studio" element={<PlaceholderPage title="VenStudio IA" description="Transforme suas fotos em imagens profissionais." />} />
            <Route path="/alertas" element={<PlaceholderPage title="Gerenciador de Alertas" />} />
            <Route path="/favoritos" element={<PlaceholderPage title="Favoritos" />} />
            <Route path="/pedido-de-busca" element={<PlaceholderPage title="Pedido de Busca" description="Não encontrou? Publique seu pedido." />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
