import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Força o profissional a avaliar clientes de contratos concluídos antes de
 * usar o app. Roda uma vez ao montar e sempre que o usuário trocar de rota
 * (caso pule pelo histórico). Leve: 1 query única por checagem.
 */
const ALLOWED_PREFIXES = [
  "/avaliar",
  "/login",
  "/cadastro",
  "/confirmar-email",
  "/termos",
  "/", // splash
];

export function PendingReviewEnforcer() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const checkingRef = useRef(false);

  useEffect(() => {
    if (loading || !user) return;

    // Não interromper em rotas permitidas
    if (
      pathname.startsWith("/avaliar") ||
      ALLOWED_PREFIXES.some((p) => p === pathname)
    ) {
      return;
    }
    if (checkingRef.current) return;
    checkingRef.current = true;

    (async () => {
      try {
        // Busca contratos concluídos do profissional
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id, opportunity_id, completed_at")
          .eq("professional_id", user.id)
          .eq("status", "completed")
          .not("opportunity_id", "is", null)
          .order("completed_at", { ascending: true })
          .limit(20);

        if (!contracts?.length) return;

        const oppIds = contracts
          .map((c) => c.opportunity_id)
          .filter((x): x is string => !!x);

        // Reviews que o profissional já enviou
        const { data: reviews } = await supabase
          .from("reviews")
          .select("opportunity_id")
          .eq("professional_id", user.id)
          .in("opportunity_id", oppIds);

        const reviewed = new Set((reviews ?? []).map((r) => r.opportunity_id));
        const pending = contracts.find(
          (c) => c.opportunity_id && !reviewed.has(c.opportunity_id)
        );

        if (pending?.opportunity_id) {
          navigate(`/avaliar/${pending.opportunity_id}`, { replace: true });
        }
      } finally {
        checkingRef.current = false;
      }
    })();
  }, [user, loading, pathname, navigate]);

  return null;
}
