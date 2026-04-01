import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CadastroStep1 from "@/pages/Cadastro";
import CadastroStep2 from "@/pages/CadastroStep2";
import ProtectedRoute from "@/components/ProtectedRoute";

import Splash from "@/pages/Splash";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import {
  Cadastro,
  Termos,
  Categorias,
  Dashboard,
  Perfil,
  Documentos,
  Endereco,
  DadosPessoais,
  DadosBancarios,
  Ajuda,
  Contratos,
  Suporte,
  OportunidadeDetalhe,
} from "@/pages/PlaceholderPages";

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
          <Route path="/termos" element={<Termos />} />
          <Route path="/categorias" element={<Categorias />} />

          {/* Rotas protegidas */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
          <Route path="/endereco" element={<ProtectedRoute><Endereco /></ProtectedRoute>} />
          <Route path="/dados-pessoais" element={<ProtectedRoute><DadosPessoais /></ProtectedRoute>} />
          <Route path="/dados-bancarios" element={<ProtectedRoute><DadosBancarios /></ProtectedRoute>} />
          <Route path="/ajuda" element={<ProtectedRoute><Ajuda /></ProtectedRoute>} />
          <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
          <Route path="/suporte" element={<ProtectedRoute><Suporte /></ProtectedRoute>} />
          <Route path="/oportunidade/:id" element={<ProtectedRoute><OportunidadeDetalhe /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
