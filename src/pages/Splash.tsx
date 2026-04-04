import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TOTAL_DURATION = 4000;
const CONVERGE_START = 1800;
const FLASH_START = 3200;

const SOUND_URL = "https://chkeoqugdcciojzmuczr.supabase.co/storage/v1/object/public/Sounds/Online%20button%20freelaki.MP3";

const ORBIT1 = {
  radius: 90,
  duration: 4,
  reverse: false,
  border: "rgba(39,110,241,0.15)",
  emojis: [
    { emoji: "📷", angle: 0 },
    { emoji: "🎬", angle: 180 },
  ],
};

const ORBIT2 = {
  radius: 150,
  duration: 6,
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
  duration: 9,
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
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    // Phase 2: emojis start spiraling inward
    const t2 = setTimeout(() => setPhase(2), CONVERGE_START);
    // Phase 3: flash when emojis arrive
    const t3 = setTimeout(() => {
      setPhase(3);
      // Play online sound when emojis converge
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        const audio = new Audio(SOUND_URL + "?t=" + Date.now());
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
    }, FLASH_START);
    // Navigate
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

  // Calculate converge progress for smooth spiral
  const convergeDuration = FLASH_START - CONVERGE_START; // 1400ms

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
              transition: phase >= 2 ? "opacity 600ms ease-out" : undefined,
              opacity: phase >= 3 ? 0 : 1,
            }}
          >
            {orbit.emojis.map((item, ei) => {
              const isConverging = phase >= 2;
              const staggerDelay = oi * 60 + ei * 30;
              return (
                <div
                  key={ei}
                  className="absolute"
                  style={{
                    top: "50%",
                    left: "50%",
                    width: 0,
                    height: 0,
                    transform: isConverging
                      ? `rotate(${item.angle}deg) translateX(0px) scale(0)`
                      : `rotate(${item.angle}deg) translateX(${orbit.radius}px)`,
                    transition: isConverging
                      ? `transform ${convergeDuration}ms cubic-bezier(0.4, 0, 0.2, 1) ${staggerDelay}ms, opacity ${convergeDuration}ms ease-in ${staggerDelay}ms`
                      : undefined,
                    opacity: isConverging ? 0 : 1,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 22,
                      transform: `rotate(${-item.angle}deg)`,
                      animation: phase < 2
                        ? `counter-spin ${orbit.duration}s linear infinite ${orbit.reverse ? "reverse" : ""}`
                        : "none",
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
          }}
        >
          <Zap
            size={32}
            fill="#276EF1"
            color="#276EF1"
            style={{
              animation: phase === 3 ? "flash-icon 400ms ease-out" : undefined,
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
          50% { transform: scale(1.5); border-color: #276EF1; box-shadow: 0 0 60px rgba(39,110,241,0.5); }
          100% { transform: scale(1); border-color: rgba(39,110,241,0.15); }
        }
        @keyframes flash-icon {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
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
