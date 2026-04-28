import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Eye, EyeOff, Check, AlertTriangle, Lock } from "lucide-react";
import FreelakiInput from "@/components/ui/FreelakiInput";
import FreelakiButton from "@/components/ui/FreelakiButton";
import { supabase } from "@/integrations/supabase/client";

/* ───── phone mask ───── */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/* ───── birth date mask DD/MM/YYYY ───── */
function maskBirthDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Returns age in years if the date is valid + complete, otherwise null */
function ageFromBR(value: string): number | null {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > new Date().getFullYear()) return null;
  const dob = new Date(year, month - 1, day);
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m2 = today.getMonth() - dob.getMonth();
  if (m2 < 0 || (m2 === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/** Convert DD/MM/YYYY to ISO YYYY-MM-DD */
function brToISO(value: string): string | null {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
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
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");

  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [emailLocked, setEmailLocked] = useState(false);
  const [gateChecking, setGateChecking] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms] = useState(false);
  const [age18, setAge18] = useState(false);

  // Gate de convite: precisa ter token válido na URL OU em sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("invite_token");
    const storedEmail = sessionStorage.getItem("invite_email");

    const validate = async (code: string, mail: string) => {
      const { data } = await supabase.rpc("validate_invite_code", {
        p_code: code,
        p_email: mail,
      });
      const r = data as { valid: boolean } | null;
      if (r?.valid) {
        setInviteToken(code);
        setEmail(mail);
        setEmailLocked(true);
        sessionStorage.setItem("invite_token", code);
        sessionStorage.setItem("invite_email", mail);
        setGateChecking(false);
      } else {
        sessionStorage.removeItem("invite_token");
        sessionStorage.removeItem("invite_email");
        navigate("/", { replace: true });
      }
    };

    if (tokenFromUrl && emailFromUrl) {
      void validate(tokenFromUrl, emailFromUrl);
    } else if (stored && storedEmail) {
      void validate(stored, storedEmail);
    } else {
      navigate("/", { replace: true });
    }
  }, [tokenFromUrl, emailFromUrl, navigate]);

  const pw8 = password.length >= 8;
  const pwMatch = confirm.length > 0 && password === confirm;
  const phoneDigits = phone.replace(/\D/g, "");
  const nameParts = name.trim().split(/\s+/).filter((p) => p.length >= 2);
  const fullNameValid = nameParts.length >= 2;

  const computedAge = ageFromBR(birthDate);
  const birthComplete = birthDate.length === 10;
  const ageValid = computedAge !== null && computedAge >= 18;
  const ageInvalid = birthComplete && (computedAge === null || computedAge < 18);

  const valid =
    fullNameValid &&
    email.trim().length > 0 &&
    phoneDigits.length === 11 &&
    ageValid &&
    pw8 &&
    pwMatch &&
    terms &&
    age18;

  const handleContinue = () => {
    const iso = brToISO(birthDate);
    sessionStorage.setItem(
      "cadastro_step1",
      JSON.stringify({ name, email, phone, password, birth_date: iso, invite_token: inviteToken })
    );
    navigate("/cadastro/etapa2");
  };

  if (gateChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

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
          <div>
            <FreelakiInput
              label="Nome completo"
              placeholder="Nome e sobrenome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {name.trim().length > 0 && !fullNameValid && (
              <p className="mt-1" style={{ fontSize: 12, color: "#E53935" }}>
                Informe nome e sobrenome
              </p>
            )}
          </div>

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

          {/* Birth date */}
          <div>
            <FreelakiInput
              label="Data de nascimento"
              type="tel"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              value={birthDate}
              onChange={(e) => setBirthDate(maskBirthDate(e.target.value))}
              className={
                ageInvalid
                  ? "border-[#E53935] focus:border-[#E53935]"
                  : ageValid
                  ? "border-[#2E7D32] focus:border-[#2E7D32]"
                  : undefined
              }
              icon={
                ageValid ? (
                  <Check size={20} color="#2E7D32" strokeWidth={3} />
                ) : ageInvalid ? (
                  <AlertTriangle size={18} color="#E53935" />
                ) : undefined
              }
            />
            {ageInvalid && (
              <p
                className="mt-1 flex items-center gap-1"
                style={{ fontSize: 12, color: "#E53935" }}
              >
                {computedAge !== null && computedAge < 18
                  ? "Você precisa ter 18 anos ou mais para se cadastrar"
                  : "Data inválida"}
              </p>
            )}
            {!ageInvalid && (
              <p className="mt-1" style={{ fontSize: 11, color: "#767676" }}>
                Idade mínima: 18 anos. Será verificada com seu documento.
              </p>
            )}
          </div>

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

        {/* Age 18+ declaration checkbox */}
        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <div
            className="flex shrink-0 items-center justify-center transition-colors"
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              marginTop: 1,
              ...(age18
                ? { background: "#276EF1" }
                : { border: "1.5px solid #E5E5E5", background: "transparent" }),
            }}
          >
            {age18 && <Check size={14} color="#fff" strokeWidth={3} />}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={age18}
            onChange={() => setAge18(!age18)}
          />
          <span style={{ fontSize: 13, color: "#767676", lineHeight: 1.4 }}>
            Declaro ter <strong style={{ color: "#000" }}>18 anos ou mais</strong> e
            possuir capacidade civil para contratar.
          </span>
        </label>

        {/* Terms checkbox */}
        <label className="mt-3 flex cursor-pointer items-start gap-3">
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
