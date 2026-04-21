// Processa saque PIX via Asaas. Recebe withdrawal_id já inserido em asaas_withdrawals.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE_URL = ASAAS_API_KEY?.startsWith("$aact_prod")
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const KEY_TYPE_MAP: Record<string, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  TELEFONE: "PHONE",
  EVP: "EVP",
  ALEATORIA: "EVP",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const uid = user.id;

    const body = await req.json().catch(() => ({}));
    const { withdrawal_id, amount, profile_id } = body || {};

    if (!withdrawal_id || !amount) {
      return new Response(
        JSON.stringify({ error: "invalid_payload", message: "Dados de saque incompletos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile_id && profile_id !== uid) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Profile não corresponde ao usuário." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const value = Number(amount);
    if (!isFinite(value) || value <= 0) {
      return new Response(
        JSON.stringify({ error: "invalid_amount", message: "Valor inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Carregar saque registrado
    const { data: withdrawal, error: wErr } = await supabaseAdmin
      .from("asaas_withdrawals")
      .select("*")
      .eq("id", withdrawal_id)
      .eq("profile_id", uid)
      .maybeSingle();

    if (wErr || !withdrawal) {
      return new Response(
        JSON.stringify({ error: "withdrawal_not_found", message: "Saque não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (withdrawal.status === "completed" || withdrawal.status === "processing") {
      return new Response(
        JSON.stringify({ error: "already_processed", message: "Saque já processado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validar saldo disponível somando earnings - saques pendentes/concluídos em asaas_withdrawals
    const { data: earningsRows } = await supabaseAdmin
      .from("earnings")
      .select("net_amount, status")
      .eq("profile_id", uid)
      .in("status", ["available", "withdrawn"]);

    const totalEarned = (earningsRows || []).reduce(
      (sum, e: any) => sum + Number(e.net_amount || 0),
      0
    );

    // Considera reservado apenas o que está efetivamente sendo processado ou já pago.
    // Saques "pending" são apenas registros aguardando esta função processar — não devem
    // ser contados como reserva (senão tentativas anteriores órfãs bloqueiam novos saques).
    const { data: prevWithdrawals } = await supabaseAdmin
      .from("asaas_withdrawals")
      .select("amount, status")
      .eq("profile_id", uid)
      .in("status", ["processing", "completed"]);

    const totalReservedOrPaid = (prevWithdrawals || []).reduce(
      (sum, w: any) => sum + Number(w.amount || 0),
      0
    );

    const availableBeforeThis = totalEarned - totalReservedOrPaid;

    if (value > availableBeforeThis) {
      await supabaseAdmin
        .from("asaas_withdrawals")
        .update({ status: "failed", error_message: "Saldo insuficiente." })
        .eq("id", withdrawal_id);

      return new Response(
        JSON.stringify({
          error: "insufficient_balance",
          message: "Saldo insuficiente para este saque.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Determinar chave PIX e tipo
    const pixKey = withdrawal.pix_key;
    const rawKeyType = String(withdrawal.pix_key_type || "").toUpperCase();
    const asaasKeyType = KEY_TYPE_MAP[rawKeyType] || "EVP";

    if (!pixKey) {
      await supabaseAdmin
        .from("asaas_withdrawals")
        .update({ status: "failed", error_message: "Chave PIX ausente." })
        .eq("id", withdrawal_id);

      return new Response(
        JSON.stringify({ error: "pix_required", message: "Chave PIX não configurada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Marcar como processing
    await supabaseAdmin
      .from("asaas_withdrawals")
      .update({ status: "processing" })
      .eq("id", withdrawal_id);

    // 5. Chamar Asaas
    const payload = {
      value,
      operationType: "PIX",
      pixAddressKey: pixKey,
      pixAddressKeyType: asaasKeyType,
      description: `Saque Freelaki - ${uid.slice(0, 8)}`,
    };

    const asaasRes = await fetch(`${ASAAS_BASE_URL}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const asaasData = await asaasRes.json();

    if (!asaasRes.ok || asaasData.errors) {
      const asaasDesc = asaasData.errors?.[0]?.description || "Falha na transferência PIX.";
      const asaasCode = asaasData.errors?.[0]?.code || "";
      const isGatewayBalance =
        asaasDesc.toLowerCase().includes("saldo insuficiente") ||
        asaasCode === "invalid_action";

      await supabaseAdmin
        .from("asaas_withdrawals")
        .update({
          status: isGatewayBalance ? "pending" : "failed",
          error_message: asaasDesc,
        })
        .eq("id", withdrawal_id);

      const msg = isGatewayBalance
        ? "Pagamentos temporariamente indisponíveis. Tente novamente em instantes."
        : asaasDesc;

      return new Response(
        JSON.stringify({ error: "transfer_failed", message: msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transferId = asaasData.id || asaasData.transferId || null;

    // 6. Sucesso: atualizar withdrawal
    await supabaseAdmin
      .from("asaas_withdrawals")
      .update({
        status: "completed",
        asaas_transfer_id: transferId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawal_id);

    // 7. Marcar earnings disponíveis até cobrir o valor sacado
    const { data: availEarnings } = await supabaseAdmin
      .from("earnings")
      .select("id, net_amount")
      .eq("profile_id", uid)
      .eq("status", "available")
      .order("created_at", { ascending: true });

    let remaining = value;
    const toMark: string[] = [];
    for (const e of availEarnings || []) {
      if (remaining <= 0) break;
      toMark.push(e.id);
      remaining -= Number(e.net_amount);
    }
    if (toMark.length > 0) {
      await supabaseAdmin
        .from("earnings")
        .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
        .in("id", toMark);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transferId,
        amount: value,
        message: "Pix enviado! Você receberá em instantes.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("asaas-process-withdrawal error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
