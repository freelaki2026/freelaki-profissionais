import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Habilita a View Transitions API entre mudanças de rota.
 * - Em browsers que suportam (Chrome/Edge/Safari TP): cross-fade suave de 180ms.
 * - Em browsers sem suporte: silenciosamente vira no-op (sem custo).
 *
 * Não interfere em rotas com lógica complexa porque só envolve o `document`.
 */
export function useViewTransitions() {
  const location = useLocation();
  const navType = useNavigationType();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void | Promise<void>) => unknown;
    };
    if (!doc.startViewTransition) {
      prevPathRef.current = location.pathname;
      return;
    }
    if (prevPathRef.current === location.pathname) return;

    // POP (botão voltar) usa direção reversa — opcional, browser cuida visualmente.
    void navType;
    // Dispara a transição já com o DOM atualizado (React já renderizou).
    // Aqui só "marca" o frame para o browser animar.
    doc.startViewTransition(() => Promise.resolve());

    prevPathRef.current = location.pathname;
  }, [location.pathname, navType]);
}

/** Componente null-render que ativa o hook. Coloque dentro do <BrowserRouter>. */
export const ViewTransitionsBridge = () => {
  useViewTransitions();
  return null;
};

export default ViewTransitionsBridge;
