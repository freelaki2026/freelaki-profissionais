// Cria subconta Asaas para o profissional. Idempotente: se já existir asaas_account_id, retorna.
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

    // 1. Buscar profile + endereço
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, cpf_cnpj, phone, asaas_account_id")
      .eq("id", uid)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "profile_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência: já tem subconta
    if (profile.asaas_account_id) {
      return new Response(JSON.stringify({ success: true, asaas_account_id: profile.asaas_account_id, already_exists: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validações mínimas
    const cpfCnpj = onlyDigits(profile.cpf_cnpj);
    const mobilePhone = onlyDigits(profile.phone);
    if (!profile.full_name || !profile.email || !cpfCnpj || !mobilePhone) {
      const msg = "Dados incompletos para criar subconta (nome, email, CPF/CNPJ e telefone obrigatórios).";
      await supabaseAdmin.from("profiles").update({ asaas_error: msg }).eq("id", uid);
      return new Response(JSON.stringify({ error: "incomplete_profile", message: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: address } = await supabaseAdmin
      .from("addresses")
      .select("cep")
      .eq("profile_id", uid)
      .maybeSingle();

    const postalCode = onlyDigits(address?.cep);
    if (!postalCode) {
      const msg = "CEP obrigatório para criar subconta Asaas.";
      await supabaseAdmin.from("profiles").update({ asaas_error: msg }).eq("id", uid);
      return new Response(JSON.stringify({ error: "missing_cep", message: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Chamar Asaas
    const payload = {
      name: profile.full_name,
      email: profile.email,
      cpfCnpj,
      mobilePhone,
      postalCode,
    };

    const asaasRes = await fetch(`${ASAAS_BASE_URL}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
      body: JSON.stringify(payload),
    });

    const asaasData = await asaasRes.json();

    if (!asaasRes.ok || asaasData.errors) {
      const errMsg = asaasData.errors?.[0]?.description || "Falha ao criar subconta Asaas.";
      console.error("Asaas account error:", JSON.stringify(asaasData));
      await supabaseAdmin.from("profiles").update({ asaas_error: errMsg }).eq("id", uid);
      return new Response(JSON.stringify({ error: "asaas_error", message: errMsg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Salvar IDs no profile
    const accountId = asaasData.id || asaasData.accountId || null;
    const walletId = asaasData.walletId || null;
    const apiKey = asaasData.apiKey || null; // chave da subconta, se retornada

    await supabaseAdmin.from("profiles").update({
      asaas_account_id: accountId,
      asaas_wallet_id: walletId,
      asaas_customer_id: asaasData.customer || null,
      asaas_error: null,
    }).eq("id", uid);

    // Opcional: armazenar apiKey em secret seguro — aqui retornamos só o status.
    return new Response(JSON.stringify({
      success: true,
      asaas_account_id: accountId,
      wallet_id: walletId,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("asaas-create-account error:", err);
    return new Response(JSON.stringify({ error: "internal_error", message: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
