import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import FreelakiButton from "@/components/ui/FreelakiButton";
import { supabase } from "@/integrations/supabase/client";

/* ───── step indicator ───── */
const StepIndicator = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-0 mt-4">
    {[1, 2, 3].map((step, i) => {
      const done = step < current;
      const active = step === current;
      return (
        <div key={step} className="flex items-center">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 28,
              height: 28,
              ...(done || active
                ? { background: "#276EF1" }
                : { background: "transparent", border: "1px solid #444" }),
            }}
          >
            {done ? (
              <Check size={14} color="#fff" strokeWidth={3} />
            ) : (
              <span className="font-semibold" style={{ fontSize: 13, color: done || active ? "#fff" : "#444" }}>
                {step}
              </span>
            )}
          </div>
          {i < 2 && <div style={{ width: 40, height: 1, background: "#444" }} />}
        </div>
      );
    })}
  </div>
);

/* ───── mask helpers ───── */
function maskCPFDisplay(cpf: string) {
  if (cpf.length < 11) return cpf;
  return `${cpf.slice(0, 3)}.***.***-${cpf.slice(9)}`;
}
function maskCNPJDisplay(cnpj: string) {
  if (cnpj.length < 14) return cnpj;
  return `${cnpj.slice(0, 2)}.${cnpj[2]}**.***/${cnpj.slice(8, 10)}**-${cnpj.slice(12)}`;
}
function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return p;
}

/* ───── component ───── */
const CadastroStep3 = () => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cpfError, setCpfError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  // Read data from previous steps
  const [step1, setStep1] = useState<{ name: string; email: string; phone: string; password: string } | null>(null);
  const [step2, setStep2] = useState<{ cpf_cnpj: string; cpf_cnpj_type: string } | null>(null);

  useEffect(() => {
    const s1 = sessionStorage.getItem("cadastro_step1");
    const s2 = sessionStorage.getItem("cadastro_step2");
    if (!s1 || !s2) {
      navigate("/cadastro", { replace: true });
      return;
    }
    setStep1(JSON.parse(s1));
    setStep2(JSON.parse(s2));
  }, [navigate]);

  if (!step1 || !step2) return null;

  const phoneDigits = step1.phone.replace(/\D/g, "");
  const docDisplay =
    step2.cpf_cnpj_type === "cpf"
      ? maskCPFDisplay(step2.cpf_cnpj)
      : maskCNPJDisplay(step2.cpf_cnpj);

  const rows = [
    { icon: "👤", label: "Nome", value: step1.name },
    { icon: "📧", label: "Email", value: step1.email },
    { icon: "📱", label: "Telefone", value: formatPhone(phoneDigits) },
    { icon: "🪪", label: step2.cpf_cnpj_type === "cpf" ? "CPF" : "CNPJ", value: docDisplay },
  ];

  const handleCreate = async () => {
    setLoading(true);
    setCpfError(false);
    setEmailError(false);
    try {
      // 0. Check duplicate CPF/CNPJ via RPC
      const cpfCnpjLimpo = step2.cpf_cnpj.replace(/\D/g, "");
      const { data: cpfExists, error: rpcError } = await supabase.rpc("check_cpf_cnpj_exists", {
        p_cpf_cnpj: cpfCnpjLimpo,
      });

      if (rpcError) {
        toast.error("Erro ao verificar documento. Tente novamente.");
        setLoading(false);
        return;
      }

      if (cpfExists === true) {
        setCpfError(true);
        setLoading(false);
        return;
      }

      // 0b. Check duplicate email via RPC
      const { data: emailExists, error: emailRpcError } = await supabase.rpc("check_email_exists", {
        p_email: step1.email.toLowerCase().trim(),
      });

      if (emailRpcError) {
        toast.error("Erro ao verificar email. Tente novamente.");
        setLoading(false);
        return;
      }

      if (emailExists === true) {
        setEmailError(true);
        setLoading(false);
        return;
      }

      // 1. Sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: step1.email,
        password: step1.password,
        options: {
          data: { full_name: step1.name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("profiles_cpf_cnpj_unique") || signUpError.message.includes("cpf_cnpj")) {
          setCpfError(true);
          return;
        } else if (signUpError.message.includes("User already registered")) {
          setEmailError(true);
        } else {
          toast.error("Erro ao criar conta. Tente novamente.");
        }
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        toast.error("Erro ao criar conta. Tente novamente.");
        return;
      }

      // 2. Update profile
      await supabase
        .from("profiles")
        .update({
          full_name: step1.name,
          phone: phoneDigits,
          cpf_cnpj: step2.cpf_cnpj,
          cpf_cnpj_type: step2.cpf_cnpj_type,
          cpf_cnpj_locked: true,
          email_locked: true,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // 3. Get active terms
      const { data: termsData } = await supabase
        .from("terms")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single();

      // 4. Insert terms acceptance
      if (termsData) {
        await supabase.from("terms_acceptance").insert({
          profile_id: userId,
          terms_id: termsData.id,
          accepted_at: new Date().toISOString(),
        });
      }

      // 5. Clear session storage
      sessionStorage.removeItem("cadastro_step1");
      sessionStorage.removeItem("cadastro_step2");

      // 6. Redirect
      navigate("/categorias", { replace: true });
    } catch {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* UPPER */}
      <div className="flex flex-col" style={{ padding: "56px 28px 32px" }}>
        <div className="flex items-center gap-2">
          <Zap size={20} fill="#276EF1" color="#276EF1" />
          <span className="text-[18px] font-bold tracking-tight text-white">freelaki</span>
        </div>

        <h1 className="leading-[1.1]" style={{ fontSize: 36, marginTop: 20 }}>
          <span className="font-light text-white">Quase</span>
          <br />
          <span className="font-extrabold" style={{ color: "#276EF1" }}>lá!</span>
        </h1>

        <p className="font-light" style={{ fontSize: 13, color: "#767676", marginTop: 8 }}>
          Etapa 3 de 3 — Confirmar dados
        </p>

        <StepIndicator current={3} />
      </div>

      {/* LOWER */}
      <div
        className="relative flex flex-1 flex-col bg-background animate-slide-up overflow-y-auto"
        style={{ borderRadius: "28px 28px 0 0", padding: "28px 24px" }}
      >
        <span className="text-[11px] font-semibold tracking-[2px] text-muted-foreground">
          REVISE SEUS DADOS
        </span>

        {/* Review card */}
        <div style={{ marginTop: 16, background: "#F7F7F7", borderRadius: 16, padding: 16 }}>
          {rows.map((row, i) => (
            <div
              key={row.label}
              className="flex items-center gap-3"
              style={{
                paddingTop: 10,
                paddingBottom: 10,
                ...(i < rows.length - 1 && { borderBottom: "1px solid #E5E5E5" }),
              }}
            >
              <span style={{ fontSize: 18 }}>{row.icon}</span>
              <div className="flex flex-col">
                <span style={{ fontSize: 12, color: "#767676" }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#000" }}>{row.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CPF/CNPJ duplicate error */}
        {cpfError && (
          <div style={{ marginTop: 16, background: "#FFEBEE", borderRadius: 12, padding: "12px 16px" }}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} color="#C62828" className="shrink-0" style={{ marginTop: 2 }} />
              <p style={{ fontSize: 13, color: "#C62828", lineHeight: 1.5 }}>
                Este CPF/CNPJ já está cadastrado em outra conta.
                {"\n"}Se acredita ser um erro, entre em contato com suporte@freelaqui.com.br
              </p>
            </div>
            <button
              onClick={() => navigate("/cadastro/etapa2")}
              style={{ marginTop: 10, fontSize: 13, color: "#276EF1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              ← Voltar e corrigir
            </button>
          </div>
        )}

        {/* Email duplicate error */}
        {emailError && (
          <div style={{ marginTop: 16, background: "#FFEBEE", borderRadius: 12, padding: "12px 16px" }}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} color="#C62828" className="shrink-0" style={{ marginTop: 2 }} />
              <p style={{ fontSize: 13, color: "#C62828", lineHeight: 1.5 }}>
                Este email já está cadastrado em outra conta.
                {"\n"}Faça login ou recupere sua senha.
              </p>
            </div>
            <div className="flex gap-2" style={{ marginTop: 10 }}>
              <button
                onClick={() => navigate("/login")}
                style={{
                  fontSize: 13, fontWeight: 600, color: "#fff", background: "#276EF1",
                  border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer",
                }}
              >
                Fazer login →
              </button>
              <button
                onClick={() => navigate("/cadastro")}
                style={{
                  fontSize: 13, fontWeight: 600, color: "#276EF1", background: "#F7F7F7",
                  border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer",
                }}
              >
                ← Voltar e corrigir
              </button>
            </div>
          </div>
        )}

        {/* Confirmation checkbox */}
        <label className="flex cursor-pointer items-start gap-3" style={{ marginTop: 20 }}>
          <div
            className="flex shrink-0 items-center justify-center transition-colors"
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              marginTop: 1,
              ...(confirmed
                ? { background: "#276EF1" }
                : { border: "1.5px solid #E5E5E5", background: "transparent" }),
            }}
          >
            {confirmed && <Check size={14} color="#fff" strokeWidth={3} />}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={confirmed}
            onChange={() => setConfirmed(!confirmed)}
          />
          <span style={{ fontSize: 13, color: "#767676", lineHeight: 1.4 }}>
            Confirmo que todas as informações são verdadeiras e estou ciente que CPF/CNPJ não poderá ser alterado.
          </span>
        </label>

        {/* Buttons */}
        <div className="mt-auto flex flex-col gap-3" style={{ paddingTop: 24, paddingBottom: 32 }}>
          <FreelakiButton
            variant="primary"
            disabled={!confirmed}
            loading={loading}
            onClick={handleCreate}
            className="h-[54px] text-[16px] font-bold"
            style={{ borderRadius: 14, opacity: confirmed ? 1 : 0.4 } as any}
          >
            Criar minha conta →
          </FreelakiButton>
          <FreelakiButton
            variant="secondary"
            onClick={() => navigate("/cadastro/etapa2")}
            className="h-[54px] text-[16px]"
            style={{ borderRadius: 14 } as any}
          >
            ← Voltar
          </FreelakiButton>
        </div>
      </div>
    </div>
  );
};

export default CadastroStep3;
