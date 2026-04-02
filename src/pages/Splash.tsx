import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TOTAL_DURATION = 6500;
const PHASE2_START = 4000;
const PHASE3_START = 5500;

const ORBIT1 = {
  radius: 90,
  duration: 6,
  reverse: false,
  border: "rgba(39,110,241,0.15)",
  emojis: [
    { emoji: "📷", angle: 0 },
    { emoji: "🎬", angle: 180 },
  ],
};

const ORBIT2 = {
  radius: 150,
  duration: 10,
  reverse: true,
  border: "rgba(39,110,241,0.10)",
  emojis: [
    { emoji: "🎧", angle: 0 },
    { emoji: "🎨", angle: 90 },
    { emoji: "🎤", angle: 180 },
    { emoji: "💡", angle: 270 },
  ],
};

const ORBIT3 = {
  radius: 210,
  duration: 15,
  reverse: false,
  border: "rgba(39,110,241,0.07)",
  emojis: [
    { emoji: "📱", angle: 0 },
    { emoji: "✍️", angle: 72 },
    { emoji: "🎙️", angle: 144 },
    { emoji: "🎚️", angle: 216 },
    { emoji: "🎟️", angle: 288 },
  ],
};

const ORBITS = [ORBIT1, ORBIT2, ORBIT3];

const Splash = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t2 = setTimeout(() => setPhase(2), PHASE2_START);
    const t3 = setTimeout(() => setPhase(3), PHASE3_START);
    const tEnd = setTimeout(async () => {
      setPhase(4);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login", { replace: true });
        return;
      }

      if (!session.user.email_confirmed_at) {
        navigate("/confirmar-email", { replace: true, state: { email: session.user.email } });
        return;
      }

      const { count } = await supabase
        .from("professional_categories")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", session.user.id);

      if ((count ?? 0) === 0) {
        navigate("/categorias", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }, TOTAL_DURATION);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tEnd);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Orbital system */}
      <div className="relative" style={{ width: 420, height: 420 }}>
        {/* Orbit rings */}
        {ORBITS.map((orbit, oi) => (
          <div
            key={oi}
            className="absolute rounded-full"
            style={{
              width: orbit.radius * 2,
              height: orbit.radius * 2,
              top: "50%",
              left: "50%",
              marginTop: -orbit.radius,
              marginLeft: -orbit.radius,
              border: `1px solid ${orbit.border}`,
              animation: phase < 2
                ? `spin-orbit ${orbit.duration}s linear infinite ${orbit.reverse ? "reverse" : ""}`
                : "none",
            }}
          >
            {orbit.emojis.map((item, ei) => {
              const staggerDelay = (2 - oi) * 100;
              const isConverging = phase >= 2;
              return (
                <div
                  key={ei}
                  className="absolute"
                  style={{
                    top: "50%",
                    left: "50%",
                    width: 0,
                    height: 0,
                    transform: `rotate(${item.angle}deg) translateX(${orbit.radius}px)`,
                    transition: isConverging
                      ? `all 800ms ease-in ${staggerDelay}ms`
                      : undefined,
                    ...(isConverging && {
                      transform: `rotate(${item.angle}deg) translateX(0px) scale(0)`,
                      opacity: 0,
                    }),
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 22,
                      transform: orbit.reverse
                        ? `rotate(${-item.angle}deg) rotate(${orbit.duration}s)`
                        : `rotate(${-item.angle}deg)`,
                      animation: phase < 2
                        ? `counter-spin ${orbit.duration}s linear infinite ${orbit.reverse ? "reverse" : ""}`
                        : "none",
                      transition: isConverging ? `opacity 800ms ease-in ${staggerDelay}ms` : undefined,
                    }}
                  >
                    {item.emoji}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Center circle */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: 80,
            height: 80,
            top: "50%",
            left: "50%",
            marginTop: -40,
            marginLeft: -40,
            background: "rgba(39,110,241,0.15)",
            border: "1.5px solid #276EF1",
            animation: phase === 3
              ? "flash-circle 400ms ease-out"
              : "pulse-center 2s ease-in-out infinite",
            borderColor: phase === 3 ? "#276EF1" : undefined,
          }}
        >
          <Zap
            size={32}
            fill="#276EF1"
            color="#276EF1"
            style={{
              animation: phase === 3
                ? "flash-icon 400ms ease-out"
                : undefined,
            }}
          />
        </div>
      </div>

      {/* Text */}
      <div className="text-center" style={{ marginTop: 48 }}>
        <h1
          className="font-bold text-white"
          style={{ fontSize: 32, letterSpacing: -1, lineHeight: 1 }}
        >
          freelaki
        </h1>
        <p
          className="font-light"
          style={{ fontSize: 13, color: "#767676", letterSpacing: 4, marginTop: 4 }}
        >
          profissionais
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="fixed flex flex-col items-center"
        style={{ bottom: 52, left: "50%", transform: "translateX(-50%)" }}
      >
        <div
          className="overflow-hidden"
          style={{
            width: 80,
            height: 2,
            borderRadius: 1,
            background: "rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#276EF1",
              animation: `progress-fill ${TOTAL_DURATION}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin-orbit {
          to { transform: rotate(360deg); }
        }
        @keyframes counter-spin {
          to { transform: rotate(-360deg); }
        }
        @keyframes pulse-center {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes flash-circle {
          0% { transform: scale(1.08); border-color: #276EF1; }
          50% { transform: scale(1.4); border-color: #276EF1; box-shadow: 0 0 40px rgba(39,110,241,0.4); }
          100% { transform: scale(1); border-color: rgba(39,110,241,0.15); }
        }
        @keyframes flash-icon {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes progress-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Splash;
