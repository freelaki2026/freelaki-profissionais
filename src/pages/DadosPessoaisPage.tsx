import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const maskCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const maskCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const validateCpf = (cpf: string): boolean => {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += +d[i] * (len + 1 - i);
    return s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  return calc(9) === +d[9] && calc(10) === +d[10];
};

const validateCnpj = (cnpj: string): boolean => {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (pos: number) => {
    const w = pos === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0;
    for (let i = 0; i < pos; i++) s += +d[i] * w[i];
    return s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
};

const maskedDisplay = (value: string, type: string) => {
  if (type === "cpf") {
    const d = value.replace(/\D/g, "");
    return `•••.•••.•••-${d.slice(9, 11) || "••"}`;
  }
  const d = value.replace(/\D/g, "");
  return `••.•••.•••/••••-${d.slice(12, 14) || "••"}`;
};

export default function DadosPessoaisPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cpfCnpjType, setCpfCnpjType] = useState<"cpf" | "cnpj">("cpf");
  const [cpfCnpjLocked, setCpfCnpjLocked] = useState(false);
  const [cpfCnpjError, setCpfCnpjError] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setPhone(data.phone ? maskPhone(data.phone) : "");
          setEmail(data.email || "");
          setBirthDate((data as any).birth_date || "");
          setCpfCnpj(data.cpf_cnpj || "");
          setCpfCnpjType((data.cpf_cnpj_type as "cpf" | "cnpj") || "cpf");
          setCpfCnpjLocked(data.cpf_cnpj_locked || false);
        }
        setLoading(false);
      });
  }, [user]);

  const validateDoc = () => {
    if (!cpfCnpj) { setCpfCnpjError(""); return true; }
    const digits = cpfCnpj.replace(/\D/g, "");
    if (cpfCnpjType === "cpf") {
      if (digits.length < 11) { setCpfCnpjError("CPF incompleto"); return false; }
      if (!validateCpf(digits)) { setCpfCnpjError("CPF inválido"); return false; }
    } else {
      if (digits.length < 14) { setCpfCnpjError("CNPJ incompleto"); return false; }
      if (!validateCnpj(digits)) { setCpfCnpjError("CNPJ inválido"); return false; }
    }
    setCpfCnpjError("");
    return true;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!cpfCnpjLocked && cpfCnpj && !validateDoc()) return;
    setSaving(true);
    const updates: { full_name: string; phone: string; birth_date?: string | null; cpf_cnpj?: string; cpf_cnpj_type?: string; cpf_cnpj_locked?: boolean } = {
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ""),
      birth_date: birthDate || null,
    };
    if (!cpfCnpjLocked && cpfCnpj) {
      updates.cpf_cnpj = cpfCnpj.replace(/\D/g, "");
      updates.cpf_cnpj_type = cpfCnpjType;
      updates.cpf_cnpj_locked = true;
    }
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar. Tente novamente.");
    } else {
      if (!cpfCnpjLocked && cpfCnpj) setCpfCnpjLocked(true);
      toast("Dados atualizados! ✓", { style: { background: "#000", color: "#fff" } });
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="flex items-center px-6 pb-6" style={{ paddingTop: 52 }}>
        <button onClick={() => navigate(-1)} className="z-10">
          <ArrowLeft size={24} color="#FFFFFF" />
        </button>
        <h1 className="flex-1 text-center font-semibold text-[17px] text-white -ml-6">
          Dados Pessoais
        </h1>
        <div className="w-6" />
      </div>

      {/* Body */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1"
        style={{ background: "#F7F7F7", borderRadius: "24px 24px 0 0", padding: "20px 16px" }}
      >
        {/* DADOS DE ACESSO */}
        <p className="text-[10px] font-semibold tracking-[2px]" style={{ color: "#767676" }}>
          DADOS DE ACESSO
        </p>
        <div className="mt-2.5 rounded-2xl bg-white p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="text-sm font-medium text-foreground">Nome completo</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 flex h-[52px] w-full rounded-xl border border-[#E5E5E5] bg-white px-4 text-base text-foreground placeholder:text-[#767676] focus:border-2 focus:border-[#276EF1] focus:outline-none"
              placeholder="Seu nome completo"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="text-sm font-medium text-foreground">Telefone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              className="mt-1.5 flex h-[52px] w-full rounded-xl border border-[#E5E5E5] bg-white px-4 text-base text-foreground placeholder:text-[#767676] focus:border-2 focus:border-[#276EF1] focus:outline-none"
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative mt-1.5">
              <input
                value={email}
                disabled
                className="flex h-[52px] w-full rounded-xl border border-[#E5E5E5] px-4 pr-12 text-base disabled:cursor-not-allowed"
                style={{ background: "#F7F7F7", color: "#767676" }}
              />
              <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#767676" }} />
            </div>
            <p className="mt-1 text-xs" style={{ color: "#767676" }}>
              Alteração somente via{" "}
              <button onClick={() => navigate("/suporte")} className="font-medium" style={{ color: "#276EF1" }}>
                suporte
              </button>
            </p>
          </div>
        </div>

        {/* IDENTIFICAÇÃO */}
        <p className="mt-5 text-[10px] font-semibold tracking-[2px]" style={{ color: "#767676" }}>
          IDENTIFICAÇÃO
        </p>
        <div className="mt-2.5 rounded-2xl bg-white p-5">
          {cpfCnpjLocked ? (
            <>
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold mb-3"
                style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}
              >
                {cpfCnpjType === "cpf" ? "CPF" : "CNPJ"}
              </span>
              <div className="relative">
                <input
                  value={maskedDisplay(cpfCnpj, cpfCnpjType)}
                  disabled
                  className="flex h-[52px] w-full rounded-xl border border-[#E5E5E5] px-4 pr-12 text-base disabled:cursor-not-allowed"
                  style={{ background: "#F7F7F7", color: "#767676" }}
                />
                <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#767676" }} />
              </div>
              <div className="mt-2 flex items-start gap-2 rounded-[10px] p-2.5 px-3" style={{ background: "#F7F7F7" }}>
                <Lock size={14} className="mt-0.5 shrink-0" style={{ color: "#767676" }} />
                <p className="text-xs" style={{ color: "#767676" }}>
                  CPF/CNPJ não pode ser alterado. Em caso de erro, acione o{" "}
                  <button onClick={() => navigate("/suporte")} className="font-medium" style={{ color: "#276EF1" }}>
                    suporte
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 rounded-[10px] p-3" style={{ background: "#FFEBEE" }}>
                <p className="text-[13px] font-medium" style={{ color: "#C62828" }}>
                  ⚠️ Esta informação NÃO poderá ser alterada após salvar.
                </p>
              </div>

              {/* Toggle CPF / CNPJ */}
              <div className="flex gap-2 mb-4">
                {(["cpf", "cnpj"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setCpfCnpjType(t); setCpfCnpj(""); setCpfCnpjError(""); }}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold transition-colors"
                    style={{
                      background: cpfCnpjType === t ? "#276EF1" : "#F7F7F7",
                      color: cpfCnpjType === t ? "#FFFFFF" : "#767676",
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              <input
                value={cpfCnpjType === "cpf" ? maskCpf(cpfCnpj) : maskCnpj(cpfCnpj)}
                onChange={(e) => { setCpfCnpj(e.target.value.replace(/\D/g, "")); setCpfCnpjError(""); }}
                onBlur={validateDoc}
                className="flex h-[52px] w-full rounded-xl border px-4 text-base focus:border-2 focus:outline-none"
                style={{
                  borderColor: cpfCnpjError ? "#C62828" : "#E5E5E5",
                }}
                placeholder={cpfCnpjType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                inputMode="numeric"
              />
              {cpfCnpjError && (
                <p className="mt-1 text-xs" style={{ color: "#C62828" }}>{cpfCnpjError}</p>
              )}
            </>
          )}
        </div>

        {/* Salvar */}
        <button
          onClick={handleSave}
          disabled={saving || !fullName.trim()}
          className="mt-6 w-full h-[52px] rounded-2xl text-base font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "#276EF1" }}
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>

        <div className="h-10" />
      </motion.div>
    </div>
  );
}
