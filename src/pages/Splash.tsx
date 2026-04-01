import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SEQUENCE = [
  { emoji: "📷", label: "Fotógrafos" },
  { emoji: "🎬", label: "Filmmakers" },
  { emoji: "🎧", label: "DJs" },
  { emoji: "🎤", label: "Entrevistadores" },
  { emoji: "🎨", label: "Designers" },
  { emoji: "💡", label: "Operadores de Luz" },
  { emoji: "🎚️", label: "Operadores de Som" },
  { emoji: "📱", label: "Videomakers Mobile" },
  { emoji: "✍️", label: "Roteiristas" },
  { emoji: "🎙️", label: "Mestres de Cerimônia" },
  { emoji: "⚡", label: "Freelaki", isLast: true },
] as const;

const ITEM_DURATION = 600;
const LAST_DURATION = 800;
const TOTAL_DURATION = (SEQUENCE.length - 1) * ITEM_DURATION + LAST_DURATION;

const Splash = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [done, setDone] = useState(false);

  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= SEQUENCE.length) {
          setDone(true);
          return prev;
        }
        return next;
      });
      setVisible(true);
    }, 200);
  }, []);

  useEffect(() => {
    if (done) return;
    const dur = currentIndex === SEQUENCE.length - 1 ? LAST_DURATION : ITEM_DURATION;
    const timer = setTimeout(advance, dur);
    return () => clearTimeout(timer);
  }, [currentIndex, done, advance]);

  useEffect(() => {
    if (!done) return;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      navigate(session ? "/dashboard" : "/login", { replace: true });
    };
    check();
  }, [done, navigate]);

  const item = SEQUENCE[currentIndex];
  const isLast = "isLast" in item && item.isLast;

  return (
    <div className="fixed inset-0 flex flex-col bg-black overflow-hidden">
      {/* TOP — brand */}
      <div style={{ paddingTop: 72, paddingLeft: 28, paddingRight: 28 }}>
        <Zap size={28} className="text-primary" fill="currentColor" />
        <h1
          className="text-[38px] font-bold text-white leading-none"
          style={{ marginTop: 12, letterSpacing: -1 }}
        >
          freelaki
        </h1>
        <p
          className="text-[16px] font-light text-[#767676]"
          style={{ marginTop: 4, letterSpacing: 3 }}
        >
          profissionais
        </p>
      </div>

      {/* CENTER — animated sequence */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div
          className="flex flex-col items-center transition-opacity duration-200"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {isLast ? (
            <Zap size={64} className="text-primary" fill="currentColor" />
          ) : (
            <span style={{ fontSize: 64, lineHeight: 1 }}>{item.emoji}</span>
          )}
          <span
            className="font-semibold text-[18px]"
            style={{
              marginTop: 16,
              color: isLast ? "hsl(var(--primary))" : "#FFFFFF",
            }}
          >
            {item.label}
          </span>
        </div>
      </div>

      {/* FOOTER — progress bar */}
      <div className="flex flex-col items-center" style={{ paddingBottom: 56 }}>
        <div
          className="overflow-hidden"
          style={{
            width: 120,
            height: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.15)",
          }}
        >
          <div
            className="h-full bg-primary"
            style={{
              animation: `progress-fill ${TOTAL_DURATION}ms linear forwards`,
            }}
          />
        </div>
        <span
          className="text-[12px] font-light text-[#767676]"
          style={{ marginTop: 10 }}
        >
          Carregando...
        </span>
      </div>

      <style>{`
        @keyframes progress-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Splash;
