import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";

// Eager: rotas de boot (splash + auth) — leves e iniciais
import Splash from "@/pages/Splash";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Lazy: tudo o resto carrega sob demanda
const CadastroStep1 = lazy(() => import("@/pages/Cadastro"));
const CadastroStep2 = lazy(() => import("@/pages/CadastroStep2"));
const CadastroStep3 = lazy(() => import("@/pages/CadastroStep3"));
const CategoriasPage = lazy(() => import("@/pages/CategoriasPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const OportunidadeDetalhePage = lazy(() => import("@/pages/OportunidadeDetalhePage"));
const OportunidadesPage = lazy(() => import("@/pages/OportunidadesPage"));
const PerfilPage = lazy(() => import("@/pages/PerfilPage"));
const DocumentosPage = lazy(() => import("@/pages/DocumentosPage"));
const EnderecoPage = lazy(() => import("@/pages/EnderecoPage"));
const DadosPessoaisPage = lazy(() => import("@/pages/DadosPessoaisPage"));
const DadosBancariosPage = lazy(() => import("@/pages/DadosBancariosPage"));
const AjudaPage = lazy(() => import("@/pages/AjudaPage"));
const TermosPage = lazy(() => import("@/pages/TermosPage"));
const ContratosPage = lazy(() => import("@/pages/ContratosPage"));
const SuportePage = lazy(() => import("@/pages/SuportePage"));
const ConfirmarEmailPage = lazy(() => import("@/pages/ConfirmarEmailPage"));
const MensagensPage = lazy(() => import("@/pages/MensagensPage"));
const ChatClientePage = lazy(() => import("@/pages/ChatClientePage"));
const GanhosPage = lazy(() => import("@/pages/GanhosPage"));
const MeusServicosPage = lazy(() => import("@/pages/MeusServicosPage"));
const EquipamentosPage = lazy(() => import("@/pages/EquipamentosPage"));
const MenuPage = lazy(() => import("@/pages/MenuPage"));
const PerfilPublicoPage = lazy(() => import("@/pages/PerfilPublicoPage"));
const PerfilClientePage = lazy(() => import("@/pages/PerfilClientePage"));
const AgendaPage = lazy(() => import("@/pages/AgendaPage"));
const MapaPage = lazy(() => import("@/pages/MapaPage"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<CadastroStep1 />} />
            <Route path="/cadastro/etapa2" element={<CadastroStep2 />} />
            <Route path="/cadastro/etapa3" element={<CadastroStep3 />} />
            <Route path="/termos" element={<TermosPage />} />
            <Route path="/confirmar-email" element={<ConfirmarEmailPage />} />
            <Route path="/categorias" element={<ProtectedRoute><CategoriasPage /></ProtectedRoute>} />

            {/* Rotas protegidas */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/oportunidades" element={<ProtectedRoute><OportunidadesPage /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><PerfilPage /></ProtectedRoute>} />
            <Route path="/documentos" element={<ProtectedRoute><DocumentosPage /></ProtectedRoute>} />
            <Route path="/endereco" element={<ProtectedRoute><EnderecoPage /></ProtectedRoute>} />
            <Route path="/dados-pessoais" element={<ProtectedRoute><DadosPessoaisPage /></ProtectedRoute>} />
            <Route path="/dados-bancarios" element={<ProtectedRoute><DadosBancariosPage /></ProtectedRoute>} />
            <Route path="/ajuda" element={<ProtectedRoute><AjudaPage /></ProtectedRoute>} />
            <Route path="/contratos" element={<ProtectedRoute><ContratosPage /></ProtectedRoute>} />
            <Route path="/suporte" element={<ProtectedRoute><SuportePage /></ProtectedRoute>} />
            <Route path="/oportunidade/:id" element={<ProtectedRoute><OportunidadeDetalhePage /></ProtectedRoute>} />
            <Route path="/ganhos" element={<ProtectedRoute><GanhosPage /></ProtectedRoute>} />
            <Route path="/meus-servicos" element={<ProtectedRoute><MeusServicosPage /></ProtectedRoute>} />
            <Route path="/equipamentos" element={<ProtectedRoute><EquipamentosPage /></ProtectedRoute>} />
            <Route path="/mensagens" element={<ProtectedRoute><MensagensPage /></ProtectedRoute>} />
            <Route path="/mensagens/:id" element={<ProtectedRoute><ChatClientePage /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
            <Route path="/perfil-publico" element={<ProtectedRoute><PerfilPublicoPage /></ProtectedRoute>} />
            <Route path="/perfil-cliente/:id" element={<ProtectedRoute><PerfilClientePage /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
            <Route path="/mapa" element={<ProtectedRoute><MapaPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
