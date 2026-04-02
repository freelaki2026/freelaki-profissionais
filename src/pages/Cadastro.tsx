import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Eye, EyeOff, Check } from "lucide-react";
import FreelakiInput from "@/components/ui/FreelakiInput";
import FreelakiButton from "@/components/ui/FreelakiButton";

/* ───── phone mask ───── */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

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
              <span
                className="font-semibold"
                style={{
                  fontSize: 13,
                  color: done || active ? "#fff" : "#444",
                }}
              >
                {step}
              </span>
            )}
          </div>
          {i < 2 && (
            <div style={{ width: 40, height: 1, background: "#444" }} />
          )}
        </div>
      );
    })}
  </div>
);

/* ───── main ───── */
const CadastroStep1 = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms] = useState(false);

  const pw8 = password.length >= 8;
  const pwMatch = confirm.length > 0 && password === confirm;
  const phoneDigits = phone.replace(/\D/g, "");

  const valid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    phoneDigits.length === 11 &&
    pw8 &&
    pwMatch &&
    terms;

  const handleContinue = () => {
    // Save to sessionStorage so step 2 can read it
    sessionStorage.setItem(
      "cadastro_step1",
      JSON.stringify({ name, email, phone, password })
    );
    navigate("/cadastro/etapa2");
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* UPPER */}
      <div className="flex flex-col" style={{ padding: "56px 28px 32px" }}>
        <div className="flex items-center gap-2">
          <Zap size={20} fill="#276EF1" color="#276EF1" />
          <span className="text-[18px] font-bold tracking-tight text-white">
            freelaki
          </span>
        </div>

        <h1 className="leading-[1.1]" style={{ fontSize: 36, marginTop: 20 }}>
          <span className="font-light text-white">Crie sua</span>
          <br />
          <span className="font-extrabold" style={{ color: "#276EF1" }}>
            conta
          </span>
        </h1>

        <p
          className="font-light"
          style={{ fontSize: 13, color: "#767676", marginTop: 8 }}
        >
          Etapa 1 de 3 — Dados de acesso
        </p>

        <StepIndicator current={1} />
      </div>

      {/* LOWER — white card */}
      <div
        className="relative flex flex-1 flex-col bg-background animate-slide-up overflow-y-auto"
        style={{ borderRadius: "28px 28px 0 0", padding: "28px 24px" }}
      >
        <span className="text-[11px] font-semibold tracking-[2px] text-muted-foreground">
          DADOS DE ACESSO
        </span>

        <div className="mt-5 flex flex-col gap-4">
          <FreelakiInput
            label="Nome completo"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <FreelakiInput
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <FreelakiInput
            label="Telefone"
            type="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
          />

          {/* Password */}
          <div>
            <FreelakiInput
              label="Senha"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
            />
            <p
              className="mt-1 flex items-center gap-1"
              style={{
                fontSize: 11,
                color: pw8 ? "#2E7D32" : "#767676",
              }}
            >
              {pw8 && <Check size={12} strokeWidth={3} />}
              Mínimo 8 caracteres
            </p>
          </div>

          {/* Confirm */}
          <div>
            <FreelakiInput
              label="Confirmar senha"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={
                confirm.length > 0
                  ? pwMatch
                    ? "border-[#2E7D32] focus:border-[#2E7D32]"
                    : "border-[#E53935] focus:border-[#E53935]"
                  : undefined
              }
              icon={
                pwMatch ? (
                  <Check size={20} color="#2E7D32" strokeWidth={3} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                )
              }
            />
            {confirm.length > 0 && !pwMatch && (
              <p className="mt-1" style={{ fontSize: 12, color: "#E53935" }}>
                As senhas não coincidem
              </p>
            )}
          </div>
        </div>

        {/* Terms checkbox */}
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <div
            className="flex shrink-0 items-center justify-center transition-colors"
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              marginTop: 1,
              ...(terms
                ? { background: "#276EF1" }
                : { border: "1.5px solid #E5E5E5", background: "transparent" }),
            }}
          >
            {terms && <Check size={14} color="#fff" strokeWidth={3} />}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={terms}
            onChange={() => setTerms(!terms)}
          />
          <span style={{ fontSize: 13, color: "#767676", lineHeight: 1.4 }}>
            Li e aceito os{" "}
            <a
              href="/termos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              Termos e Condições
            </a>
          </span>
        </label>

        {/* CTA */}
        <div style={{ marginTop: 24, paddingBottom: 32 }}>
          <FreelakiButton
            variant="primary"
            disabled={!valid}
            onClick={handleContinue}
            className="h-[54px] text-[16px] font-bold"
            style={{ borderRadius: 14, opacity: valid ? 1 : 0.4 } as any}
          >
            Continuar →
          </FreelakiButton>
        </div>
      </div>
    </div>
  );
};

export default CadastroStep1;
