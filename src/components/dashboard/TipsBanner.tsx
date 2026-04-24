import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Sparkles, TrendingUp, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Tip {
  id: string;
  category: "security" | "earnings" | "curiosity" | "system";
  title: string;
  body: string;
  emoji: string | null;
  priority: number;
}

const ICONS = {
  security: ShieldCheck,
  earnings: TrendingUp,
  curiosity: Sparkles,
  system: Megaphone,
} as const;

const LABELS = {
  security: "Segurança",
  earnings: "Ganhos",
  curiosity: "Você sabia?",
  system: "Aviso",
} as const;

// Cache leve de 10 min para evitar refetch a cada navegação
let tipsCache: { tips: Tip[]; at: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export function TipsBanner() {
  const [tips, setTips] = useState<Tip[]>(() => tipsCache?.tips ?? []);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (tipsCache && now - tipsCache.at < CACHE_TTL) return;

    let cancelled = false;
    supabase
      .from("app_tips")
      .select("id, category, title, body, emoji, priority")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const list = data as Tip[];
        tipsCache = { tips: list, at: Date.now() };
        setTips(list);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Carrossel automático leve — só roda quando aba visível
  useEffect(() => {
    if (tips.length <= 1) return;

    const tick = () => setIdx((i) => (i + 1) % tips.length);
    const start = () => {
      if (timerRef.current) return;
      timerRef.current = window.setInterval(tick, 6000);
    };
    const stop = () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    const onVis = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [tips.length]);

  if (tips.length === 0) return null;

  const tip = tips[idx];
  const Icon = ICONS[tip.category] ?? Sparkles;

  return (
    <div className="px-5 mb-4">
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-3.5"
        style={{
          background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 60%, #6D28D9 100%)",
          boxShadow: "0 8px 24px rgba(139,92,246,0.25)",
        }}
      >
        {/* Glow decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full"
          style={{ background: "rgba(255,255,255,0.12)", filter: "blur(24px)" }}
        />

        <div className="relative flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <span className="text-lg leading-none">{tip.emoji ?? "💡"}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Icon size={11} className="text-white/80" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                {LABELS[tip.category]}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
              >
                <p className="mt-0.5 text-[13px] font-bold leading-tight text-white">
                  {tip.title}
                </p>
                <p className="mt-1 text-[12px] leading-snug text-white/85 line-clamp-2">
                  {tip.body}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Indicadores */}
            {tips.length > 1 && (
              <div className="mt-2.5 flex items-center gap-1">
                {tips.slice(0, Math.min(tips.length, 6)).map((_, i) => (
                  <span
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i === idx % 6 ? 14 : 4,
                      background: i === idx % 6 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TipsBanner;
