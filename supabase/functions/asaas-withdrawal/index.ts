// Saque PIX via Asaas usando dados informados na hora (chave digitada pelo usuário).
// Difere de process-pix-withdrawal (que usa bank_accounts). Aqui usamos withdrawal_id já inserido.
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

const KEY_TYPE_MAP: Record<string, string> = {
  CPF: "CPF", CNPJ: "CNPJ", EMAIL: "EMAIL", PHONE: "PHONE", EVP: "EVP",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const uid = user.id;

    const body = await req.json().catch(() => ({}));
    const { withdrawal_id, amount, pix_key, pix_key_type } = body || {};

    if (!withdrawal_id || !amount || !pix_key || !pix_key_type) {
      return new Response(JSON.stringify({ error: "invalid_payload", message: "Dados de saque incompletos." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const value = Number(amount);
    if (!isFinite(value) || value <= 0) {
      return new Response(JSON.stringify({ error: "invalid_amount", message: "Valor inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Validar saldo via RPC
    const { data: balanceRpc, error: balErr } = await supabaseAdmin.rpc("get_professional_balance", { p_profile_id: uid });
    if (balErr) {
      console.error("balance rpc error:", balErr);
      return new Response(JSON.stringify({ error: "balance_error", message: "Erro ao consultar saldo." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const available = Number(balanceRpc || 0);
    if (value > available) {
      await supabaseAdmin.from("withdrawals").update({
        status: "failed", asaas_status: "FAILED",
      }).eq("id", withdrawal_id).eq("profile_id", uid);
      return new Response(JSON.stringify({ error: "insufficient_balance", message: "Valor maior que o saldo disponível." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const asaasKeyType = KEY_TYPE_MAP[String(pix_key_type).toUpperCase()] || "EVP";

    // 2. Chamar Asaas
    const payload = {
      value,
      operationType: "PIX",
      pixAddressKey: pix_key,
      pixAddressKeyType: asaasKeyType,
      description: `Saque Freelaki - ${uid.slice(0, 8)}`,
    };

    const asaasRes = await fetch(`${ASAAS_BASE_URL}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
      body: JSON.stringify(payload),
    });
    const asaasData = await asaasRes.json();

    if (!asaasRes.ok || asaasData.errors) {
      const asaasDesc = asaasData.errors?.[0]?.description || "Falha na transferência PIX.";
      const asaasCode = asaasData.errors?.[0]?.code || "";
      const isGatewayBalance =
        asaasDesc.toLowerCase().includes("saldo insuficiente") || asaasCode === "invalid_action";

      await supabaseAdmin.from("withdrawals").update({
        status: isGatewayBalance ? "pending" : "failed",
        asaas_status: isGatewayBalance ? "PENDING" : "FAILED",
      }).eq("id", withdrawal_id).eq("profile_id", uid);

      const msg = isGatewayBalance
        ? "Pagamentos temporariamente indisponíveis. Tente novamente em instantes."
        : asaasDesc;
      return new Response(JSON.stringify({ error: "transfer_failed", message: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transferId = asaasData.id || asaasData.transferId || null;

    // 3. Atualizar withdrawal e earnings
    await supabaseAdmin.from("withdrawals").update({
      status: "completed",
      asaas_status: "DONE",
      asaas_transfer_id: transferId,
      processed_at: new Date().toISOString(),
    }).eq("id", withdrawal_id).eq("profile_id", uid);

    // Marca earnings disponíveis até cobrir o valor sacado
    const { data: earnings } = await supabaseAdmin
      .from("earnings")
      .select("id, net_amount")
      .eq("profile_id", uid)
      .eq("status", "available")
      .order("created_at", { ascending: true });

    let remaining = value;
    const toMark: string[] = [];
    for (const e of earnings || []) {
      if (remaining <= 0) break;
      toMark.push(e.id);
      remaining -= Number(e.net_amount);
    }
    if (toMark.length > 0) {
      await supabaseAdmin.from("earnings")
        .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
        .in("id", toMark);
    }

    return new Response(JSON.stringify({
      success: true, transfer_id: transferId, amount: value,
      message: "Pix enviado! Você receberá em instantes.",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("asaas-withdrawal error:", err);
    return new Response(JSON.stringify({ error: "internal_error", message: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
