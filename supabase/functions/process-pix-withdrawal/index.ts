import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE_URL = ASAAS_API_KEY?.startsWith("$aact_")
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
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

    // 2. Fetch bank account (PIX required)
    const { data: bankAccount, error: bankErr } = await supabaseAdmin
      .from("bank_accounts")
      .select("*")
      .eq("profile_id", uid)
      .maybeSingle();

    if (bankErr || !bankAccount) {
      return new Response(JSON.stringify({ error: "no_bank_account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (bankAccount.payment_type !== "pix" || !bankAccount.pix_key) {
      return new Response(
        JSON.stringify({ error: "pix_required", message: "Apenas saques via PIX são suportados." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Calculate available balance
    const { data: availableEarnings, error: earnErr } = await supabaseAdmin
      .from("earnings")
      .select("id, net_amount")
      .eq("profile_id", uid)
      .eq("status", "available");

    if (earnErr || !availableEarnings || availableEarnings.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_balance", message: "Sem saldo disponível para saque." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalAvailable = availableEarnings.reduce(
      (sum, e) => sum + Number(e.net_amount),
      0
    );

    if (totalAvailable <= 0) {
      return new Response(
        JSON.stringify({ error: "no_balance", message: "Sem saldo disponível para saque." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Map PIX key type for Asaas
    const pixKeyTypeMap: Record<string, string> = {
      cpf: "CPF",
      cnpj: "CNPJ",
      email: "EMAIL",
      telefone: "PHONE",
      phone: "PHONE",
      aleatoria: "EVP",
      evp: "EVP",
    };
    const asaasKeyType =
      pixKeyTypeMap[(bankAccount.pix_key_type || "").toLowerCase()] || "EVP";

    // 5. Call Asaas API
    const asaasPayload = {
      value: totalAvailable,
      operationType: "PIX",
      pixAddressKey: bankAccount.pix_key,
      pixAddressKeyType: asaasKeyType,
      description: `Saque Freelaki - ${uid.slice(0, 8)}`,
    };

    const asaasRes = await fetch(`${ASAAS_BASE_URL}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(asaasPayload),
    });

    const asaasData = await asaasRes.json();

    if (!asaasRes.ok || asaasData.errors) {
      console.error("Asaas error:", JSON.stringify(asaasData));

      // Insert failed withdrawal record
      await supabaseAdmin.from("withdrawals").insert({
        profile_id: uid,
        amount: totalAvailable,
        status: "failed",
        bank_account_id: bankAccount.id,
      });

      const errorMsg =
        asaasData.errors?.[0]?.description ||
        "Falha na transferência PIX. Tente novamente.";

      return new Response(
        JSON.stringify({ error: "transfer_failed", message: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Success — insert withdrawal and update earnings
    const transferId = asaasData.id || asaasData.transferId || null;

    const { error: withdrawErr } = await supabaseAdmin.from("withdrawals").insert({
      profile_id: uid,
      amount: totalAvailable,
      status: "completed",
      bank_account_id: bankAccount.id,
      asaas_transfer_id: transferId,
      processed_at: new Date().toISOString(),
    });

    if (withdrawErr) {
      console.error("Withdrawal insert error:", withdrawErr);
    }

    // Mark all available earnings as withdrawn
    const earningIds = availableEarnings.map((e) => e.id);
    await supabaseAdmin
      .from("earnings")
      .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
      .in("id", earningIds);

    return new Response(
      JSON.stringify({
        success: true,
        amount: totalAvailable,
        transfer_id: transferId,
        message: "Transferência PIX realizada com sucesso!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
