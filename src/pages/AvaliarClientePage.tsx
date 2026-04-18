import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface OppData {
  id: string;
  title: string;
  client_id: string;
  accepted_by: string | null;
  client?: { full_name: string | null; avatar_url: string | null };
}

const AvaliarClientePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [opp, setOpp] = useState<OppData | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: oppData } = await supabase
        .from("opportunities")
        .select("id, title, client_id, accepted_by")
        .eq("id", id)
        .maybeSingle();

      if (!oppData) {
        setLoading(false);
        return;
      }

      const { data: clientData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", oppData.client_id)
        .maybeSingle();

      // Já avaliou?
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("opportunity_id", id)
        .eq("professional_id", user.id)
        .maybeSingle();

      if (existing) setAlreadyRated(true);
      setOpp({ ...oppData, client: clientData ?? undefined });
      setLoading(false);
    })();
  }, [id, user]);

  const handleSubmit = async () => {
    if (!opp || !user || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      opportunity_id: opp.id,
      client_id: opp.client_id,
      professional_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Erro ao enviar avaliação", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Avaliação enviada! ⭐", description: "Obrigado pelo feedback." });
    navigate("/dashboard", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="text-white/40 text-sm">Carregando...</div>
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: "#0A0A0F" }}>
        <div className="text-white/60">Chamado não encontrado.</div>
        <button onClick={() => navigate("/dashboard")} className="text-[#276EF1] text-sm font-semibold">
          Voltar
        </button>
      </div>
    );
  }

  const ratingLabels = ["", "Péssimo", "Ruim", "Ok", "Muito bom", "Excelente!"];

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-12 pb-4" style={{ background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)" }}>
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
      </div>

      <div className="px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[3px] text-[#276EF1]">
            Sua opinião conta
          </div>
          <h1 className="mt-2 text-[26px] font-bold text-white leading-tight">
            Como foi trabalhar<br />com este cliente?
          </h1>
          <p className="mt-2 text-sm text-white/40 line-clamp-1">{opp.title}</p>
        </motion.div>

        {alreadyRated ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 rounded-2xl p-6 text-center"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}
          >
            <div className="text-emerald-400 text-sm font-semibold">✓ Você já avaliou este cliente</div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 text-xs text-white/50 underline"
            >
              Voltar ao dashboard
            </button>
          </motion.div>
        ) : (
          <>
            {/* Estrelas */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-10 flex items-center justify-center gap-2"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= (hover || rating);
                return (
                  <button
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                    className="transition-transform active:scale-90"
                  >
                    <Star
                      className="h-12 w-12 transition-colors"
                      strokeWidth={1.5}
                      style={{
                        color: active ? "#fbbf24" : "rgba(255,255,255,0.15)",
                        fill: active ? "#fbbf24" : "transparent",
                      }}
                    />
                  </button>
                );
              })}
            </motion.div>

            <div className="mt-3 text-center text-sm font-semibold h-5" style={{ color: rating ? "#fbbf24" : "transparent" }}>
              {ratingLabels[hover || rating] || "·"}
            </div>

            {/* Comentário */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <label className="text-[11px] font-semibold uppercase tracking-[2px] text-white/40">
                Comentário (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 300))}
                placeholder="Como foi a experiência? Pagamento em dia? Comunicação clara?"
                className="mt-2 w-full rounded-2xl p-4 text-sm text-white placeholder:text-white/25 outline-none resize-none"
                rows={4}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <div className="mt-1 text-right text-[10px] text-white/30">{comment.length}/300</div>
            </motion.div>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              disabled={rating === 0 || submitting}
              onClick={handleSubmit}
              className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
              style={{ background: "#276EF1" }}
            >
              <Send className="h-4 w-4" />
              {submitting ? "Enviando..." : "Enviar avaliação"}
            </motion.button>

            <button
              onClick={() => navigate("/dashboard")}
              className="mt-3 w-full text-xs text-white/40 hover:text-white/70"
            >
              Pular por enquanto
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AvaliarClientePage;
