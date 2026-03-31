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
            <Route path="/veiculo/:slug/landing" element={<PlaceholderPage title="Landing Page Inteligente" description="Landing page de vendas dedicada para este veículo." />} />
            <Route path="/garagem/:slug" element={<GarageProfilePage />} />
            <Route path="/comparar" element={<PlaceholderPage title="Comparador de Veículos" description="Compare até 3 veículos lado a lado." />} />
            <Route path="/anunciar" element={<PlaceholderPage title="Anunciar Veículo" description="Fluxo de publicação do seu anúncio com IA." />} />
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/cadastrar" element={<PlaceholderPage title="Criar Conta" description="Crie sua conta no Ventoro." />} />
            <Route path="/minha-conta" element={<PlaceholderPage title="Minha Conta" description="Dashboard do anunciante particular." />} />
            <Route path="/minha-conta/anuncios" element={<PlaceholderPage title="Meus Anúncios" />} />
            <Route path="/minha-conta/leads" element={<PlaceholderPage title="Leads Recebidos" />} />
            <Route path="/minha-conta/metricas" element={<PlaceholderPage title="Métricas" />} />
            <Route path="/painel" element={<PlaceholderPage title="Painel da Garagem" />} />
            <Route path="/painel/estoque" element={<PlaceholderPage title="Gestão de Estoque" />} />
            <Route path="/painel/leads" element={<PlaceholderPage title="CRM de Leads" />} />
            <Route path="/painel/vitrine" element={<PlaceholderPage title="Configuração da Vitrine" />} />
            <Route path="/painel/equipe" element={<PlaceholderPage title="Gestão de Equipe" />} />
            <Route path="/painel/relatorios" element={<PlaceholderPage title="Relatórios" />} />
            <Route path="/painel/planos" element={<PlaceholderPage title="Planos e Cobrança" />} />
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
