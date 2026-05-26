import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FreelakiInput from "@/components/ui/FreelakiInput";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { parseError } from "@/lib/errors";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string; hint?: string } | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase v2 grava a sessão a partir do hash automaticamente.
    // Escutamos PASSWORD_RECOVERY ou validamos a sessão existente.
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (session && window.location.hash.includes("type=recovery"))) {
        setRecoveryReady(true);
        setChecking(false);
      }
    });

    // Fallback: se já existe sessão e veio do link (hash com type=recovery)
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      const hash = window.location.hash;
      if (session && (hash.includes("type=recovery") || hash.includes("access_token"))) {
        setRecoveryReady(true);
      } else if (session) {
        // Sessão válida sem hash de recovery — permite trocar a senha mesmo assim.
        setRecoveryReady(true);
      } else {
        setError({
          code: "no_session",
          message: "Link inválido ou expirado",
          hint: "Solicite um novo link de recuperação de senha.",
        });
      }
      setChecking(false);
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError({ code: "weak_password", message: "A senha deve ter no mínimo 6 caracteres" });
      return;
    }
    if (password !== confirmPassword) {
      setError({ code: "mismatch", message: "As senhas não coincidem" });
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      toast.success("Senha atualizada com sucesso");
      // Encerra a sessão de recovery e redireciona ao login limpo.
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
      }, 1800);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !password.trim() || !confirmPassword.trim();

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="relative flex flex-col" style={{ minHeight: "40vh" }}>
        <div className="flex items-center justify-between px-6" style={{ paddingTop: 52 }}>
          <Zap size={20} className="text-primary" fill="currentColor" />
          <span className="text-[18px] font-bold tracking-tight text-white">freelaki</span>
        </div>
        <div className="flex flex-1 flex-col justify-center px-6 pb-10">
          <h1 className="leading-[1.1]" style={{ fontSize: 42 }}>
            <span className="font-light text-white">Defina sua</span>
            <br />
            <span className="font-extrabold text-primary">nova senha</span>
          </h1>
          <p className="mt-3 text-[14px] font-light text-[hsl(var(--muted-foreground))]">
            Use no mínimo 6 caracteres.
          </p>
        </div>
      </div>

      <div
        className="relative flex flex-1 flex-col bg-background animate-slide-up"
        style={{ borderRadius: "28px 28px 0 0", padding: "32px 24px", marginTop: -8 }}
      >
        {checking ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : success ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10">
            <CheckCircle2 className="h-14 w-14 text-primary" />
            <p className="text-[16px] font-semibold text-foreground">Senha atualizada!</p>
            <p className="text-[13px] text-muted-foreground">Redirecionando para o login…</p>
          </div>
        ) : !recoveryReady ? (
          <>
            {error && (
              <ErrorBanner
                code={error.code}
                message={error.message}
                hint={error.hint}
                onDismiss={() => setError(null)}
              />
            )}
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="mt-7 flex h-[54px] w-full items-center justify-center bg-primary text-white font-bold text-[16px] hover:bg-primary/90"
              style={{ borderRadius: 14 }}
            >
              Voltar ao login
            </button>
          </>
        ) : (
          <>
            <span className="text-[11px] font-semibold tracking-[2px] text-muted-foreground">
              NOVA SENHA
            </span>

            <div style={{ marginTop: 20 }}>
              <FreelakiInput
                label="Nova senha"
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

            <div style={{ marginTop: 16 }}>
              <FreelakiInput
                label="Confirmar nova senha"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              />
            </div>

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

            <button
              disabled={isDisabled || loading}
              onClick={handleSubmit}
              className="mt-7 flex h-[54px] w-full items-center justify-center gap-1 bg-primary text-white font-bold text-[16px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
              style={{ borderRadius: 14 }}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Salvar nova senha →</>}
            </button>

            <button
              onClick={() => navigate("/login", { replace: true })}
              className="mt-3 flex h-[54px] w-full items-center justify-center font-semibold text-[16px] text-foreground transition-colors hover:bg-muted"
              style={{ borderRadius: 14, backgroundColor: "#F7F7F7" }}
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
