// Webhook do Asaas. Processa eventos PAYMENT_CONFIRMED / PAYMENT_RECEIVED.
// - Marca o aditivo como pago (paid_at, asaas_payment_status, status='paid')
// - Notifica profissional + cliente
// Idempotente: usa asaas_webhooks (event,payment_id) para deduplicar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || ""; // opcional

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  }

  // Validação opcional do token configurado no painel Asaas
  if (WEBHOOK_TOKEN) {
    const sent = req.headers.get("asaas-access-token") || "";
    if (sent !== WEBHOOK_TOKEN) {
      return new Response("unauthorized", { status: 401, headers: corsHeaders });
    }
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid_json", { status: 400, headers: corsHeaders });
  }

  const event: string = payload?.event || "";
  const payment = payload?.payment || {};
  const paymentId: string = payment?.id || "";

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Log + dedupe
  await admin.from("asaas_webhooks").insert({
    event,
    payment_id: paymentId,
    status: payment?.status || null,
    raw_payload: payload,
    processed_at: new Date().toISOString(),
  });

  if (!paymentId) {
    return new Response(JSON.stringify({ ok: true, ignored: "no_payment_id" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Procurar aditivo associado a esse payment
    const { data: addendum } = await admin
      .from("contract_addendums")
      .select("id, contract_id, opportunity_id, total_amount, status, paid_at")
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (addendum) {
      const isPaidEvent = event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";
      const isFailEvent = event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED";

      if (isPaidEvent && !addendum.paid_at) {
        await admin
          .from("contract_addendums")
          .update({
            paid_at: new Date().toISOString(),
            asaas_payment_status: payment.status || "CONFIRMED",
            status: "paid",
          })
          .eq("id", addendum.id);

        // Notificar partes
        const { data: contract } = await admin
          .from("contracts")
          .select("client_id, professional_id, opportunity_id")
          .eq("id", addendum.contract_id)
          .maybeSingle();

        if (contract) {
          const valor = Number(addendum.total_amount).toFixed(2).replace(".", ",");
          const url = `/chamado/${contract.opportunity_id}`;
          await admin.from("notifications").insert([
            {
              profile_id: contract.professional_id,
              type: "contrato",
              title: "💰 Aditivo pago",
              body: `O cliente pagou o aditivo de R$ ${valor}.`,
              action_url: url,
            },
            {
              profile_id: contract.client_id,
              type: "contrato",
              title: "✅ Pagamento do aditivo confirmado",
              body: `Pagamento de R$ ${valor} confirmado. Você já pode contratar novos serviços.`,
              action_url: url,
            },
          ]);
        }
      } else if (isFailEvent) {
        await admin
          .from("contract_addendums")
          .update({ asaas_payment_status: payment.status || event })
          .eq("id", addendum.id);
      } else {
        await admin
          .from("contract_addendums")
          .update({ asaas_payment_status: payment.status || event })
          .eq("id", addendum.id);
      }
    }

    // (Espaço reservado para tratar pagamentos da cobrança PRINCIPAL do contrato — fora deste escopo)
  } catch (e) {
    console.error("[asaas-webhook] error", e);
    // Asaas reentrega em caso de 5xx
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
