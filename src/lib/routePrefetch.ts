// Mapa de rotas -> loader do chunk lazy.
// Mantemos as funções aqui para que o App.tsx e os links de navegação
// usem o MESMO import (assim o Vite/Rollup cacheia o módulo após prefetch).

type Loader = () => Promise<unknown>;

export const routeLoaders: Record<string, Loader> = {
  "/dashboard": () => import("@/pages/DashboardPage"),
  "/oportunidades": () => import("@/pages/OportunidadesPage"),
  "/menu": () => import("@/pages/MenuPage"),
  "/mapa": () => import("@/pages/MapaPage"),
  "/mensagens": () => import("@/pages/MensagensPage"),
  "/ganhos": () => import("@/pages/GanhosPage"),
  "/financeiro": () => import("@/pages/FinanceiroPage"),
  "/contratos": () => import("@/pages/ContratosPage"),
  "/perfil": () => import("@/pages/PerfilPage"),
  "/perfil-publico": () => import("@/pages/PerfilPublicoPage"),
  "/documentos": () => import("@/pages/DocumentosPage"),
  "/endereco": () => import("@/pages/EnderecoPage"),
  "/dados-pessoais": () => import("@/pages/DadosPessoaisPage"),
  "/dados-bancarios": () => import("@/pages/DadosBancariosPage"),
  "/ajuda": () => import("@/pages/AjudaPage"),
  "/suporte": () => import("@/pages/SuportePage"),
  "/categorias": () => import("@/pages/CategoriasPage"),
  "/meus-servicos": () => import("@/pages/MeusServicosPage"),
  "/equipamentos": () => import("@/pages/EquipamentosPage"),
  "/agenda": () => import("@/pages/AgendaPage"),
  "/termos": () => import("@/pages/TermosPage"),
};

const prefetched = new Set<string>();

/** Dispara o download do chunk da rota (no-op se já carregado). */
export function prefetchRoute(path: string) {
  // Normaliza dynamic params (ex: /oportunidade/:id -> ignora)
  const key = Object.keys(routeLoaders).find(
    (p) => p === path || path.startsWith(p + "/"),
  );
  if (!key || prefetched.has(key)) return;
  prefetched.add(key);
  // Best-effort, sem await; falhas são silenciosas (rede ruim, etc).
  routeLoaders[key]().catch(() => prefetched.delete(key));
}

/** Pré-carrega rotas críticas quando o navegador estiver ocioso. */
export function prefetchCriticalRoutesOnIdle(paths: string[]) {
  const run = () => paths.forEach(prefetchRoute);
  if (typeof window === "undefined") return;
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (ric) ric(run, { timeout: 2000 });
  else setTimeout(run, 1500);
}
