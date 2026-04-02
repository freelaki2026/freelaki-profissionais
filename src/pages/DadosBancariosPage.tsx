import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Info, Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react";

const BANKS = [
  { code: "001", name: "Banco do Brasil" },
  { code: "033", name: "Santander" },
  { code: "077", name: "Inter" },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "237", name: "Bradesco" },
  { code: "260", name: "Nubank" },
  { code: "336", name: "C6 Bank" },
  { code: "341", name: "Itaú" },
  { code: "748", name: "Sicredi" },
  { code: "756", name: "Sicoob" },
  { code: "outro", name: "Outro (digitar código)" },
];

const PIX_KEY_TYPES = ["CPF", "CNPJ", "Email", "Telefone", "Aleatória"] as const;

type PixKeyType = typeof PIX_KEY_TYPES[number];

function maskCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskCNPJ(v: string) {
  return v.replace(/\D/g, "").slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 2) return `+${d}`;
  if (d.length <= 4) return `+${d.slice(0, 2)} (${d.slice(2)}`;
  if (d.length <= 9) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
}

function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const calc = (str: string, len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += +str[i] * (len + 1 - i);
    return s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  return calc(c, 9) === +c[9] && calc(c, 10) === +c[10];
}
function validateCNPJ(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (str: string, len: number) => {
    let s = 0;
    const w = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    for (let i = 0; i < len; i++) s += +str[i] * w[i];
    return s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  return calc(c, 12) === +c[12] && calc(c, 13) === +c[13];
}

export default function DadosBancariosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<"pix" | "conta" | null>(null);

  // Method
  const [method, setMethod] = useState<"pix" | "conta">("pix");

  // Pix
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("CPF");
  const [pixKey, setPixKey] = useState("");

  // Conta
  const [bankCode, setBankCode] = useState("");
  const [customBankCode, setCustomBankCode] = useState("");
  const [accountType, setAccountType] = useState<"corrente" | "poupanca">("corrente");
  const [agency, setAgency] = useState("");
  const [agencyDigit, setAgencyDigit] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountDigit, setAccountDigit] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderDocType, setHolderDocType] = useState<"cpf" | "cnpj">("cpf");
  const [holderDoc, setHolderDoc] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("bank_accounts").select("*").eq("profile_id", user.id).maybeSingle();
      if (data) {
        setHasSavedData(true);
        setMethod(data.payment_type === "conta" ? "conta" : "pix");
        if (data.payment_type === "pix") {
          setPixKeyType((data.pix_key_type as PixKeyType) || "CPF");
          setPixKey(data.pix_key || "");
        } else {
          setBankCode(data.bank_code || "");
          setAccountType(data.account_type === "poupanca" ? "poupanca" : "corrente");
          setAgency(data.agency || "");
          setAgencyDigit(data.agency_digit || "");
          setAccountNumber(data.account_number || "");
          setAccountDigit(data.account_digit || "");
          setHolderName(data.account_holder_name || "");
          setHolderDoc(data.account_holder_cpf_cnpj || "");
          if (data.account_holder_cpf_cnpj && data.account_holder_cpf_cnpj.replace(/\D/g, "").length > 11) {
            setHolderDocType("cnpj");
          }
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const handleMethodChange = (m: "pix" | "conta") => {
    if (m === method) return;
    if (hasSavedData) {
      setPendingMethod(m);
      setShowConfirmModal(true);
    } else {
      setMethod(m);
    }
  };

  const confirmMethodChange = () => {
    if (pendingMethod) setMethod(pendingMethod);
    setPendingMethod(null);
    setShowConfirmModal(false);
  };

  const applyPixMask = (value: string) => {
    switch (pixKeyType) {
      case "CPF": return maskCPF(value);
      case "CNPJ": return maskCNPJ(value);
      case "Telefone": return maskPhone(value);
      default: return value;
    }
  };

  const isPixValid = () => {
    if (!pixKey.trim()) return false;
    const raw = pixKey.replace(/\D/g, "");
    if (pixKeyType === "CPF") return validateCPF(raw);
    if (pixKeyType === "CNPJ") return validateCNPJ(raw);
    if (pixKeyType === "Email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey);
    if (pixKeyType === "Telefone") return raw.length >= 12;
    return pixKey.trim().length > 10;
  };

  const isContaValid = () => {
    const bk = bankCode === "outro" ? customBankCode : bankCode;
    if (!bk || !agency || !accountNumber || !accountDigit || !holderName || !holderDoc) return false;
    const raw = holderDoc.replace(/\D/g, "");
    if (holderDocType === "cpf") return validateCPF(raw);
    return validateCNPJ(raw);
  };

  const canSave = method === "pix" ? isPixValid() : isContaValid();

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      const base: Record<string, unknown> = {
        profile_id: user.id,
        payment_type: method,
        updated_at: new Date().toISOString(),
      };

      if (method === "pix") {
        Object.assign(base, {
          pix_key_type: pixKeyType,
          pix_key: pixKey,
          bank_code: null, bank_name: null, agency: null, agency_digit: null,
          account_number: null, account_digit: null, account_type: null,
          account_holder_name: null, account_holder_cpf_cnpj: null,
        });
      } else {
        const bk = bankCode === "outro" ? customBankCode : bankCode;
        const bankObj = BANKS.find(b => b.code === bankCode);
        Object.assign(base, {
          bank_code: bk,
          bank_name: bankObj && bankCode !== "outro" ? bankObj.name : `Banco ${bk}`,
          agency, agency_digit: agencyDigit || null,
          account_number: accountNumber, account_digit: accountDigit,
          account_type: accountType,
          account_holder_name: holderName,
          account_holder_cpf_cnpj: holderDoc,
          pix_key: null, pix_key_type: null,
        });
      }

      const { data: existing } = await supabase.from("bank_accounts").select("id").eq("profile_id", user.id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("bank_accounts").update(base).eq("profile_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bank_accounts").insert(base as any);
        if (error) throw error;
      }
      setHasSavedData(true);
      toast.success("Dados bancários salvos! ✓", { style: { background: "#000", color: "#fff" } });
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#276EF1]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      {/* Header */}
      <div className="bg-black" style={{ padding: "52px 24px 24px" }}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 17, color: "#fff" }}>Dados Bancários</span>
          <div style={{ width: 24 }} />
        </div>
      </div>

      {/* Body */}
      <motion.div
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
        className="flex-1 overflow-y-auto"
        style={{ borderRadius: "24px 24px 0 0", marginTop: -1, padding: "20px 16px 40px" }}
      >
        {/* Banner */}
        <div className="flex items-start gap-3" style={{ background: "#E3F2FD", borderRadius: 14, padding: "12px 16px", marginBottom: 20 }}>
          <Info size={16} color="#1565C0" className="mt-0.5 shrink-0" />
          <span style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 13, color: "#1565C0" }}>
            Escolha como receber seus pagamentos. Apenas uma forma pode estar ativa.
          </span>
        </div>

        {/* Method selector */}
        <div className="flex gap-2">
          {(["pix", "conta"] as const).map(m => (
            <button
              key={m}
              onClick={() => handleMethodChange(m)}
              className="flex-1 transition-all duration-200"
              style={{
                height: 48, borderRadius: 14, fontFamily: "Inter", fontWeight: 600, fontSize: 15,
                background: method === m ? "#276EF1" : "#fff",
                color: method === m ? "#fff" : "#767676",
                border: method === m ? "none" : "1px solid #E5E5E5",
              }}
            >
              {m === "pix" ? "⚡ Pix" : "🏦 Conta Bancária"}
            </button>
          ))}
        </div>

        {/* PIX section */}
        {method === "pix" && (
          <div>
            <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600, fontFamily: "Inter", marginTop: 20 }}>
              CHAVE PIX
            </p>
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginTop: 10 }}>
              {/* Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {PIX_KEY_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => { setPixKeyType(t); setPixKey(""); }}
                    className="shrink-0 transition-all"
                    style={{
                      borderRadius: 20, padding: "8px 16px", fontFamily: "Inter", fontWeight: 600, fontSize: 13,
                      background: pixKeyType === t ? "#276EF1" : "#F7F7F7",
                      color: pixKeyType === t ? "#fff" : "#767676",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ marginTop: 16 }}>
                <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginBottom: 6 }}>
                  Chave Pix
                </label>
                <input
                  type={pixKeyType === "Email" ? "email" : "text"}
                  value={pixKey}
                  onChange={e => setPixKey(applyPixMask(e.target.value))}
                  placeholder={pixKeyType === "Aleatória" ? "Cole sua chave aleatória" : `Digite seu ${pixKeyType}`}
                  style={{
                    width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5",
                    padding: "0 16px", fontFamily: "Inter", fontSize: 15, outline: "none",
                    background: "#fff",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* CONTA section */}
        {method === "conta" && (
          <div>
            <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600, fontFamily: "Inter", marginTop: 20 }}>
              DADOS DA CONTA
            </p>
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginTop: 10 }}>
              {/* Banco */}
              <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginBottom: 6 }}>Banco</label>
              <select
                value={bankCode}
                onChange={e => setBankCode(e.target.value)}
                style={{
                  width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5",
                  padding: "0 12px", fontFamily: "Inter", fontSize: 14, background: "#fff", outline: "none",
                }}
              >
                <option value="">Selecione o banco</option>
                {BANKS.map(b => (
                  <option key={b.code} value={b.code}>{b.code === "outro" ? b.name : `${b.code} ${b.name}`}</option>
                ))}
              </select>

              {bankCode === "outro" && (
                <input
                  value={customBankCode}
                  onChange={e => setCustomBankCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Código do banco"
                  style={{
                    width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5",
                    padding: "0 16px", fontFamily: "Inter", fontSize: 15, marginTop: 8, outline: "none",
                  }}
                />
              )}

              {/* Tipo de conta */}
              <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginTop: 16, marginBottom: 6 }}>Tipo de conta</label>
              <div className="flex gap-2">
                {(["corrente", "poupanca"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setAccountType(t)}
                    className="flex-1 transition-all"
                    style={{
                      height: 44, borderRadius: 12, fontFamily: "Inter", fontWeight: 600, fontSize: 14,
                      background: accountType === t ? "#276EF1" : "#F7F7F7",
                      color: accountType === t ? "#fff" : "#767676",
                    }}
                  >
                    {t === "corrente" ? "Conta Corrente" : "Conta Poupança"}
                  </button>
                ))}
              </div>

              {/* Agência */}
              <div className="flex gap-2" style={{ marginTop: 16 }}>
                <div style={{ flex: "0 0 70%" }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginBottom: 6 }}>Agência</label>
                  <input
                    value={agency}
                    onChange={e => setAgency(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{ width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5", padding: "0 16px", fontFamily: "Inter", fontSize: 15, outline: "none" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginBottom: 6 }}>Díg.</label>
                  <input
                    value={agencyDigit}
                    onChange={e => setAgencyDigit(e.target.value.slice(0, 1))}
                    style={{ width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5", padding: "0 16px", fontFamily: "Inter", fontSize: 15, outline: "none" }}
                  />
                </div>
              </div>

              {/* Conta */}
              <div className="flex gap-2" style={{ marginTop: 16 }}>
                <div style={{ flex: "0 0 70%" }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginBottom: 6 }}>Número da conta</label>
                  <input
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    style={{ width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5", padding: "0 16px", fontFamily: "Inter", fontSize: 15, outline: "none" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginBottom: 6 }}>Díg.</label>
                  <input
                    value={accountDigit}
                    onChange={e => setAccountDigit(e.target.value.slice(0, 1))}
                    style={{ width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5", padding: "0 16px", fontFamily: "Inter", fontSize: 15, outline: "none" }}
                  />
                </div>
              </div>

              {/* Titular */}
              <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginTop: 16, marginBottom: 6 }}>Nome do titular</label>
              <input
                value={holderName}
                onChange={e => setHolderName(e.target.value)}
                style={{ width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5", padding: "0 16px", fontFamily: "Inter", fontSize: 15, outline: "none" }}
              />

              {/* CPF/CNPJ titular */}
              <label style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13, color: "#767676", display: "block", marginTop: 16, marginBottom: 6 }}>CPF/CNPJ do titular</label>
              <div className="flex gap-2 mb-2">
                {(["cpf", "cnpj"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setHolderDocType(t); setHolderDoc(""); }}
                    className="transition-all"
                    style={{
                      padding: "6px 18px", borderRadius: 10, fontFamily: "Inter", fontWeight: 600, fontSize: 13,
                      background: holderDocType === t ? "#276EF1" : "#F7F7F7",
                      color: holderDocType === t ? "#fff" : "#767676",
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
              <input
                value={holderDoc}
                onChange={e => setHolderDoc(holderDocType === "cpf" ? maskCPF(e.target.value) : maskCNPJ(e.target.value))}
                placeholder={holderDocType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                style={{ width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5", padding: "0 16px", fontFamily: "Inter", fontSize: 15, outline: "none" }}
              />
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full transition-all duration-200"
          style={{
            marginTop: 24, height: 56, borderRadius: 16, fontFamily: "Inter", fontWeight: 700, fontSize: 16,
            background: canSave ? "#276EF1" : "#E5E5E5",
            color: canSave ? "#fff" : "#767676",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Salvar dados bancários"}
        </button>
      </motion.div>

      {/* Confirm modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowConfirmModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 24, margin: 24, maxWidth: 340, width: "100%" }}>
            <p style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 17, color: "#000", marginBottom: 8 }}>Trocar método de recebimento?</p>
            <p style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 14, color: "#767676", marginBottom: 20 }}>Os dados anteriores serão substituídos.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1"
                style={{ height: 48, borderRadius: 12, background: "#F7F7F7", fontFamily: "Inter", fontWeight: 600, fontSize: 15, color: "#767676" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmMethodChange}
                className="flex-1"
                style={{ height: 48, borderRadius: 12, background: "#276EF1", fontFamily: "Inter", fontWeight: 600, fontSize: 15, color: "#fff" }}
              >
                Confirmar troca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
