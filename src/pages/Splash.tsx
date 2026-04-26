import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Splash inteligente: dura mais para visitantes (impacto da marca)
// e bem menos quando o usuário já está autenticado (UX rápida estilo big tech).
const SPLASH_DURATION_GUEST = 1800;
const SPLASH_DURATION_LOGGED = 900;
const TAGLINE_DELAY = 250;

const Splash = () => {
  const navigate = useNavigate();
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    let isActive = true;
    const taglineTimer = setTimeout(() => setShowTagline(true), TAGLINE_DELAY);

    const resolveNextPath = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return { path: "/login", state: undefined, logged: false };
      }

      if (!session.user.email_confirmed_at) {
        return {
          path: "/confirmar-email",
          state: { email: session.user.email },
          logged: true,
        };
      }

      // Pré-aquece o chunk do dashboard em paralelo à query.
      void import("@/pages/DashboardPage");

      const { count } = await supabase
        .from("professional_categories")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", session.user.id);

      return {
        path: (count ?? 0) === 0 ? "/categorias" : "/dashboard",
        state: undefined,
        logged: true,
      };
    };

    const run = async () => {
      const resolved = await resolveNextPath();
      const minDuration = resolved.logged ? SPLASH_DURATION_LOGGED : SPLASH_DURATION_GUEST;
      await new Promise((resolve) => setTimeout(resolve, minDuration));

      if (!isActive) return;
      navigate(resolved.path, { replace: true, state: resolved.state });
    };

    run();

    return () => {
      isActive = false;
      clearTimeout(taglineTimer);
    };
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#276EF1]/8 blur-[120px]" />
      </div>

      <div
        className="relative z-10 flex flex-col items-center"
        style={{ animation: "splashLogoIn 450ms ease-out both" }}
      >
        <h1 className="font-bold" style={{ fontSize: 42, letterSpacing: -1.5, lineHeight: 1 }}>
          <span className="text-primary">free</span>
          <span className="text-secondary" style={{ color: "#276EF1" }}>
            laki
          </span>
        </h1>
        <p
          className="font-light uppercase text-primary-foreground"
          style={{ fontSize: 11, letterSpacing: 4, marginTop: 6 }}
        >
          profissionais
        </p>
      </div>

      <div
        className="relative z-10 mt-10 text-center px-10"
        style={{
          animation: showTagline ? "splashTaglineIn 450ms ease-out both" : undefined,
          opacity: showTagline ? undefined : 0,
        }}
      >
        <p className="text-[18px] font-semibold text-white/90 leading-snug">
          100% do que você ganha <span style={{ color: "#276EF1" }}>é seu.</span>
        </p>
        <p className="mt-2 text-[13px] text-white/30 font-light">Grátis pra sempre.</p>
      </div>

      <div
        className="fixed flex flex-col items-center"
        style={{ bottom: 52, left: "50%", transform: "translateX(-50%)" }}
      >
        <div
          className="overflow-hidden"
          style={{
            width: 60,
            height: 2,
            borderRadius: 1,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#276EF1",
              animation: `progress-fill ${SPLASH_DURATION_GUEST}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes progress-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashTaglineIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Splash;
