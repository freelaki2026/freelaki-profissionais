import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { ArrowLeft, Clock, TrendingUp, DollarSign, ArrowUpRight, AlertCircle, Sparkles } from "lucide-react";
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
  created_at?: string;
  requested_at?: string;
  bank_account_id?: string | null;
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

  const uidRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const uid = session.user.id;
    uidRef.current = uid;

    const [earningsRes, withdrawalsRes, contractsRes] = await Promise.all([
      supabase
        .from("earnings")
        .select("*")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("asaas_withdrawals")
        .select("*")
        .eq("profile_id", uid)
        .order("requested_at", { ascending: false }),
      // Contratos com pagamento confirmado mas serviço ainda não concluído.
      // O valor fica RESERVADO até o cliente apertar "Concluir".
      supabase
        .from("contracts")
        .select("opportunity_id, status, asaas_payment_status, completion_confirmed_at, created_at")
        .eq("professional_id", uid)
        .in("asaas_payment_status", ["CONFIRMED", "RECEIVED"])
        .is("completion_confirmed_at", null)
        .neq("status", "cancelled"),
    ]);

    // Available = sum earnings with status 'available'
    const availableTotal = earningsRes.data
      ?.filter((e: any) => e.status === "available")
      .reduce((sum: number, e: any) => sum + Number(e.net_amount), 0) || 0;

    // Withdrawn = sum asaas_withdrawals with status 'done'
    const withdrawnTotal = withdrawalsRes.data
      ?.filter((w: any) => w.status === "done")
      .reduce((sum: number, w: any) => sum + Number(w.amount), 0) || 0;

    // Total = sum all earnings
    const totalEarned = earningsRes.data
      ?.reduce((sum: number, e: any) => sum + Number(e.net_amount), 0) || 0;

    // Reserved from active contracts (paid but not yet concluded by client) — 60% pendente
    let reservedTotal = 0;
    if (contractsRes.data && contractsRes.data.length > 0) {
      const oppIds = contractsRes.data.map((c: any) => c.opportunity_id).filter(Boolean);
      if (oppIds.length > 0) {
        const { data: opps } = await supabase
          .from("opportunities")
          .select("id, budget")
          .in("id", oppIds);
        if (opps) {
          reservedTotal = opps.reduce((sum: number, o: any) => sum + (Number(o.budget) || 0), 0);
        }
      }
    }
    setReservedFromContracts(reservedTotal);
    setSummary({ reserved: reservedTotal, available: availableTotal, withdrawn: withdrawnTotal, total: totalEarned });

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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime: re-carrega quando contracts/earnings/withdrawals mudarem para o profissional logado
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      const uid = session.user.id;

      channel = supabase
        .channel(`ganhos-${uid}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "contracts", filter: `professional_id=eq.${uid}` },
          () => loadData())
        .on("postgres_changes",
          { event: "*", schema: "public", table: "earnings", filter: `profile_id=eq.${uid}` },
          () => loadData())
        .on("postgres_changes",
          { event: "*", schema: "public", table: "asaas_withdrawals", filter: `profile_id=eq.${uid}` },
          () => loadData())
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadData]);

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
    if (bankAccount?.payment_type !== "pix") {
      toast.error("Apenas saques via PIX são suportados. Cadastre uma chave PIX.");
      return;
    }
    setWithdrawing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Sessão expirada. Faça login novamente.");
        setWithdrawing(false);
        return;
      }
      const userId = session.user.id;
      const available = summary.available;

      // 1. PRIMEIRO: registrar saque no banco
      const { data: withdrawal, error: insertError } = await supabase
        .from("asaas_withdrawals")
        .insert({
          profile_id: userId,
          amount: available,
          pix_key: bankAccount.pix_key || bankAccount.account_number,
          pix_key_type: bankAccount.pix_key_type || "conta",
          status: "pending",
        })
        .select()
        .single();

      if (insertError || !withdrawal) {
        toast.error("Erro ao registrar saque. Tente novamente.");
        setWithdrawing(false);
        return;
      }

      // 2. DEPOIS: chamar Edge Function para processar no Asaas
      const fetchUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-process-withdrawal`;
      const fetchHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      console.log("[confirmWithdraw] fetch URL:", fetchUrl);
      console.log("[confirmWithdraw] fetch headers:", fetchHeaders);

      const response = await fetch(fetchUrl, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({
          withdrawal_id: withdrawal.id,
          amount: available,
          profile_id: userId,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error("Erro ao processar saque: " + (result.error || "Tente novamente"));
        setWithdrawing(false);
        return;
      }

      toast.success("Saque solicitado! ✓ Pix em até 1 hora útil.");
      setShowSheet(false);
      setWithdrawing(false);
      loadData();
    } catch (err: any) {
      toast.error("Erro ao processar saque. Tente novamente.");
      setWithdrawing(false);
    }
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

  const canWithdraw = bankAccount?.payment_type === "pix" && !withdrawing;

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

          {/* Previsão de ganhos: disponível + reservado */}
          <div
            style={{
              background: "linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)",
              borderRadius: 20,
              padding: 16,
              border: "1px solid #C8E6C9",
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} color="#2E7D32" />
              <p style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32" }}>Previsão de ganhos</p>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#1B5E20", marginTop: 4 }}>
              {formatCurrency(summary.available + reservedFromContracts)}
            </p>
            <p style={{ fontSize: 11, fontWeight: 400, color: "#2E7D32", marginTop: 2 }}>
              Total estimado considerando contratos pagos aguardando conclusão
            </p>
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
                Liberado quando o cliente concluir
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
                      <span style={{ fontSize: 13, color: "#767676" }}>Valor do serviço</span>
                      <span style={{ fontSize: 13, color: "#767676" }}>{formatCurrency(summary.available)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ fontSize: 13, color: "#2E7D32" }}>Taxa Freelaki</span>
                      <span style={{ fontSize: 13, color: "#2E7D32" }}>R$ 0,00 (paga pelo cliente)</span>
                    </div>
                    <div style={{ height: 1, background: "#E5E5E5", margin: "8px 0" }} />
                    <div className="flex justify-between">
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#000" }}>Você recebe</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#2E7D32" }}>
                        {formatCurrency(summary.available)}
                      </span>
                    </div>
                  </div>

                  {bankAccount?.payment_type !== "pix" ? (
                    <div style={{ background: "#FFEBEE", borderRadius: 12, padding: 12, marginTop: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#C62828" }}>
                        ⚠️ Apenas saques via PIX são suportados. Cadastre uma chave PIX em Dados Bancários.
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: "#E8F5E9", borderRadius: 12, padding: 12, marginTop: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#2E7D32" }}>
                        ⚡ Transferência instantânea via PIX. O valor será creditado em segundos.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={confirmWithdraw}
                    disabled={!canWithdraw}
                    style={{
                      background: canWithdraw ? "#276EF1" : "#CCC",
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
                    {withdrawing ? "Processando PIX..." : "⚡ Sacar via PIX →"}
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
