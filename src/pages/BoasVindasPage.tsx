import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BoasVindasPage = () => {
  const navigate = useNavigate();

  // Se já está logado, manda direto para o splash (que cuida do redirect)
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) navigate("/splash", { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* Glow de fundo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[28%] left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#276EF1]/10 blur-[140px]" />
      </div>

      {/* Logo + tagline */}
      <div
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-8"
        style={{ animation: "fadeInUp 600ms ease-out both" }}
      >
        <h1
          className="font-bold"
          style={{ fontSize: 46, letterSpacing: -1.6, lineHeight: 1 }}
        >
          <span className="text-white">free</span>
          <span style={{ color: "#276EF1" }}>laki</span>
        </h1>
        <p
          className="mt-2 font-light uppercase text-white/70"
          style={{ fontSize: 11, letterSpacing: 4 }}
        >
          profissionais
        </p>

        <div className="mt-12 text-center whitespace-pre-line">
          <p className="text-[22px] font-semibold text-white leading-tight">
            Sua vaga está
            <br />
            <span style={{ color: "#276EF1" }}>quase chegando.</span>
          </p>
          
          <p className="mt-4 text-[14px] font-light max-w-[280px] mx-auto leading-relaxed text-primary-foreground">
            {`




O acesso é liberado por convite.
Com a gente, freela é coisa séria.`}
          </p>
        </div>
      </div>

      {/* Botões */}
      <div
        className="relative z-10 px-6 pb-10 flex flex-col gap-3"
        style={{ animation: "fadeInUp 700ms ease-out 150ms both" }}
      >
        <button
          onClick={() => navigate("/convite")}
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
          style={{ background: "#276EF1" }}
        >
          <Ticket size={18} strokeWidth={2.4} />
          Já tenho convite
        </button>

        <button
          onClick={() => navigate("/pre-cadastro")}
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
          style={{
            background: "transparent",
            border: "1.5px solid rgba(255,255,255,0.18)",
          }}
        >
          <UserPlus size={18} strokeWidth={2.4} />
          Quero me cadastrar
        </button>

        <button
          onClick={() => navigate("/login")}
          className="mt-3 text-[13px] text-white/50 font-light transition active:scale-95"
        >
          Já tenho conta · <span className="text-white/80 font-medium">Entrar</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BoasVindasPage;
