import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Info, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BottomNav from "@/components/dashboard/BottomNav";
import FreelakiButton from "@/components/ui/FreelakiButton";

type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

interface Withdrawal {
  id: string;
  amount: number;
  created_at: string;
  status: string | null;
  asaas_status: string | null;
}

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const statusBadge = (asaas?: string | null, status?: string | null) => {
  const s = (asaas || status || "").toUpperCase();
  if (s === "DONE" || s === "COMPLETED") return { text: "Concluído", bg: "#E8F5E9", color: "#2E7D32" };
  if (s === "FAILED") return { text: "Falhou", bg: "#FDECEA", color: "#C62828" };
  return { text: "Processando", bg: "#FFF3E0", color: "#B45309" };
};

const FinanceiroPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [available, setAvailable] = useState(0);
  const [reserved, setReserved] = useState(0);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Form state
  const [amountStr, setAmountStr] = useState("");
  const [keyType, setKeyType] = useState<PixKeyType>("CPF");
  const [pixKey, setPixKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const amountNum = useMemo(() => {
    const digits = amountStr.replace(/\D/g, "");
    return digits ? Number(digits) / 100 : 0;
  }, [amountStr]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const [bal, res, list] = await Promise.all([
      supabase.rpc("get_professional_balance", { p_profile_id: user.id }),
      supabase.rpc("get_professional_reserved_balance", { p_profile_id: user.id }),
      supabase
        .from("withdrawals")
        .select("id, amount, created_at, status, asaas_status")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setAvailable(Number(bal.data || 0));
    setReserved(Number(res.data || 0));
    setHistory((list.data as Withdrawal[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [user]);

  const handleAmountChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 10);
    if (!digits) { setAmountStr(""); return; }
    setAmountStr(formatBRL(Number(digits) / 100));
  };

  const handleConfirm = async () => {
    setFormError(null);
    if (amountNum <= 0) return setFormError("Informe um valor maior que R$ 0,00.");
    if (amountNum > available) return setFormError("Valor maior que o saldo disponível.");
    if (!pixKey.trim()) return setFormError("Informe a chave Pix.");

    setSubmitting(true);
    try {
      const { data: inserted, error: insErr } = await supabase
        .from("withdrawals")
        .insert({
          profile_id: user!.id,
          amount: amountNum,
          pix_key: pixKey.trim(),
          pix_key_type: keyType,
          status: "pending",
          asaas_status: "PENDING",
        })
        .select("id")
        .single();

      if (insErr || !inserted) throw new Error(insErr?.message || "Falha ao criar saque");

      const { data, error } = await supabase.functions.invoke("asaas-withdrawal", {
        body: {
          withdrawal_id: inserted.id,
          profile_id: user!.id,
          amount: amountNum,
          pix_key: pixKey.trim(),
          pix_key_type: keyType,
        },
      });

      if (error || (data as any)?.error) {
        const msg = (data as any)?.message || error?.message || "Falha ao processar saque.";
        setFormError(msg);
        return;
      }

      toast.success("Pix enviado! Você receberá em instantes.");
      setShowSheet(false);
      setAmountStr(""); setPixKey("");
      await fetchAll();
    } catch (err: any) {
      setFormError(err?.message || "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Header */}
      <div className="flex items-center px-6 pb-5" style={{ paddingTop: 52 }}>
        <button onClick={() => navigate(-1)} className="z-10">
          <ArrowLeft size={24} color="#FFFFFF" />
        </button>
        <h1 className="-ml-6 flex-1 text-center text-[17px] font-semibold text-white">Financeiro</h1>
        <div className="w-6" />
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 rounded-t-3xl bg-[#F7F7F7] px-5 pb-28 pt-6"
      >
        {/* Card principal — Saldo disponível */}
        <div
          className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: "#276EF1" }}
        >
          <p className="text-[13px] opacity-90">Saldo disponível</p>
          <p className="mt-1 text-[34px] font-bold leading-tight">
            {loading ? "—" : formatBRL(available)}
          </p>
        </div>

        {/* Card secundário — Reservado */}
        <div className="relative mt-3 rounded-2xl bg-white p-4">
          <div className="flex items-center gap-2">
            <p className="text-[13px] text-[#767676]">Reservado</p>
            <button onClick={() => setShowTooltip(v => !v)} aria-label="info">
              <Info size={14} color="#767676" />
            </button>
          </div>
          <p className="mt-1 text-[20px] font-semibold text-[#333]">
            {loading ? "—" : formatBRL(reserved)}
          </p>
          {showTooltip && (
            <div className="absolute left-4 right-4 top-full z-10 mt-1 rounded-lg bg-black px-3 py-2 text-[12px] text-white shadow">
              Valor de contratos em andamento, liberado ao concluir o serviço.
            </div>
          )}
        </div>

        {/* Botão sacar */}
        {available > 0 && (
          <button
            onClick={() => setShowSheet(true)}
            className="mt-5 flex h-[52px] w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white"
            style={{ background: "#276EF1" }}
          >
            Sacar agora
          </button>
        )}

        {/* Histórico */}
        <div className="mt-7">
          <p className="mb-3 text-[15px] font-semibold text-foreground">Histórico de saques</p>
          {loading ? (
            <p className="text-[13px] text-[#767676]">Carregando…</p>
          ) : history.length === 0 ? (
            <div className="rounded-xl bg-white p-6 text-center text-[13px] text-[#767676]">
              Nenhum saque realizado ainda.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl bg-white">
              {history.map((w, i) => {
                const b = statusBadge(w.asaas_status, w.status);
                return (
                  <li
                    key={w.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i < history.length - 1 ? "border-b border-[#EFEFEF]" : ""
                    }`}
                  >
                    <div>
                      <p className="text-[14px] font-medium text-foreground">{formatBRL(Number(w.amount))}</p>
                      <p className="text-[12px] text-[#767676]">{formatDate(w.created_at)}</p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: b.bg, color: b.color }}
                    >
                      {b.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </motion.div>

      <BottomNav />

      {/* BottomSheet de saque */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowSheet(false)}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.56)" }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white"
              style={{ borderRadius: "24px 24px 0 0", padding: "16px 24px 28px" }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E5E5E5]" />
              <p className="text-center text-[18px] font-bold text-foreground">Realizar saque</p>
              <p className="mt-1 text-center text-[12px] text-[#767676]">
                Disponível: <span className="font-semibold text-foreground">{formatBRL(available)}</span>
              </p>

              {/* Valor */}
              <label className="mt-5 block text-[13px] font-medium text-foreground">Valor a sacar</label>
              <input
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="R$ 0,00"
                className="mt-1.5 h-[52px] w-full rounded-xl border border-[#E5E5E5] bg-white px-4 text-[15px] text-foreground outline-none focus:border-[#276EF1]"
              />

              {/* Tipo de chave */}
              <label className="mt-3 block text-[13px] font-medium text-foreground">Tipo de chave Pix</label>
              <select
                value={keyType}
                onChange={(e) => setKeyType(e.target.value as PixKeyType)}
                className="mt-1.5 h-[52px] w-full rounded-xl border border-[#E5E5E5] bg-white px-3 text-[15px] text-foreground outline-none focus:border-[#276EF1]"
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
                <option value="EVP">Chave aleatória</option>
              </select>

              {/* Chave */}
              <label className="mt-3 block text-[13px] font-medium text-foreground">Chave Pix</label>
              <input
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Digite sua chave"
                className="mt-1.5 h-[52px] w-full rounded-xl border border-[#E5E5E5] bg-white px-4 text-[15px] text-foreground outline-none focus:border-[#276EF1]"
              />

              {formError && (
                <p className="mt-3 rounded-lg bg-[#FDECEA] px-3 py-2 text-[13px] text-[#C62828]">
                  {formError}
                </p>
              )}

              <div className="mt-5">
                <FreelakiButton
                  onClick={handleConfirm}
                  loading={submitting}
                  className="w-full"
                  style={{ background: "#276EF1" }}
                >
                  {submitting ? "Processando saque via Pix..." : "Confirmar saque"}
                </FreelakiButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinanceiroPage;
