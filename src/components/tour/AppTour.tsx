import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { TOUR_STEPS } from "./tourSteps";

interface AppTourProps {
  open: boolean;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: (reason?: "completed" | "skipped") => void;
}

type Rect = { top: number; left: number; width: number; height: number } | null;

const PAD = 8;
const CARD_W = 320;
const CARD_GAP = 14;

export default function AppTour({ open, stepIndex, onNext, onPrev, onFinish }: AppTourProps) {
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex >= TOUR_STEPS.length - 1;
  const [rect, setRect] = useState<Rect>(null);

  // Recalcula posição do alvo (resize / scroll / mudança de step)
  useLayoutEffect(() => {
    if (!open || !step) return;
    let raf = 0;
    const update = () => {
      if (!step.selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      // garantir visibilidade
      try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      });
    };
    update();
    const onScroll = () => update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", onScroll, true);
    const interval = setInterval(update, 400);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", onScroll, true);
      clearInterval(interval);
    };
  }, [open, step, stepIndex]);

  // Bloqueia scroll do body
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish("skipped");
      else if (e.key === "ArrowRight") isLast ? onFinish("completed") : onNext();
      else if (e.key === "ArrowLeft" && stepIndex > 0) onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, isLast, stepIndex, onNext, onPrev, onFinish]);

  if (!open || !step) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Posicionamento do card
  let cardStyle: React.CSSProperties;
  if (!rect) {
    // Centro
    cardStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: Math.min(CARD_W, vw - 32),
    };
  } else {
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const placeBelow =
      step.placement === "bottom" ||
      (step.placement !== "top" && spaceBelow > spaceAbove);
    const cardW = Math.min(CARD_W, vw - 32);
    let left = rect.left + rect.width / 2 - cardW / 2;
    left = Math.max(16, Math.min(left, vw - cardW - 16));
    const top = placeBelow
      ? rect.top + rect.height + CARD_GAP
      : rect.top - CARD_GAP - 220; // 220 ~ altura estimada do card
    cardStyle = { top: Math.max(16, top), left, width: cardW };
  }

  const spotlightStyle: React.CSSProperties = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 16,
        boxShadow:
          "0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px rgba(39,110,241,0.6)",
      }
    : {
        top: vh / 2,
        left: vw / 2,
        width: 0,
        height: 0,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
      };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999]"
        role="dialog"
        aria-label={step.title}
      >
        {/* Spotlight */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="pointer-events-none fixed"
          style={spotlightStyle}
        />

        {/* Botão X global (canto sup direito) */}
        <button
          type="button"
          onClick={() => onFinish("skipped")}
          className="fixed top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-black shadow-lg"
          aria-label="Fechar tour"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <X size={18} />
        </button>

        {/* Card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed z-10 rounded-[20px] bg-white p-5 shadow-2xl"
          style={cardStyle}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-[#276EF1]" fill="currentColor" />
            <span className="text-[10px] font-semibold tracking-widest text-[#767676] uppercase">
              {stepIndex + 1} de {TOUR_STEPS.length}
            </span>
          </div>
          <h3 className="text-[18px] font-bold text-foreground leading-tight">
            {step.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#555]">
            {step.body}
          </p>

          {/* Dots */}
          <div className="mt-4 flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === stepIndex ? 18 : 6,
                  background: i === stepIndex ? "#276EF1" : "#E5E5E5",
                }}
              />
            ))}
          </div>

          {/* Ações */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onFinish("skipped")}
              className="text-[12px] font-medium text-[#767676] underline-offset-2 hover:underline"
            >
              Pular tour
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={onPrev}
                  className="flex h-10 items-center gap-1 rounded-[12px] bg-[#F2F2F2] px-3 text-[13px] font-semibold text-foreground"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLast ? onFinish("completed") : onNext())}
                className="flex h-10 items-center gap-1 rounded-[12px] bg-[#276EF1] px-4 text-[13px] font-semibold text-white"
              >
                {isLast ? "Começar" : "Avançar"}
                {!isLast && <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
