// Webhook de "Mecanismo de Validação de Saques" do Asaas.
// Recebe POST do Asaas ~5s após cada criação de transferência e responde
// { status: "APPROVED" } ou { status: "REFUSED", refuseReason: "..." }.
//
// Configurar no Asaas: Menu do usuário > Integrações > Mecanismos de segurança
// URL: https://chkeoqugdcciojzmuczr.supabase.co/functions/v1/asaas-transfer-authorization
// Token (opcional, recomendado): definir secret ASAAS_WEBHOOK_TOKEN — Asaas envia em "asaas-access-token".
//
// IMPORTANTE: esta função precisa ser pública (sem JWT). Já está configurada como verify_jwt = false.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, asaas-access-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPECTED_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "";

function approve() {
  return new Response(JSON.stringify({ status: "APPROVED" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function refuse(reason: string) {
  console.warn("[asaas-transfer-authorization] REFUSED:", reason);
  return new Response(
    JSON.stringify({ status: "REFUSED", refuseReason: reason }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Validação opcional de token
    if (EXPECTED_TOKEN) {
      const incoming = req.headers.get("asaas-access-token") || "";
      if (incoming !== EXPECTED_TOKEN) {
        console.warn("[asaas-transfer-authorization] token inválido");
        return refuse("Token de acesso inválido.");
      }
    }

    const payload = await req.json().catch(() => ({}));
    console.log(
      "[asaas-transfer-authorization] payload:",
      JSON.stringify(payload).slice(0, 1000)
    );

    const type = payload?.type;

    // Só lidamos com transferências (saques PIX/TED). Demais tipos aprovamos.
    if (type !== "TRANSFER") {
      console.log("[asaas-transfer-authorization] tipo não-TRANSFER, aprovando:", type);
      return approve();
    }

    const transfer = payload?.transfer || {};
    const transferId: string | undefined = transfer.id;
    const value = Number(transfer.value);
    const operationType: string | undefined = transfer.operationType;
    const pixKey: string | undefined = transfer.bankAccount?.pixAddressKey || undefined;

    if (!transferId) {
      return refuse("Transferência sem ID.");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Buscar pelo asaas_transfer_id (caminho feliz)
    let { data: withdrawal } = await supabase
      .from("asaas_withdrawals")
      .select("id, amount, status, pix_key, profile_id, requested_at, asaas_transfer_id")
      .eq("asaas_transfer_id", transferId)
      .maybeSingle();

    // 2) Fallback: registros recém-criados que ainda não persistiram o transfer_id
    //    (Asaas chama o webhook ~5s após criar; a coluna pode não ter sido salva ainda).
    if (!withdrawal) {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // últimos 10min
      const { data: candidates } = await supabase
        .from("asaas_withdrawals")
        .select("id, amount, status, pix_key, profile_id, requested_at, asaas_transfer_id")
        .in("status", ["processing", "pending"])
        .gte("requested_at", since)
        .order("requested_at", { ascending: false })
        .limit: 20 as any; // tolera shape inesperado

      const list = Array.isArray(candidates) ? candidates : [];
      withdrawal =
        list.find(
          (w: any) => Number(w.amount) === value && (!pixKey || w.pix_key === pixKey)
        ) || list.find((w: any) => Number(w.amount) === value) || null;
    }

    if (!withdrawal) {
      return refuse("Transferência não encontrada no banco do parceiro.");
    }

    // Valida valor
    if (Number(withdrawal.amount) !== value) {
      return refuse(
        `Valor divergente. Esperado R$ ${withdrawal.amount}, recebido R$ ${value}.`
      );
    }

    // Aprova somente saques que estão em processamento ou pendentes
    if (!["processing", "pending"].includes(String(withdrawal.status))) {
      return refuse(`Status inválido para autorização: ${withdrawal.status}.`);
    }

    // Garante que asaas_transfer_id fica salvo
    if (!withdrawal.asaas_transfer_id) {
      await supabase
        .from("asaas_withdrawals")
        .update({ asaas_transfer_id: transferId })
        .eq("id", withdrawal.id);
    }

    console.log("[asaas-transfer-authorization] APROVADO", {
      withdrawal_id: withdrawal.id,
      transferId,
      value,
      operationType,
    });

    return approve();
  } catch (err) {
    console.error("[asaas-transfer-authorization] erro:", err);
    // Em caso de erro interno, RECUSAR é mais seguro que aprovar uma transferência desconhecida.
    return refuse("Erro interno ao validar transferência.");
  }
});
