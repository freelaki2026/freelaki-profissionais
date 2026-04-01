import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Check, AlertTriangle } from "lucide-react";
import FreelakiInput from "@/components/ui/FreelakiInput";
import FreelakiButton from "@/components/ui/FreelakiButton";

/* ───── masks ───── */
function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/* ───── validators ───── */
function validarCPF(cpf: string) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +cpf[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +cpf[10];
}

function validarCNPJ(cnpj: string) {
  cnpj = cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (cn: string, len: number) => {
    let s = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      s += +cn[len - i] * pos--;
      if (pos < 2) pos = 9;
    }
    return s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  return calc(cnpj, 12) === +cnpj[12] && calc(cnpj, 13) === +cnpj[13];
}

/* ───── step indicator (shared) ───── */
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
              <span
                className="font-semibold"
                style={{ fontSize: 13, color: done || active ? "#fff" : "#444" }}
              >
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

/* ───── component ───── */
const CadastroStep2 = () => {
  const navigate = useNavigate();

  const [docType, setDocType] = useState<"cpf" | "cnpj">("cpf");
  const [docValue, setDocValue] = useState("");
  const [touched, setTouched] = useState(false);

  const digits = docValue.replace(/\D/g, "");
  const isComplete = docType === "cpf" ? digits.length === 11 : digits.length === 14;
  const isValid = isComplete && (docType === "cpf" ? validarCPF(digits) : validarCNPJ(digits));
  const showError = touched && isComplete && !isValid;
  const showSuccess = touched && isValid;

  const handleContinue = () => {
    sessionStorage.setItem(
      "cadastro_step2",
      JSON.stringify({ cpf_cnpj: digits, cpf_cnpj_type: docType })
    );
    navigate("/cadastro/etapa3");
  };

  const handleBack = () => {
    navigate("/cadastro");
  };

  const switchType = (t: "cpf" | "cnpj") => {
    setDocType(t);
    setDocValue("");
    setTouched(false);
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
          <span className="font-light text-white">Sua</span>
          <br />
          <span className="font-extrabold" style={{ color: "#276EF1" }}>identidade</span>
        </h1>

        <p className="font-light" style={{ fontSize: 13, color: "#767676", marginTop: 8 }}>
          Etapa 2 de 3 — Identificação
        </p>

        <StepIndicator current={2} />
      </div>

      {/* LOWER */}
      <div
        className="relative flex flex-1 flex-col bg-background animate-slide-up overflow-y-auto"
        style={{ borderRadius: "28px 28px 0 0", padding: "28px 24px" }}
      >
        {/* Warning banner */}
        <div
          className="flex items-start gap-2"
          style={{
            background: "#FFF3E0",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
          }}
        >
          <AlertTriangle size={18} color="#B45309" className="shrink-0" style={{ marginTop: 1 }} />
          <span style={{ fontSize: 13, color: "#B45309", fontWeight: 500 }}>
            CPF/CNPJ não poderá ser alterado após o cadastro.
          </span>
        </div>

        {/* Type selector */}
        <div className="flex gap-2">
          {([
            { key: "cpf" as const, label: "Pessoa Física (CPF)" },
            { key: "cnpj" as const, label: "Pessoa Jurídica (CNPJ)" },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => switchType(opt.key)}
              className="flex-1 font-semibold transition-colors"
              style={{
                height: 46,
                borderRadius: 12,
                fontSize: 13,
                ...(docType === opt.key
                  ? { background: "#276EF1", color: "#fff" }
                  : { background: "#F7F7F7", color: "#767676" }),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Document input */}
        <div className="mt-5">
          <FreelakiInput
            label={docType === "cpf" ? "CPF" : "CNPJ"}
            placeholder={docType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
            value={docValue}
            onChange={(e) => {
              setDocValue(docType === "cpf" ? maskCPF(e.target.value) : maskCNPJ(e.target.value));
              if (touched) setTouched(false);
            }}
            onBlur={() => setTouched(true)}
            error={showError ? `${docType === "cpf" ? "CPF" : "CNPJ"} inválido. Verifique os números.` : undefined}
            className={showSuccess ? "border-[#2E7D32] focus:border-[#2E7D32]" : undefined}
            icon={showSuccess ? <Check size={20} color="#2E7D32" strokeWidth={3} /> : undefined}
          />
        </div>

        {/* Buttons */}
        <div className="mt-auto flex flex-col gap-3" style={{ paddingTop: 32, paddingBottom: 32 }}>
          <FreelakiButton
            variant="primary"
            disabled={!isValid}
            onClick={handleContinue}
            className="h-[54px] text-[16px] font-bold"
            style={{ borderRadius: 14, opacity: isValid ? 1 : 0.4 } as any}
          >
            Continuar →
          </FreelakiButton>
          <FreelakiButton
            variant="secondary"
            onClick={handleBack}
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

export default CadastroStep2;
