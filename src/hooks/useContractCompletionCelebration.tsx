import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SOUND_SUCCESS =
  "https://chkeoqugdcciojzmuczr.supabase.co/storage/v1/object/public/Sounds/Online%20button%20freelaki.mp3";

const STORAGE_KEY = "freelaki:pending_completion";

interface PendingCompletion {
  contractId: string;
  opportunityId: string | null;
  netAmount: number | null;
  title: string | null;
  shownAt?: number;
}

const playCelebrationSound = () => {
  try {
    const audio = new Audio(SOUND_SUCCESS);
    audio.volume = 0.55;
    audio.play().catch(() => {});
  } catch {}
};

/**
 * Hook leve que:
 * 1. Escuta UPDATE em contracts (filtrado por professional_id)
 * 2. Quando status vira 'completed', salva no localStorage e dispara celebração
 * 3. Se o app estava fechado, mostra ao reabrir
 */
export function useContractCompletionCelebration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingCompletion | null>(null);
  const shownIdsRef = useRef<Set<string>>(new Set());

  // Carrega celebração pendente ao montar (caso o app tenha sido fechado)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as PendingCompletion;
        setPending(data);
        shownIdsRef.current.add(data.contractId);
        playCelebrationSound();
        navigator.vibrate?.([100, 50, 100, 50, 200]);
      }
    } catch {}
  }, []);

  // Realtime: escuta conclusão dos contratos do profissional
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`contract-completion-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contracts",
          filter: `professional_id=eq.${user.id}`,
        },
        async (payload) => {
          const newRow = payload.new as { id: string; status: string | null; opportunity_id: string | null };
          const oldRow = payload.old as { status: string | null };

          if (newRow.status !== "completed" || oldRow.status === "completed") return;
          if (shownIdsRef.current.has(newRow.id)) return;
          shownIdsRef.current.add(newRow.id);

          // Busca dados leves p/ exibir
          const [{ data: opp }, { data: earn }] = await Promise.all([
            newRow.opportunity_id
              ? supabase.from("opportunities").select("title").eq("id", newRow.opportunity_id).maybeSingle()
              : Promise.resolve({ data: null }),
            supabase
              .from("earnings")
              .select("net_amount")
              .eq("contract_id", newRow.id)
              .maybeSingle(),
          ]);

          const data: PendingCompletion = {
            contractId: newRow.id,
            opportunityId: newRow.opportunity_id,
            netAmount: earn?.net_amount ?? null,
            title: opp?.title ?? null,
            shownAt: Date.now(),
          };

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch {}

          setPending(data);
          playCelebrationSound();
          navigator.vibrate?.([100, 50, 100, 50, 200]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismiss = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setPending(null);
  }, []);

  const goReview = useCallback(() => {
    const oppId = pending?.opportunityId;
    dismiss();
    if (oppId) navigate(`/avaliar/${oppId}`);
  }, [pending, dismiss, navigate]);

  return { pending, dismiss, goReview };
}

/* ─────────── Overlay visual (leve, sem libs extras) ─────────── */
export function ContractCompletionOverlay() {
  const { pending, dismiss, goReview } = useContractCompletionCelebration();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {pending && (
        <motion.div
          key="completion-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
          style={{ background: "radial-gradient(circle at center, rgba(39,110,241,0.25), rgba(0,0,0,0.85) 70%)" }}
        >
          {/* Confetti leve (12 partículas CSS) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ y: -40, x: 0, opacity: 0, rotate: 0 }}
                animate={{
                  y: ["-10%", "110%"],
                  x: [0, (i % 2 === 0 ? 1 : -1) * (40 + i * 6)],
                  opacity: [0, 1, 1, 0],
                  rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)],
                }}
                transition={{ duration: 2.4 + (i % 4) * 0.3, delay: i * 0.06, ease: "easeOut" }}
                className="absolute top-0"
                style={{
                  left: `${(i / 14) * 100}%`,
                  width: 8,
                  height: 14,
                  borderRadius: 2,
                  background: i % 3 === 0 ? "#276EF1" : i % 3 === 1 ? "#22c55e" : "#fbbf24",
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            className="relative w-full max-w-sm rounded-3xl p-7 text-center"
            style={{
              background: "linear-gradient(180deg, #111118 0%, #0A0A0F 100%)",
              border: "1px solid rgba(39,110,241,0.35)",
              boxShadow: "0 30px 80px -20px rgba(39,110,241,0.4)",
            }}
          >
            {/* Ícone com pulse */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", damping: 12, stiffness: 200 }}
              className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, #276EF1, #22c55e)" }}
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="absolute inset-0 rounded-full"
                style={{ background: "rgba(39,110,241,0.4)" }}
              />
              <CheckCircle2 className="relative h-10 w-10 text-white" strokeWidth={2.5} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[3px] text-emerald-400">
                <Sparkles className="h-3 w-3" /> freela concluído
              </div>
              <h2 className="text-[22px] font-bold text-white leading-tight">
                Boa! Mais um trampo<br />finalizado 🎉
              </h2>
              {pending?.title && (
                <p className="mt-2 text-sm text-white/60 line-clamp-2">{pending.title}</p>
              )}

              {pending?.netAmount != null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-4 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
                >
                  <div className="text-[10px] uppercase tracking-[2px] text-emerald-300/80">você recebe</div>
                  <div className="mt-0.5 text-2xl font-bold text-emerald-400">
                    R$ {Number(pending.netAmount).toFixed(2).replace(".", ",")}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* CTA único — avaliar é obrigatório */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-6 flex flex-col gap-2"
            >
              <button
                onClick={goReview}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition active:scale-[0.98]"
                style={{ background: "#276EF1" }}
              >
                <Star className="h-4 w-4" fill="currentColor" /> Avaliar cliente agora
              </button>
              <p className="mt-1 text-[11px] text-white/40">
                A avaliação é obrigatória para liberar próximos freelas
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
