import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformFeeRate } from "@/lib/feeUtils";
import { ArrowLeft, Clock, TrendingUp, DollarSign, ArrowUpRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface FinancialSummary {
  reserved: number;
  available: number;
  withdrawn: number;
  total: number;
}

interface Earning {
  id: string;
  gross_amount: number;
  net_amount: number;
  platform_fee: number;
  status: string;
  created_at: string;
  description: string | null;
  job_title?: string;
  scheduled_at?: string;
  category_name?: string;
  category_icon?: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  bank_account_id: string | null;
}

interface BankAccount {
  id: string;
  payment_type: string;
  pix_key: string | null;
  pix_key_type: string | null;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const GanhosPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary>({ reserved: 0, available: 0, withdrawn: 0, total: 0 });
  const [reservedFromContracts, setReservedFromContracts] = useState(0);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [activeTab, setActiveTab] = useState<"ganhos" | "saques">("ganhos");
  const [showSheet, setShowSheet] = useState(false);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const uid = session.user.id;

    const [earningsRes, withdrawalsRes, contractsRes] = await Promise.all([
      supabase
        .from("earnings")
        .select("*")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("*")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("contracts")
        .select("opportunity_id, created_at")
        .eq("professional_id", uid)
        .in("status", ["payment_confirmed", "in_progress"]),
    ]);

    // Available = sum earnings with status 'available'
    const availableTotal = earningsRes.data
      ?.filter((e: any) => e.status === "available")
      .reduce((sum: number, e: any) => sum + Number(e.net_amount), 0) || 0;

    // Withdrawn = sum withdrawals completed
    const withdrawnTotal = withdrawalsRes.data
      ?.filter((w: any) => w.status === "completed")
      .reduce((sum: number, w: any) => sum + Number(w.amount), 0) || 0;

    // Total = sum all earnings
    const totalEarned = earningsRes.data
      ?.reduce((sum: number, e: any) => sum + Number(e.net_amount), 0) || 0;

    setSummary({ reserved: 0, available: availableTotal, withdrawn: withdrawnTotal, total: totalEarned });

    // Calculate reserved from active contracts — professional receives 100% of budget
    if (contractsRes.data && contractsRes.data.length > 0) {
      const oppIds = contractsRes.data.map((c: any) => c.opportunity_id).filter(Boolean);
      if (oppIds.length > 0) {
        const { data: opps } = await supabase
          .from("opportunities")
          .select("id, budget")
          .in("id", oppIds);
        if (opps) {
          const total = opps.reduce((sum: number, o: any) => sum + (Number(o.budget) || 0), 0);
          setReservedFromContracts(total);
        }
      }
    } else {
      setReservedFromContracts(0);
    }

    if (earningsRes.data) {
      // Fetch opportunity details for each earning
      const oppIds = earningsRes.data
        .map((e: any) => e.opportunity_id)
        .filter(Boolean);
      let oppMap: Record<string, any> = {};
      if (oppIds.length > 0) {
        const { data: opps } = await supabase
          .from("opportunities")
          .select("id, title, scheduled_at, category_id")
          .in("id", oppIds);
        if (opps) {
          const catIds = opps.map((o: any) => o.category_id).filter(Boolean);
          let catMap: Record<string, any> = {};
          if (catIds.length > 0) {
            const { data: cats } = await supabase
              .from("categories")
              .select("id, name, icon")
              .in("id", catIds);
            if (cats) cats.forEach((c: any) => { catMap[c.id] = c; });
          }
          opps.forEach((o: any) => {
            oppMap[o.id] = {
              ...o,
              category_name: catMap[o.category_id]?.name,
              category_icon: catMap[o.category_id]?.icon,
            };
          });
        }
      }

      setEarnings(
        earningsRes.data.map((e: any) => ({
          ...e,
          job_title: oppMap[e.opportunity_id]?.title,
          scheduled_at: oppMap[e.opportunity_id]?.scheduled_at,
          category_name: oppMap[e.opportunity_id]?.category_name,
          category_icon: oppMap[e.opportunity_id]?.category_icon,
        }))
      );
    }

    if (withdrawalsRes.data) setWithdrawals(withdrawalsRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleWithdrawClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("profile_id", session.user.id)
      .maybeSingle();
    setBankAccount(data);
    setShowSheet(true);
  };

  const confirmWithdraw = async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setWithdrawing(false); return; }
    const uid = session.user.id;

    const { error: insErr } = await supabase.from("withdrawals").insert({
      profile_id: uid,
      amount: summary.available,
      status: "pending",
      bank_account_id: bankAccount?.id || null,
    });

    if (insErr) {
      toast.error("Erro ao solicitar saque.");
      setWithdrawing(false);
      return;
    }

    await supabase
      .from("earnings")
      .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
      .eq("profile_id", uid)
      .eq("status", "available");

    toast.success("Saque solicitado! ✓ Transferência em até 2 dias úteis.");
    setShowSheet(false);
    setWithdrawing(false);
    loadData();
  };

  const maskKey = (key: string | null) => {
    if (!key || key.length < 6) return key || "";
    return key.slice(0, 3) + "***" + key.slice(-2);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { text: string; bg: string; color: string }> = {
      reserved: { text: "Reservado ⏳", bg: "#FFF3E0", color: "#B45309" },
      available: { text: "Disponível ✓", bg: "#E8F5E9", color: "#2E7D32" },
      withdrawn: { text: "Sacado ✓", bg: "#F7F7F7", color: "#767676" },
    };
    return map[status] || { text: status, bg: "#F7F7F7", color: "#767676" };
  };

  const withdrawalBadge = (status: string) => {
    const map: Record<string, { text: string; bg: string; color: string }> = {
      pending: { text: "Aguardando", bg: "#FFF3E0", color: "#B45309" },
      processing: { text: "Processando", bg: "#E3F2FD", color: "#1565C0" },
      completed: { text: "Concluído ✓", bg: "#E8F5E9", color: "#2E7D32" },
      failed: { text: "Falhou ✗", bg: "#FFEBEE", color: "#C62828" },
    };
    return map[status] || { text: status, bg: "#F7F7F7", color: "#767676" };
  };

  // Professional receives 100% — fee is paid by client
  const fee = 0;
  const gross = summary.available;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#000" }}>
        <div className="flex items-center justify-center flex-1">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#000" }}>
      {/* Header */}
      <div style={{ padding: "52px 24px 24px", background: "#000" }}>
        <div className="relative flex items-center justify-center">
          <button onClick={() => navigate(-1)} className="absolute left-0">
            <ArrowLeft size={22} color="#FFFFFF" />
          </button>
          <span style={{ fontWeight: 600, fontSize: 17, color: "#FFFFFF" }}>Ganhos</span>
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: "#F7F7F7", borderRadius: "24px 24px 0 0", padding: "20px 16px 100px" }}
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-[10px]">
          {/* Available */}
          <div style={{ background: "#000", borderRadius: 20, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "#767676" }}>Disponível</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#FFF", marginTop: 4 }}>
              {formatCurrency(summary.available)}
            </p>
            <button
              onClick={handleWithdrawClick}
              disabled={summary.available === 0}
              style={{
                background: "#276EF1",
                color: "#FFF",
                borderRadius: 12,
                height: 40,
                fontWeight: 700,
                fontSize: 14,
                width: "100%",
                marginTop: 12,
                border: "none",
                opacity: summary.available === 0 ? 0.4 : 1,
                cursor: summary.available === 0 ? "not-allowed" : "pointer",
              }}
            >
              Sacar →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-[10px]">
            {/* Reserved */}
            <div style={{ background: "#FFF", borderRadius: 20, padding: 16, border: "1px solid #E5E5E5" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#767676" }}>Reservado</p>
              <div className="flex items-center gap-2 mt-1">
                <p style={{ fontSize: 22, fontWeight: 700, color: "#F59E0B" }}>
                  {formatCurrency(reservedFromContracts)}
                </p>
                <Clock size={14} color="#F59E0B" />
              </div>
              <p style={{ fontSize: 11, fontWeight: 400, color: "#767676", marginTop: 2 }}>
                Liberado após conclusão
              </p>
            </div>

            {/* Withdrawn */}
            <div style={{ background: "#FFF", borderRadius: 20, padding: 16, border: "1px solid #E5E5E5" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#767676" }}>Total sacado</p>
              <div className="flex items-center gap-2 mt-1">
                <p style={{ fontSize: 22, fontWeight: 700, color: "#2E7D32" }}>
                  {formatCurrency(summary.withdrawn)}
                </p>
                <TrendingUp size={14} color="#2E7D32" />
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600, marginTop: 24 }}>
          HISTÓRICO
        </p>

        {/* Tabs */}
        <div className="flex mt-3 border-b" style={{ borderColor: "#E5E5E5" }}>
          {(["ganhos", "saques"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 pb-2 text-center capitalize"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: activeTab === tab ? "#276EF1" : "#767676",
                borderBottom: activeTab === tab ? "2px solid #276EF1" : "2px solid transparent",
              }}
            >
              {tab === "ganhos" ? "Ganhos" : "Saques"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === "ganhos" && (
            <>
              {earnings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <DollarSign size={40} color="#E5E5E5" />
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#767676", marginTop: 12 }}>
                    Nenhum ganho ainda
                  </p>
                  <p style={{ fontSize: 13, color: "#767676", marginTop: 4 }}>
                    Aceite oportunidades para começar a ganhar.
                  </p>
                </div>
              ) : (
                earnings.map((e) => {
                  const badge = statusBadge(e.status);
                  return (
                    <div
                      key={e.id}
                      style={{
                        background: "#FFF",
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 10,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#000" }}>
                          {e.category_icon || "💼"} {e.job_title || e.description || "Serviço"}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#2E7D32" }}>
                          {formatCurrency(e.net_amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span style={{ fontSize: 12, color: "#767676" }}>
                          {format(new Date(e.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                            borderRadius: 99,
                            padding: "3px 10px",
                          }}
                        >
                          {badge.text}
                        </span>
                      </div>
                      <div
                        style={{
                          background: "#F7F7F7",
                          borderRadius: 8,
                          padding: 8,
                          marginTop: 8,
                        }}
                        className="flex items-center gap-3"
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32" }}>
                          Você recebe 100%: {formatCurrency(e.net_amount)}
                        </span>
                        <span style={{ fontSize: 10, color: "#999" }}>
                          Taxa paga pelo cliente
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === "saques" && (
            <>
              {withdrawals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <DollarSign size={40} color="#E5E5E5" />
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#767676", marginTop: 12 }}>
                    Nenhum saque ainda
                  </p>
                </div>
              ) : (
                withdrawals.map((w) => {
                  const badge = withdrawalBadge(w.status);
                  return (
                    <div
                      key={w.id}
                      style={{
                        background: "#FFF",
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 10,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight size={16} color="#276EF1" />
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#000" }}>
                            Saque solicitado
                          </span>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#276EF1" }}>
                          {formatCurrency(w.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span style={{ fontSize: 12, color: "#767676" }}>
                          {format(new Date(w.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                            borderRadius: 99,
                            padding: "3px 10px",
                          }}
                        >
                          {badge.text}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* Withdrawal Bottom Sheet */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheet(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.56)" }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
              style={{ background: "#FFF", borderRadius: "24px 24px 0 0", padding: "20px 24px 32px" }}
            >
              <div className="mx-auto" style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2, marginBottom: 24 }} />

              {!bankAccount ? (
                <div className="flex flex-col items-center text-center">
                  <AlertCircle size={32} color="#E53935" />
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#000", marginTop: 12 }}>
                    Cadastre seus dados bancários
                  </p>
                  <p style={{ fontSize: 14, color: "#767676", marginTop: 6 }}>
                    Para sacar, você precisa ter Pix ou Conta cadastrados.
                  </p>
                  <button
                    onClick={() => { setShowSheet(false); navigate("/dados-bancarios"); }}
                    style={{
                      background: "#276EF1",
                      color: "#FFF",
                      borderRadius: 16,
                      height: 52,
                      fontWeight: 700,
                      fontSize: 16,
                      width: "100%",
                      marginTop: 20,
                      border: "none",
                    }}
                  >
                    Cadastrar agora →
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600 }}>
                    SACAR PARA
                  </p>
                  <div
                    style={{
                      background: "#F7F7F7",
                      borderRadius: 12,
                      padding: 14,
                      marginTop: 10,
                    }}
                    className="flex items-center gap-3"
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#000" }}>
                      {bankAccount.payment_type === "pix" ? "⚡ Pix" : "🏦 Conta"}
                    </span>
                    <span style={{ fontSize: 13, color: "#767676" }}>
                      {bankAccount.payment_type === "pix"
                        ? maskKey(bankAccount.pix_key)
                        : `${bankAccount.bank_name || ""} • ***${bankAccount.account_number?.slice(-3) || ""}`}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: "#767676", marginTop: 16 }}>Valor disponível</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#000" }}>
                    {formatCurrency(summary.available)}
                  </p>

                  <div style={{ background: "#F7F7F7", borderRadius: 12, padding: 12, marginTop: 12 }}>
                    <div className="flex justify-between">
                      <span style={{ fontSize: 13, color: "#767676" }}>Valor bruto</span>
                      <span style={{ fontSize: 13, color: "#767676" }}>{formatCurrency(gross)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ fontSize: 13, color: "#767676" }}>Taxa Freelaki (10%)</span>
                      <span style={{ fontSize: 13, color: "#E53935" }}>- {formatCurrency(fee)}</span>
                    </div>
                    <div style={{ height: 1, background: "#E5E5E5", margin: "8px 0" }} />
                    <div className="flex justify-between">
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#000" }}>Você recebe</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#2E7D32" }}>
                        {formatCurrency(summary.available)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#FFF3E0",
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 12,
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 400, color: "#B45309" }}>
                      ⏱ Prazo de transferência: até 2 dias úteis após solicitação.
                    </p>
                  </div>

                  <button
                    onClick={confirmWithdraw}
                    disabled={withdrawing}
                    style={{
                      background: "#276EF1",
                      color: "#FFF",
                      borderRadius: 16,
                      height: 52,
                      fontWeight: 700,
                      fontSize: 16,
                      width: "100%",
                      marginTop: 20,
                      border: "none",
                      opacity: withdrawing ? 0.6 : 1,
                    }}
                  >
                    {withdrawing ? "Processando..." : "Confirmar saque →"}
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GanhosPage;
