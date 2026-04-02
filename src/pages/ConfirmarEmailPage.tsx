import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, AlertCircle, Clock, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import FreelakiButton from "@/components/ui/FreelakiButton";
import { supabase } from "@/integrations/supabase/client";

const ConfirmarEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || "";

  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [checking, setChecking] = useState(false);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) navigate("/cadastro", { replace: true });
  }, [email, navigate]);

  // Auto-check session every 5s
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email_confirmed_at) {
        navigate("/categorias", { replace: true });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        toast.error("Erro ao reenviar. Tente novamente.");
      } else {
        toast("Email reenviado! Verifique sua caixa de entrada.", {
          style: { background: "#000", color: "#fff" },
        });
        setCountdown(60);
      }
    } catch {
      toast.error("Erro ao reenviar.");
    } finally {
      setResending(false);
    }
  }, [email]);

  const handleCheckConfirmation = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email_confirmed_at) {
        navigate("/categorias", { replace: true });
      } else {
        toast.error("Email ainda não confirmado. Verifique sua caixa de entrada.");
      }
    } catch {
      toast.error("Erro ao verificar. Tente novamente.");
    } finally {
      setChecking(false);
    }
  }, [navigate]);

  if (!email) return null;

  const instructions = [
    {
      icon: <Mail size={18} color="#276EF1" className="shrink-0" />,
      text: "Abra o email que enviamos e clique no link de confirmação",
    },
    {
      icon: <AlertCircle size={18} color="#B45309" className="shrink-0" />,
      text: "Não encontrou? Verifique as pastas de Spam, Promoções ou Lixo eletrônico",
    },
    {
      icon: <Clock size={18} color="#767676" className="shrink-0" />,
      text: "O link expira em 24 horas",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* UPPER */}
      <div className="flex flex-col items-center text-center" style={{ padding: "56px 28px 0" }}>
        <div className="flex items-center gap-2">
          <Zap size={20} fill="#276EF1" color="#276EF1" />
          <span className="text-[18px] font-bold tracking-tight text-white">freelaki</span>
        </div>

        {/* Animated envelope */}
        <div className="relative" style={{ marginTop: 40, width: 72, height: 72 }}>
          {/* Pulse circle */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "#276EF1",
              opacity: 0.15,
              animation: "emailPulse 2s ease-in-out infinite",
            }}
          />
          <Mail
            size={72}
            color="#276EF1"
            strokeWidth={1.2}
            style={{ animation: "emailBounce 2s ease-in-out infinite", position: "relative", zIndex: 1 }}
          />
        </div>

        <h1 className="font-extrabold text-white" style={{ fontSize: 26, marginTop: 24 }}>
          Verifique seu email
        </h1>
        <p className="font-light" style={{ fontSize: 14, color: "#767676", marginTop: 8 }}>
          Enviamos um link de confirmação para:
        </p>
        <p className="font-bold text-white" style={{ fontSize: 16, marginTop: 4 }}>
          {email}
        </p>
      </div>

      {/* LOWER */}
      <div
        className="relative flex flex-1 flex-col bg-white"
        style={{ borderRadius: "28px 28px 0 0", padding: "28px 24px", marginTop: 32 }}
      >
        {/* Instructions card */}
        <div style={{ background: "#F7F7F7", borderRadius: 16, padding: 16, marginBottom: 24 }}>
          {instructions.map((item, i) => (
            <div key={i}>
              <div className="flex gap-3" style={{ padding: "10px 0" }}>
                {item.icon}
                <span style={{ fontSize: 13, color: "#767676", lineHeight: 1.5 }}>{item.text}</span>
              </div>
              {i < instructions.length - 1 && <div style={{ height: 1, background: "#E5E5E5" }} />}
            </div>
          ))}
        </div>

        {/* Resend button */}
        <FreelakiButton
          variant="secondary"
          disabled={countdown > 0 || resending}
          loading={resending}
          onClick={handleResend}
          className="h-[54px] text-[16px]"
          style={{ borderRadius: 14, width: "100%" } as any}
        >
          {countdown > 0 ? (
            <span style={{ color: "#767676" }}>Reenviar em {countdown}s</span>
          ) : (
            "Reenviar email de confirmação"
          )}
        </FreelakiButton>

        {/* Check confirmation button */}
        <FreelakiButton
          variant="primary"
          loading={checking}
          onClick={handleCheckConfirmation}
          className="h-[54px] text-[16px] font-bold"
          style={{ borderRadius: 14, width: "100%", marginTop: 12 } as any}
        >
          Já confirmei, continuar →
        </FreelakiButton>

        {/* Footer link */}
        <p className="text-center" style={{ fontSize: 13, color: "#767676", marginTop: 20 }}>
          Usar outro email?{" "}
          <button
            onClick={() => navigate("/cadastro")}
            style={{ color: "#276EF1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13 }}
          >
            Voltar ao cadastro
          </button>
        </p>
      </div>

      <style>{`
        @keyframes emailBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes emailPulse {
          0% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
};

export default ConfirmarEmailPage;
