import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const MIN_SPLASH_DURATION = 1800;
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
        return { path: "/login", state: undefined };
      }

      if (!session.user.email_confirmed_at) {
        return {
          path: "/confirmar-email",
          state: { email: session.user.email },
        };
      }

      const { count } = await supabase
        .from("professional_categories")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", session.user.id);

      return {
        path: (count ?? 0) === 0 ? "/categorias" : "/dashboard",
        state: undefined,
      };
    };

    const run = async () => {
      const [{ path, state }] = await Promise.all([
        resolveNextPath(),
        new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_DURATION)),
      ]);

      if (!isActive) return;
      navigate(path, { replace: true, state });
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

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <h1 className="font-bold" style={{ fontSize: 42, letterSpacing: -1.5, lineHeight: 1 }}>
          <span className="text-white">Freela</span>
          <span style={{ color: "#276EF1" }}>Ki</span>
        </h1>
        <p
          className="font-light uppercase"
          style={{ fontSize: 11, color: "#555", letterSpacing: 6, marginTop: 6 }}
        >
          profissionais
        </p>
      </motion.div>

      <motion.div
        className="relative z-10 mt-10 text-center px-10"
        initial={{ opacity: 0, y: 8 }}
        animate={showTagline ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <p className="text-[18px] font-semibold text-white/90 leading-snug">
          100% do que você ganha <span style={{ color: "#276EF1" }}>é seu.</span>
        </p>
        <p className="mt-2 text-[13px] text-white/30 font-light">
          Grátis pra sempre. Sem taxa escondida.
        </p>
      </motion.div>

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
              animation: `progress-fill ${MIN_SPLASH_DURATION}ms linear forwards`,
            }}
          />
        </div>
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

