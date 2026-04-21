// Gera cobrança PIX no Asaas para um aditivo já APROVADO cuja cobrança original
// já foi confirmada (merged_with_original = false). Idempotente: se já tiver
// asaas_payment_id, retorna o QR code existente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE_URL = ASAAS_API_KEY?.startsWith("$aact_")
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const onlyDigits = (v: string | null | undefined) => (v || "").replace(/\D/g, "");

async function asaas(path: string, init: RequestInit = {}) {
  const r = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY,
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!r.ok) {
    throw new Error(`asaas ${path} ${r.status}: ${text}`);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const addendumId: string | undefined = body?.addendum_id;
    if (!addendumId) {
      return new Response(JSON.stringify({ error: "missing_addendum_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Buscar aditivo + contrato
    const { data: addendum } = await supabaseAdmin
      .from("contract_addendums")
      .select("id, contract_id, status, total_amount, merged_with_original, asaas_payment_id, asaas_payment_status, paid_at")
      .eq("id", addendumId)
      .maybeSingle();

    if (!addendum) {
      return new Response(JSON.stringify({ error: "addendum_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (addendum.status !== "accepted") {
      return new Response(JSON.stringify({ error: "addendum_not_accepted" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (addendum.merged_with_original) {
      return new Response(JSON.stringify({ error: "merged_with_original", message: "Este aditivo será cobrado junto com a fatura original." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (addendum.paid_at) {
      return new Response(JSON.stringify({ error: "already_paid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("id, client_id, opportunity_id")
      .eq("id", addendum.contract_id)
      .maybeSingle();

    if (!contract) {
      return new Response(JSON.stringify({ error: "contract_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apenas o cliente do contrato pode gerar/consultar a cobrança
    if (contract.client_id !== user.id) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Idempotência: se já tem payment_id, apenas retorna o QR atual
    if (addendum.asaas_payment_id) {
      const pix = await asaas(`/payments/${addendum.asaas_payment_id}/pixQrCode`);
      return new Response(JSON.stringify({
        success: true,
        addendum_id: addendum.id,
        asaas_payment_id: addendum.asaas_payment_id,
        already_exists: true,
        pix_qr_code: pix?.encodedImage || null,
        pix_payload: pix?.payload || null,
        expires_at: pix?.expirationDate || null,
        amount: Number(addendum.total_amount),
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Buscar cliente / garantir asaas_customer_id
    const { data: client } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, cpf_cnpj, phone, asaas_customer_id")
      .eq("id", contract.client_id)
      .maybeSingle();

    if (!client) {
      return new Response(JSON.stringify({ error: "client_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerId = client.asaas_customer_id;
    if (!customerId) {
      const created = await asaas(`/customers`, {
        method: "POST",
        body: JSON.stringify({
          name: client.full_name || client.email,
          email: client.email,
          cpfCnpj: onlyDigits(client.cpf_cnpj),
          mobilePhone: onlyDigits(client.phone) || undefined,
        }),
      });
      customerId = created?.id;
      if (customerId) {
        await supabaseAdmin
          .from("profiles")
          .update({ asaas_customer_id: customerId })
          .eq("id", client.id);
      }
    }

    if (!customerId) {
      return new Response(JSON.stringify({ error: "customer_create_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Criar cobrança PIX (vencimento +3 dias)
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const dueDate = due.toISOString().slice(0, 10);

    const payment = await asaas(`/payments`, {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: Number(addendum.total_amount),
        dueDate,
        description: `Aditivo de contrato Freelaki #${String(addendum.id).slice(0, 8)}`,
        externalReference: `addendum:${addendum.id}`,
      }),
    });

    const paymentId = payment?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "payment_create_failed", detail: payment }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Buscar QR PIX
    const pix = await asaas(`/payments/${paymentId}/pixQrCode`);

    // 6. Salvar no aditivo
    await supabaseAdmin
      .from("contract_addendums")
      .update({
        asaas_payment_id: paymentId,
        asaas_payment_status: "PENDING",
        payment_method: "PIX",
      })
      .eq("id", addendum.id);

    // 7. Notificar cliente que o PIX foi gerado
    await supabaseAdmin.from("notifications").insert({
      profile_id: client.id,
      type: "contrato",
      title: "💳 PIX do aditivo gerado",
      body: `Pague R$ ${Number(addendum.total_amount).toFixed(2).replace(".", ",")} via PIX para liberar a continuidade do serviço.`,
      action_url: `/chamado/${contract.opportunity_id}`,
    });

    return new Response(JSON.stringify({
      success: true,
      addendum_id: addendum.id,
      asaas_payment_id: paymentId,
      pix_qr_code: pix?.encodedImage || null,
      pix_payload: pix?.payload || null,
      expires_at: pix?.expirationDate || null,
      amount: Number(addendum.total_amount),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[asaas-charge-addendum] error", e);
    return new Response(JSON.stringify({ error: "internal_error", message: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
