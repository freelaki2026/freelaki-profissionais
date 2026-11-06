import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { routeLoaders, prefetchCriticalRoutesOnIdle } from "@/lib/routePrefetch";
import { ViewTransitionsBridge } from "@/lib/viewTransitions";
import { ContractCompletionOverlay } from "@/hooks/useContractCompletionCelebration";
import { PendingReviewEnforcer } from "@/hooks/usePendingReviewEnforcer";
import { useCapacitorBootstrap } from "@/hooks/useCapacitorBootstrap";

// Eager: rotas de boot (splash + auth) — leves e iniciais
import Splash from "@/pages/Splash";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import BoasVindasPage from "@/pages/BoasVindasPage";

// Lazy: usa o MESMO loader do routePrefetch (chunk reaproveitado após hover/touchstart).
const CadastroStep1 = lazy(() => import("@/pages/Cadastro"));
const PrivacidadePage = lazy(() => import("@/pages/PrivacidadePage"));
const CadastroStep2 = lazy(() => import("@/pages/CadastroStep2"));
const CadastroStep3 = lazy(() => import("@/pages/CadastroStep3"));
const ConfirmarEmailPage = lazy(() => import("@/pages/ConfirmarEmailPage"));
const OportunidadeDetalhePage = lazy(() => import("@/pages/OportunidadeDetalhePage"));
const ChatClientePage = lazy(() => import("@/pages/ChatClientePage"));
const ChatClienteUnificadoPage = lazy(() => import("@/pages/ChatClienteUnificadoPage"));
const PerfilClientePage = lazy(() => import("@/pages/PerfilClientePage"));
const PreCadastroPage = lazy(() => import("@/pages/PreCadastroPage"));
const ConvitePage = lazy(() => import("@/pages/ConvitePage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));

// Helper para tipar lazy() a partir do mapa de loaders.
const lazyFromMap = (path: string) =>
  lazy(routeLoaders[path] as () => Promise<{ default: React.ComponentType }>);

const CategoriasPage = lazyFromMap("/categorias");
const DashboardPage = lazyFromMap("/dashboard");
const OportunidadesPage = lazyFromMap("/oportunidades");
const PerfilPage = lazyFromMap("/perfil");
const DocumentosPage = lazyFromMap("/documentos");
const EnderecoPage = lazyFromMap("/endereco");
const DadosPessoaisPage = lazyFromMap("/dados-pessoais");
const DadosBancariosPage = lazyFromMap("/dados-bancarios");
const AjudaPage = lazyFromMap("/ajuda");
const TermosPage = lazyFromMap("/termos");
const ContratosPage = lazyFromMap("/contratos");
const SuportePage = lazyFromMap("/suporte");
const MensagensPage = lazyFromMap("/mensagens");
const GanhosPage = lazyFromMap("/ganhos");
const FinanceiroPage = lazyFromMap("/financeiro");
const MeusServicosPage = lazyFromMap("/meus-servicos");
const EquipamentosPage = lazyFromMap("/equipamentos");
const MenuPage = lazyFromMap("/menu");
const PerfilPublicoPage = lazyFromMap("/perfil-publico");
const AgendaPage = lazyFromMap("/agenda");
const MapaPage = lazyFromMap("/mapa");
const AvaliarClientePage = lazy(() => import("@/pages/AvaliarClientePage"));
const ContaEmExclusaoPage = lazy(() => import("@/pages/ContaEmExclusaoPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — dados ficam "frescos" e evitam refetch ao trocar de tela
      gcTime: 5 * 60_000, // 5min de cache em memória
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Pré-carrega rotas críticas no idle assim que o usuário entra em qualquer tela protegida. */
const RoutePrefetcher = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === "/" || pathname === "/login") return;
    prefetchCriticalRoutesOnIdle([
      "/dashboard",
      "/oportunidades",
      "/menu",
      "/mapa",
      "/mensagens",
    ]);
  }, [pathname]);
  return null;
};

/** Redireciona automaticamente para /reset-password quando o Supabase emite PASSWORD_RECOVERY. */
const PasswordRecoveryRedirect = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && pathname !== "/reset-password") {
        navigate("/reset-password", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, pathname]);
  return null;
};

const App = () => {
  useCapacitorBootstrap();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoutePrefetcher />
        <PasswordRecoveryRedirect />
        <ViewTransitionsBridge />
        <ContractCompletionOverlay />
        <PendingReviewEnforcer />
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<BoasVindasPage />} />
            <Route path="/splash" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pre-cadastro" element={<PreCadastroPage />} />
            <Route path="/convite" element={<ConvitePage />} />
            <Route path="/cadastro" element={<CadastroStep1 />} />
            <Route path="/cadastro/etapa2" element={<CadastroStep2 />} />
            <Route path="/cadastro/etapa3" element={<CadastroStep3 />} />
            <Route path="/termos" element={<TermosPage />} />
            <Route path="/privacidade" element={<PrivacidadePage />} />
            <Route path="/confirmar-email" element={<ConfirmarEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
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
            <Route path="/financeiro" element={<ProtectedRoute><FinanceiroPage /></ProtectedRoute>} />
            <Route path="/meus-servicos" element={<ProtectedRoute><MeusServicosPage /></ProtectedRoute>} />
            <Route path="/equipamentos" element={<ProtectedRoute><EquipamentosPage /></ProtectedRoute>} />
            <Route path="/mensagens" element={<ProtectedRoute><MensagensPage /></ProtectedRoute>} />
            <Route path="/mensagens/cliente/:clientId" element={<ProtectedRoute><ChatClienteUnificadoPage /></ProtectedRoute>} />
            <Route path="/mensagens/:id" element={<ProtectedRoute><ChatClientePage /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
            <Route path="/perfil-publico" element={<ProtectedRoute><PerfilPublicoPage /></ProtectedRoute>} />
            <Route path="/perfil-cliente/:id" element={<ProtectedRoute><PerfilClientePage /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
            <Route path="/mapa" element={<ProtectedRoute><MapaPage /></ProtectedRoute>} />
            <Route path="/avaliar/:id" element={<ProtectedRoute><AvaliarClientePage /></ProtectedRoute>} />
            <Route path="/conta-em-exclusao" element={<ProtectedRoute><ContaEmExclusaoPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
