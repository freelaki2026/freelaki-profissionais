import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import DocumentosPage from "@/pages/DocumentosPage";
import EnderecoPage from "@/pages/EnderecoPage";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CadastroStep1 from "@/pages/Cadastro";
import CadastroStep2 from "@/pages/CadastroStep2";
import CadastroStep3 from "@/pages/CadastroStep3";
import ProtectedRoute from "@/components/ProtectedRoute";

import Splash from "@/pages/Splash";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import CategoriasPage from "@/pages/CategoriasPage";
import DashboardPage from "@/pages/DashboardPage";
import OportunidadeDetalhePage from "@/pages/OportunidadeDetalhePage";
import OportunidadesPage from "@/pages/OportunidadesPage";
import PerfilPage from "@/pages/PerfilPage";
import DadosPessoaisPage from "@/pages/DadosPessoaisPage";
import DadosBancariosPage from "@/pages/DadosBancariosPage";
import AjudaPage from "@/pages/AjudaPage";
import TermosPage from "@/pages/TermosPage";
import ContratosPage from "@/pages/ContratosPage";
import SuportePage from "@/pages/SuportePage";
import ConfirmarEmailPage from "@/pages/ConfirmarEmailPage";
import { Cadastro } from "@/pages/PlaceholderPages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
