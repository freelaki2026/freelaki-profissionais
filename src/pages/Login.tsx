import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import FreelakiInput from "@/components/ui/FreelakiInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FreelakiButton from "@/components/ui/FreelakiButton";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else if (msg.includes("Email not confirmed")) {
        toast.error("Confirme seu email antes de entrar");
      } else {
        toast.error("Erro ao fazer login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      toast.success("Link de recuperação enviado para seu email");
      setResetOpen(false);
      setResetEmail("");
    } catch {
      toast.error("Erro ao enviar link de recuperação");
    } finally {
      setResetLoading(false);
    }
  };

  const isDisabled = !email.trim() || !password.trim();

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* UPPER — 40% black hero */}
      <div className="relative flex flex-col" style={{ minHeight: "40vh" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6" style={{ paddingTop: 52 }}>
          <Zap size={20} className="text-primary" fill="currentColor" />
          <span className="text-[18px] font-bold tracking-tight text-white">freelaki</span>
        </div>

        {/* Hero text */}
        <div className="flex flex-1 flex-col justify-center px-6 pb-10">
          <h1 className="leading-[1.1]" style={{ fontSize: 42 }}>
            <span className="font-light text-white">Suas</span>
            <br />
            <span className="font-extrabold text-primary">oportunidades</span>
            <br />
            <span className="font-light text-white">te esperam.</span>
          </h1>
          <p className="mt-3 text-[14px] font-light text-[hsl(var(--muted-foreground))]">
            Faça login e fique online.
          </p>
        </div>
      </div>

      {/* LOWER — white card */}
      <div
        className="relative flex flex-1 flex-col bg-background animate-slide-up"
        style={{ borderRadius: "28px 28px 0 0", padding: "32px 24px", marginTop: -8 }}
      >
        <span
          className="text-[11px] font-semibold tracking-[2px] text-muted-foreground"
        >
          ACESSE SUA CONTA
        </span>

        <div style={{ marginTop: 20 }}>
          <FreelakiInput
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <FreelakiInput
            label="Senha"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />
        </div>

        <div className="flex justify-end" style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="text-[13px] font-medium text-primary"
          >
            Esqueci minha senha
          </button>
        </div>

        {/* Primary CTA */}
        <button
          disabled={isDisabled || loading}
          onClick={handleLogin}
          className="mt-7 flex h-[54px] w-full items-center justify-center gap-1 bg-primary text-white font-bold text-[16px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
          style={{ borderRadius: 14 }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>Entrar →</>
          )}
        </button>

        {/* Secondary CTA */}
        <button
          onClick={() => navigate("/cadastro")}
          className="mt-3 flex h-[54px] w-full items-center justify-center font-semibold text-[16px] text-foreground transition-colors hover:bg-muted"
          style={{ borderRadius: 14, backgroundColor: "#F7F7F7" }}
        >
          Criar conta
        </button>

        {/* Footer */}
        <p className="mt-5 text-center text-[12px] text-muted-foreground">
          Ao continuar, você aceita os{" "}
          <button
            type="button"
            onClick={() => navigate("/termos")}
            className="text-primary underline-offset-2 hover:underline"
          >
            Termos de Uso
          </button>
        </p>
      </div>

      {/* Reset Password Modal */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="mx-4 max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Recuperar senha</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <FreelakiInput
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <FreelakiButton
              variant="primary"
              loading={resetLoading}
              disabled={!resetEmail.trim()}
              onClick={handleReset}
            >
              Enviar link
            </FreelakiButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
