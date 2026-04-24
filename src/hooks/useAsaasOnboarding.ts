import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Garante de forma transparente que o profissional tenha uma subconta Asaas.
 * - Roda uma vez por sessão de usuário (deduplicado por uid via ref).
 * - Não bloqueia UI: erros são apenas logados; mensagem persiste em profiles.asaas_error.
 * - Reexecuta no próximo login se asaas_account_id continuar vazio.
 */
export function useAsaasOnboarding() {
  const { user } = useAuth();
  const ranForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (ranForRef.current === user.id) return;
    ranForRef.current = user.id;

    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("asaas_account_id, full_name, cpf_cnpj, phone, birth_date")
          .eq("id", user.id)
          .maybeSingle();

        // Já tem subconta — nada a fazer
        if (profile?.asaas_account_id) return;

        // Sem dados mínimos — esperar usuário completar dados pessoais
        if (!profile?.full_name || !profile?.cpf_cnpj || !profile?.phone || !(profile as any)?.birth_date) return;

        const { error } = await supabase.functions.invoke("asaas-create-account", { body: {} });
        if (error) {
          // Silencioso: erro fica em profiles.asaas_error (gravado pela edge function)
          console.warn("[asaas onboarding] falhou:", error.message);
        }
      } catch (err) {
        console.warn("[asaas onboarding] exceção:", err);
      }
    })();
  }, [user]);
}
