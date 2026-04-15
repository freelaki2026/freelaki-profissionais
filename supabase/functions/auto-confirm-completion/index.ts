import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    // Fetch contracts awaiting confirmation for 30+ minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: contracts, error: fetchError } = await supabase
      .from("contracts")
      .select("id, opportunity_id, client_id, professional_id")
      .eq("status", "awaiting_confirmation")
      .lt("completion_requested_at", thirtyMinAgo);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!contracts || contracts.length === 0) {
      return new Response(JSON.stringify({ message: "No contracts to auto-confirm", count: 0 }), { status: 200 });
    }

    const now = new Date().toISOString();
    let confirmed = 0;

    for (const contract of contracts) {
      // Update contract
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          status: "completed",
          completion_confirmed_at: now,
          auto_confirmed: true,
        })
        .eq("id", contract.id);

      if (updateError) {
        console.error(`Error updating contract ${contract.id}:`, updateError);
        continue;
      }

      // Update opportunity status
      if (contract.opportunity_id) {
        await supabase
          .from("opportunities")
          .update({ status: "completed" })
          .eq("id", contract.opportunity_id);
      }

      // Notify client
      if (contract.client_id) {
        await supabase.from("notifications").insert({
          profile_id: contract.client_id,
          type: "contrato",
          title: "✅ Serviço concluído automaticamente",
          body: "O prazo de 30 minutos expirou e o serviço foi confirmado automaticamente. O pagamento será liberado ao profissional.",
          action_url: `/chamado/${contract.opportunity_id}`,
        });
      }

      // Notify professional
      if (contract.professional_id) {
        await supabase.from("notifications").insert({
          profile_id: contract.professional_id,
          type: "contrato",
          title: "✅ Serviço confirmado!",
          body: "O cliente não respondeu em 30 minutos e o serviço foi confirmado automaticamente. Seu pagamento será liberado.",
          action_url: `/contratos`,
        });
      }

      confirmed++;
    }

    console.log(`Auto-confirmed ${confirmed} contracts`);
    return new Response(JSON.stringify({ message: "Done", confirmed }), { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
