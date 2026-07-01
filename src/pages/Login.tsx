import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import FreelakiInput from "@/components/ui/FreelakiInput";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { parseError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FreelakiButton from "@/components/ui/FreelakiButton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string; hint?: string } | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<{ code: string; message: string; hint?: string } | null>(null);

  const [deletionConfirm, setDeletionConfirm] = useState<{ userId: string; email: string } | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      cascadeNavigate(user);
    }
     
  }, [user, authLoading]);

  const cascadeNavigate = async (u: any) => {
    if (!u.email_confirmed_at) {
      navigate("/confirmar-email", { replace: true, state: { email: u.email } });
      return;
    }
    // Antes de qualquer redirect, verifica se a conta está em processo de exclusão.
    const { data: profile } = await supabase
      .from("profiles")
      .select("deletion_requested_at")
      .eq("id", u.id)
      .maybeSingle();
    if (profile?.deletion_requested_at) {
      // Pergunta se realmente quer acessar a conta em exclusão.
      setDeletionConfirm({ userId: u.id, email: u.email ?? "" });
      return;
    }
    const { count } = await supabase
      .from("professional_categories")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", u.id);
    if ((count ?? 0) === 0) {
      navigate("/categorias", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const confirmEnterDeletion = () => {
    setDeletionConfirm(null);
    navigate("/conta-em-exclusao", { replace: true });
  };

  const cancelEnterDeletion = async () => {
    setDeletionConfirm(null);
    await supabase.auth.signOut();
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await cascadeNavigate(session.user);
      }
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetLoading(true);
    setResetError(null);
    try {
      await resetPassword(resetEmail);
      toast.success("Link de recuperação enviado para seu email");
      setResetOpen(false);
      setResetEmail("");
    } catch (err) {
      setResetError(parseError(err));
    } finally {
      setResetLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn("rafael.mendes+demo@freelaki.com", "DemoFreelaki2026!");
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await cascadeNavigate(session.user);
      }
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setLoading(false);
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
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <FreelakiInput
            label="Senha"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
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

        {/* Error banner */}
        {error && (
          <div style={{ marginTop: 12 }}>
            <ErrorBanner
              code={error.code}
              message={error.message}
              hint={error.hint}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

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
      <Dialog open={resetOpen} onOpenChange={(open) => { setResetOpen(open); if (!open) setResetError(null); }}>
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
              onChange={(e) => { setResetEmail(e.target.value); setResetError(null); }}
            />
            {resetError && (
              <ErrorBanner
                code={resetError.code}
                message={resetError.message}
                hint={resetError.hint}
                onDismiss={() => setResetError(null)}
              />
            )}
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

      {/* Confirmação ao acessar conta em processo de exclusão */}
      <Dialog open={!!deletionConfirm} onOpenChange={(open) => { if (!open) cancelEnterDeletion(); }}>
        <DialogContent className="mx-4 max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Conta em processo de exclusão</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <p className="text-[14px] text-muted-foreground">
              Esta conta ({deletionConfirm?.email}) está marcada para exclusão. Deseja entrar mesmo assim para reativá-la ou apenas conferir?
            </p>
            <FreelakiButton variant="primary" onClick={confirmEnterDeletion}>
              Sim, acessar conta
            </FreelakiButton>
            <button
              onClick={cancelEnterDeletion}
              className="h-[52px] w-full rounded-xl border border-border text-[15px] font-semibold text-foreground"
            >
              Cancelar e sair
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
