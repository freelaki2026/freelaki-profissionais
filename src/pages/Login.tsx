import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import FreelakiButton from "@/components/ui/FreelakiButton";
import FreelakiInput from "@/components/ui/FreelakiInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header / Logo */}
      <div className="flex justify-center" style={{ marginTop: 56 }}>
        <span>
          <span className="text-[22px] font-bold text-foreground" style={{ letterSpacing: -0.5 }}>
            freelaki
          </span>
          <span className="text-[14px] font-normal text-muted-foreground ml-1">
            profissionais
          </span>
        </span>
      </div>

      {/* Content */}
      <div className="px-6">
        <h1 className="text-[26px] font-semibold text-foreground" style={{ marginTop: 40 }}>
          Bem-vindo de volta
        </h1>
        <p className="text-[14px] text-muted-foreground" style={{ marginTop: 6 }}>
          Acesse suas oportunidades
        </p>

        <div style={{ marginTop: 32 }}>
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
            className="text-[14px] font-medium text-primary"
          >
            Esqueci minha senha
          </button>
        </div>

        <div style={{ marginTop: 24 }}>
          <FreelakiButton
            variant="primary"
            loading={loading}
            disabled={isDisabled}
            onClick={handleLogin}
          >
            Entrar
          </FreelakiButton>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3" style={{ margin: "20px 0" }}>
          <div className="h-px flex-1 bg-border" />
          <span className="text-[14px] text-muted-foreground">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <FreelakiButton variant="secondary" onClick={() => navigate("/cadastro")}>
          Criar conta
        </FreelakiButton>
      </div>

      {/* Footer */}
      <div className="fixed bottom-6 left-0 w-full text-center px-6">
        <p className="text-[12px] text-muted-foreground">
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
