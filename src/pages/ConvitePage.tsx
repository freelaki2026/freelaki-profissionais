import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ticket, Loader2 } from "lucide-react";
import FreelakiInput from "@/components/ui/FreelakiInput";
import FreelakiButton from "@/components/ui/FreelakiButton";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { supabase } from "@/integrations/supabase/client";

const errorMessages: Record<string, { message: string; hint?: string }> = {
  code_not_found: { message: "Código não encontrado.", hint: "Verifique se digitou corretamente." },
  code_already_used: { message: "Esse código já foi usado.", hint: "Cada convite serve para um cadastro só." },
  code_expired: { message: "Esse código expirou.", hint: "Entre em contato com o time Freelaki para renovar." },
  email_mismatch: { message: "O email não confere com o convite.", hint: "Use o email que você cadastrou na lista de espera." },
};

const ConvitePage = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string; hint?: string } | null>(null);

  const formatCode = (v: string) => {
    const clean = v.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 11);
    // FRLK-XXXXXX
    if (clean.length <= 4) return clean;
    if (clean[4] !== "-") return clean.slice(0, 4) + "-" + clean.slice(4).replace(/-/g, "");
    return clean;
  };

  const handleSubmit = async () => {
    setError(null);
    if (code.trim().length < 11 || !email.includes("@")) {
      setError({ code: "invalid", message: "Preencha o código e o email." });
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("validate_invite_code", {
        p_code: code.trim(),
        p_email: email.trim().toLowerCase(),
      });
      if (rpcErr) throw rpcErr;
      const result = data as { valid: boolean; error?: string };
      if (!result.valid) {
        const msg = errorMessages[result.error ?? ""] ?? { message: "Não foi possível validar." };
        setError({ code: result.error ?? "invalid", ...msg });
        return;
      }
      // Sucesso → manda para o cadastro com token + email travado
      navigate(
        `/cadastro?token=${encodeURIComponent(code.trim())}&email=${encodeURIComponent(email.trim().toLowerCase())}`,
        { replace: true }
      );
    } catch {
      setError({ code: "unexpected", message: "Erro ao validar. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "#0A0A0F" }}>
      <div className="px-5 pt-6 pb-2">
        <button
          onClick={() => navigate("/")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 px-6 pt-4" style={{ animation: "fadeInUp 500ms ease-out both" }}>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "rgba(39,110,241,0.12)" }}
        >
          <Ticket size={22} color="#276EF1" strokeWidth={2.2} />
        </div>
        <h1 className="mt-5 text-[26px] font-bold text-white leading-tight">
          Tem o convite?
        </h1>
        <p className="mt-2 text-[14px] text-white/50 font-light leading-relaxed">
          Digite o código que você recebeu e o email cadastrado na lista de espera.
        </p>

        <div className="mt-8 space-y-3">
          <FreelakiInput
            label="Código de convite"
            value={code}
            onChange={(e) => setCode(formatCode(e.target.value))}
            placeholder="FRLK-XXXXXX"
            autoCapitalize="characters"
            autoCorrect="off"
          />
          <FreelakiInput
            label="Email cadastrado"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            type="email"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner code={error.code} message={error.message} hint={error.hint} />
          </div>
        )}
      </div>

      <div className="px-6 pb-10 pt-4">
        <FreelakiButton onClick={handleSubmit} loading={loading} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : "Validar convite"}
        </FreelakiButton>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ConvitePage;
