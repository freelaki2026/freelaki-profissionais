// Edge function: deletes a user permanently after the 15-day grace period.
// Invoked by pg_cron daily, or manually for a single user_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function purgeUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Storage cleanup — best effort
    for (const bucket of ["avatars", "documents", "portfolio"]) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
        if (files && files.length > 0) {
          const paths = files.map((f) => `${userId}/${f.name}`);
          await admin.storage.from(bucket).remove(paths);
        }
      } catch (_) { /* ignore */ }
    }

    // 2. Wipe app data tied to the user (skip financial/contract history for legal retention)
    const tables = [
      "notifications", "messages", "conversations",
      "professional_categories", "professional_extras", "professional_equipments",
      "professional_pricing", "professional_unavailable_dates",
      "portfolio_photos", "documents", "addresses",
      "bank_accounts", "pix_keys", "opportunity_applications",
    ];
    for (const t of tables) {
      const col = t === "conversations" ? "professional_id"
        : t === "messages" ? "sender_id"
        : ["bank_accounts", "addresses", "documents", "portfolio_photos", "professional_categories",
           "professional_extras", "professional_equipments", "professional_pricing",
           "professional_unavailable_dates", "notifications"].includes(t) ? "profile_id"
        : t === "pix_keys" ? "professional_id"
        : t === "opportunity_applications" ? "professional_id"
        : "profile_id";
      try { await admin.from(t).delete().eq(col, userId); } catch (_) { /* ignore */ }
    }

    // 3. Anonymize profile (keep row to avoid breaking FK in contracts/payments)
    await admin.from("profiles").update({
      full_name: "Conta excluída",
      email: `deleted-${userId}@freelaki.local`,
      phone: null,
      bio: null,
      avatar_url: null,
      cpf_cnpj: null,
      instagram: null, tiktok: null, youtube: null, linkedin: null,
      behance: null, dribbble: null, figma: null, github: null,
      vimeo: null, twitter: null, pinterest: null, website: null,
      deleted_at: new Date().toISOString(),
    }).eq("id", userId);

    // 4. Delete auth user
    await admin.auth.admin.deleteUser(userId);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const singleUserId: string | undefined = body.user_id;

    let userIds: string[] = [];
    if (singleUserId) {
      userIds = [singleUserId];
    } else {
      // Find all profiles whose grace period expired
      const { data } = await admin
        .from("profiles")
        .select("id")
        .lte("deletion_scheduled_for", new Date().toISOString())
        .is("deleted_at", null);
      userIds = (data ?? []).map((r) => r.id);
    }

    const results = await Promise.all(userIds.map((id) => purgeUser(id).then((r) => ({ id, ...r }))));

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
