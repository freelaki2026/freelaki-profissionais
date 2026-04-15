import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const TOTAL_DURATION = 5000;

const Splash = () => {
  const navigate = useNavigate();
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTagline(true), 1200);

    const tEnd = setTimeout(async () => {
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
      clearTimeout(t1);
      clearTimeout(tEnd);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#276EF1]/8 blur-[120px]" />
      </div>

      {/* Logo */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
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

      {/* Tagline */}
      <motion.div
        className="relative z-10 mt-10 text-center px-10"
        initial={{ opacity: 0, y: 12 }}
        animate={showTagline ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <p className="text-[18px] font-semibold text-white/90 leading-snug">
          100% do que você ganha{" "}
          <span style={{ color: "#276EF1" }}>é seu.</span>
        </p>
        <p className="mt-2 text-[13px] text-white/30 font-light">
          Grátis pra sempre. Sem taxa escondida.
        </p>
      </motion.div>

      {/* Progress bar */}
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
              animation: `progress-fill ${TOTAL_DURATION}ms linear forwards`,
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
