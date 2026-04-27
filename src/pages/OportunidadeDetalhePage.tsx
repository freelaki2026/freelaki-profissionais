import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, DollarSign, Calendar, Tag, Star, AlertCircle, Zap, CheckCircle, XCircle, Shield, Play, Square } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getPlatformFeeRate, getFeePercentLabel } from "@/lib/feeUtils";
import ContractAddendums from "@/components/ContractAddendums";

interface OppDetail {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  total_amount: number | null;
  status: string | null;
  scheduled_at: string | null;
  location_address: string | null;
  category_name: string;
  category_icon: string;
  category_slug: string;
  category_description: string | null;
  client_name: string | null;
  client_avatar: string | null;
  client_id: string | null;
  client_verified: boolean;
  is_private: boolean;
  target_professional_id: string | null;
  accepted_by: string | null;
}

interface ContractInfo {
  id: string;
  status: string | null;
  work_started_at: string | null;
  work_finished_at: string | null;
  created_at: string | null;
}

const CANCELLATION_REASONS = [
  "O cliente não estava presente no local",
  "O local estava inacessível ou inadequado",
  "O cliente solicitou serviços fora do escopo contratado",
  "O cliente foi desrespeitoso ou gerou ambiente hostil",
  "Problemas de saúde ou emergência pessoal",
  "Condições climáticas ou de força maior",
  "Outros",
];

const formatScheduleDetail = (scheduledAt: string | null): string => {
  if (!scheduledAt) return "A combinar";
  const date = new Date(scheduledAt);
  if (isToday(date)) return `Hoje às ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Amanhã às ${format(date, "HH:mm")}`;
  return format(date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR });
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "open": return { label: "● Disponível", bg: "#E8F5E9", color: "#2E7D32" };
    case "pending_selection": return { label: "● Em análise", bg: "#FFF3E0", color: "#B45309" };
    case "awaiting_signatures": return { label: "✍️ Assinatura pendente", bg: "#E3F2FD", color: "#1565C0" };
    case "payment_confirmed": return { label: "💰 Pagamento confirmado", bg: "#E8F5E9", color: "#2E7D32" };
    case "accepted": return { label: "✓ Aguardando início", bg: "#FFF3E0", color: "#B45309" };
    case "in_progress": return { label: "● Em andamento", bg: "#E8F5E9", color: "#2E7D32" };
    case "completed": return { label: "● Finalizado", bg: "#F7F7F7", color: "#767676" };
    case "cancelled": return { label: "● Cancelada", bg: "#FFEBEE", color: "#C62828" };
    default: return { label: "● Desconhecido", bg: "#F7F7F7", color: "#767676" };
  }
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
};

const OportunidadeDetalhePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [opp, setOpp] = useState<OppDetail | null>(null);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showFinishWorkModal, setShowFinishWorkModal] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showRefuseContractModal, setShowRefuseContractModal] = useState(false);
  const [refusingContract, setRefusingContract] = useState(false);

  // Work lifecycle states
  const [startingWork, setStartingWork] = useState(false);
  const [finishingWork, setFinishingWork] = useState(false);

  // Cancel freela states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOtherText, setCancelOtherText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadOpp = async () => {
    if (!id) return;
    setLoading(true);
    setNetworkError(false);
    const { data, error } = await supabase
      .from("opportunities")
      .select(
        "id, title, description, budget, total_amount, status, scheduled_at, location_address, is_private, target_professional_id, accepted_by, category_id, categories(name, icon, description, slug), client_id, profiles!opportunities_client_id_fkey(full_name, avatar_url, is_approved)"
      )
      .eq("id", id)
      .single();

    if (data) {
      const cat = (data as any).categories;
      const prof = (data as any).profiles;
      setOpp({
        id: data.id, title: data.title, description: data.description,
        budget: data.budget, total_amount: (data as any).total_amount, status: data.status, scheduled_at: data.scheduled_at,
        location_address: data.location_address,
        category_name: cat?.name || "Geral", category_icon: cat?.icon || "📦",
        category_slug: (cat as any)?.slug || "",
        category_description: cat?.description || null,
        client_name: prof?.full_name || null, client_avatar: prof?.avatar_url || null,
        client_id: data.client_id || null,
        client_verified: prof?.is_approved || false,
        is_private: data.is_private || false,
        target_professional_id: data.target_professional_id || null,
        accepted_by: (data as any).accepted_by || null,
      });

      // Load contract for this opportunity
      const { data: contractData } = await supabase
        .from("contracts")
        .select("id, status, work_started_at, work_finished_at, created_at")
        .eq("opportunity_id", data.id)
        .maybeSingle();
      if (contractData) {
        setContract(contractData as ContractInfo);
      }

      // Check if already applied (for public opportunities)
      if (!data.is_private && user) {
        const { data: appData } = await supabase
          .from("opportunity_applications")
          .select("id")
          .eq("opportunity_id", data.id)
          .eq("professional_id", user.id)
          .maybeSingle();
        setHasApplied(!!appData);
      }
    } else if (error && error.code !== "PGRST116") {
      setNetworkError(true);
    }
    setLoading(false);
  };

  useEffect(() => { loadOpp(); }, [id]);

  // Realtime
  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase
      .channel(`oportunidade_${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "opportunities", filter: `id=eq.${id}` }, (payload) => {
        const updated = payload.new as any;
        setOpp((prev) => prev ? { ...prev, status: updated.status } : prev);
        if (updated.status !== "open" && updated.status !== "pending_selection" && updated.accepted_by !== user.id) {
          toast.error("Esta oportunidade acabou de ser aceita por outro profissional.");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  // Realtime for contracts
  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase
      .channel(`contract-detail-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contracts" }, (payload) => {
        const updated = payload.new as any;
        if (updated.opportunity_id === id) {
          setContract({ id: updated.id, status: updated.status, work_started_at: updated.work_started_at, work_finished_at: updated.work_finished_at, created_at: updated.created_at });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  // Realtime for applications (to detect selection)
  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase
      .channel(`app-detail-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "opportunity_applications" }, (payload) => {
        const updated = payload.new as any;
        if (updated.professional_id === user.id && updated.opportunity_id === id) {
          if (updated.status === "selected") {
            toast.success("🎉 Você foi selecionado! Assine o contrato.");
            navigator.vibrate?.([200, 100, 200]);
            loadOpp();
          } else if (updated.status === "rejected") {
            toast("Outra pessoa foi escolhida. Continue online! 💪");
            navigate("/oportunidades");
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const handleAccept = async () => {
    if (!user || !opp) return;
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_opportunity", { p_opportunity_id: opp.id });
    const result = typeof data === "string" ? JSON.parse(data) : data;

    if (error || !result?.success) {
      toast.error(result?.error === "already_taken" ? "Esta oportunidade não está mais disponível." : "Erro ao aceitar. Tente novamente.");
      setShowModal(false);
      setAccepting(false);
      return;
    }

    setShowModal(false);
    window.dispatchEvent(new CustomEvent("opportunity_accepted", { detail: { id: opp.id } }));
    toast.success("Oportunidade aceita! Mensagem enviada ao cliente. 🎉");
    setTimeout(() => setShowNextSteps(true), 150);
    setAccepting(false);
  };

  const handleApply = async () => {
    if (!user || !opp) return;
    setApplying(true);
    const { data, error } = await supabase.rpc("apply_to_opportunity", { p_opportunity_id: opp.id });
    const result = typeof data === "string" ? JSON.parse(data) : data;

    if (error) {
      toast.error("Erro ao enviar candidatura. Tente novamente.");
      setApplying(false);
      setShowApplyModal(false);
      return;
    }

    if (result?.error) {
      switch (result.error) {
        case "not_available":
          toast.error("Esta oportunidade não está mais disponível.");
          window.dispatchEvent(new CustomEvent("opportunity_unavailable", { detail: { id: opp.id } }));
          break;
        case "already_applied":
          toast("Você já se candidatou a esta oportunidade.");
          setHasApplied(true);
          break;
        case "max_reached":
          toast("Esta oportunidade atingiu o máximo de candidatos por enquanto. Fique atento a novas oportunidades!");
          break;
        case "private":
          toast.error("Esta oportunidade não está disponível.");
          break;
        default:
          toast.error("Erro ao se candidatar. Tente novamente.");
      }
      setApplying(false);
      setShowApplyModal(false);
      return;
    }

    toast.success("Candidatura enviada! ⚡ Aguarde o cliente te selecionar.");
    setHasApplied(true);
    setShowApplyModal(false);
    setApplying(false);
  };

  const handleDecline = async () => {
    if (!opp) return;
    setDeclining(true);
    const { error } = await supabase.rpc("decline_private_opportunity", { p_opportunity_id: opp.id });
    if (!error) {
      toast.success("Proposta recusada.");
      window.dispatchEvent(new CustomEvent("opportunity_declined", { detail: { id: opp.id } }));
      navigate("/dashboard");
    } else {
      toast.error("Erro ao recusar proposta.");
    }
    setDeclining(false);
    setShowDeclineModal(false);
  };

  const handleFinish = async () => {
    if (!user || !opp) return;
    setFinishing(true);
    const { error } = await supabase
      .from("opportunities")
      .update({ status: "completed" } as any)
      .eq("id", opp.id);

    if (error) {
      toast.error("Erro ao finalizar. Tente novamente.");
      setFinishing(false);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: (await supabase.from("opportunities").select("client_id").eq("id", opp.id).single()).data?.client_id,
      type: "oportunidade",
      title: "✅ Serviço concluído!",
      body: "O profissional marcou o serviço como concluído. Confirme para liberar o pagamento.",
      action_url: "/chamado/" + opp.id,
    } as any);

    toast.success("Freela finalizado! 🎉 Aguarde a confirmação do cliente.");
    setShowFinishModal(false);
    setFinishing(false);
    navigate("/dashboard");
  };

  const handleWithdraw = async () => {
    if (!user || !opp) return;
    setWithdrawing(true);
    const { error } = await supabase
      .from("opportunity_applications")
      .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() } as any)
      .eq("opportunity_id", opp.id)
      .eq("professional_id", user.id);

    if (error) {
      toast.error("Erro ao desistir. Tente novamente.");
    } else {
      toast("Você desistiu da oportunidade.");
      navigate("/dashboard");
    }
    setWithdrawing(false);
    setShowWithdrawModal(false);
  };

  const handleRefuseContract = async () => {
    if (!user || !opp || !contract) return;
    setRefusingContract(true);
    const { data, error } = await supabase.rpc("refuse_contract" as any, { p_contract_id: contract.id });
    const result: any = typeof data === "string" ? JSON.parse(data) : data;

    if (error || !result?.success) {
      const errMsg = result?.error === "already_signed"
        ? "Você já assinou este contrato."
        : result?.error === "unauthorized"
        ? "Você não tem permissão para esta ação."
        : "Erro ao recusar contrato. Tente novamente.";
      toast.error(errMsg);
      setRefusingContract(false);
      setShowRefuseContractModal(false);
      return;
    }

    toast("Contrato recusado. O cliente foi notificado.");
    window.dispatchEvent(new CustomEvent("opportunity_unavailable", { detail: { id: opp.id } }));
    setRefusingContract(false);
    setShowRefuseContractModal(false);
    navigate("/dashboard");
  };

  const handleStartWork = async () => {
    if (!contract) return;
    setStartingWork(true);
    const { error } = await supabase
      .from("contracts")
      .update({ work_started_at: new Date().toISOString(), status: "in_progress" } as any)
      .eq("id", contract.id);
    if (error) {
      console.error("❌ handleStartWork ERROR:", JSON.stringify(error, null, 2));
      console.error("❌ code:", error.code, "| message:", error.message, "| details:", error.details, "| hint:", error.hint);
      toast.error("Erro ao iniciar trabalho. Tente novamente.");
    } else {
      toast.success("Trabalho iniciado! Boa sorte 💪");
      setContract(prev => prev ? { ...prev, status: "in_progress", work_started_at: new Date().toISOString() } : prev);

      // Notify client
      if (opp) {
        const { data: oppData } = await supabase.from("opportunities").select("client_id").eq("id", opp.id).single();
        if (oppData?.client_id) {
          await supabase.from("notifications").insert({
            profile_id: oppData.client_id,
            type: "contrato",
            title: "🚀 Trabalho iniciado!",
            body: "O profissional iniciou o trabalho! Confirme o início para liberar o serviço.",
            action_url: "/chamado/" + opp.id,
          } as any);
        }
      }
    }
    setStartingWork(false);
  };

  const handleFinishWork = async () => {
    if (!contract || !opp) return;
    setFinishingWork(true);
    const { error } = await supabase
      .from("contracts")
      .update({ work_finished_at: new Date().toISOString(), status: "awaiting_confirmation", completion_requested_at: new Date().toISOString() } as any)
      .eq("id", contract.id);
    if (error) {
      toast.error("Erro ao finalizar trabalho. Tente novamente.");
    } else {
      toast.success("Trabalho finalizado! Aguarde a confirmação do cliente. 🎉");
      setContract(prev => prev ? { ...prev, status: "awaiting_confirmation", work_finished_at: new Date().toISOString() } : prev);

      // Fetch professional name and client_id, then notify
      const { data: oppData } = await supabase.from("opportunities").select("client_id").eq("id", opp.id).single();
      const { data: proData } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      const proName = proData?.full_name || "O profissional";
      if (oppData?.client_id) {
        await supabase.from("notifications").insert({
          profile_id: oppData.client_id,
          type: "contrato",
          title: "✅ Serviço finalizado!",
          body: `${proName} finalizou o serviço! Confirme a conclusão para liberar o pagamento. Você tem 30 minutos.`,
          action_url: "/chamado/" + opp.id,
        } as any);
      }
    }
    setFinishingWork(false);
    setShowFinishWorkModal(false);
  };

  const handleCancelFreela = async () => {
    if (!contract || !cancelReason) return;
    setCancelling(true);
    const reason = cancelReason === "Outros" ? cancelOtherText : cancelReason;
    const { error } = await supabase
      .from("contracts")
      .update({
        status: "cancelled",
        cancelled_by: "professional",
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      } as any)
      .eq("id", contract.id);
    if (error) {
      toast.error("Erro ao cancelar. Tente novamente.");
    } else {
      toast("Freela cancelado. Nossa equipe será notificada.");
      navigate("/dashboard");
    }
    setCancelling(false);
    setShowCancelModal(false);
  };

  const isPrivateForMe = opp?.is_private && opp?.target_professional_id === user?.id;
  const isPublicOpen = opp && !opp.is_private && (opp.status === "open" || opp.status === "pending_selection");
  const statusBadge = opp ? getStatusBadge(opp.status) : null;

  // Check if contract is in payment_confirmed and the professional is the accepted one
  const isPaymentConfirmed = (contract?.status === "payment_confirmed" || contract?.status === "both_signed") && opp?.accepted_by === user?.id;
  const isContractInProgress = contract?.status === "in_progress" && opp?.accepted_by === user?.id;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="bg-black px-6" style={{ paddingTop: 52, paddingBottom: 24 }}>
          <div className="mx-auto h-5 w-32 animate-shimmer rounded-lg" style={{ background: "linear-gradient(90deg, #333 25%, #444 50%, #333 75%)", backgroundSize: "200% 100%" }} />
        </div>
        <div className="flex-1 px-6 pt-8">
          <div className="h-7 w-24 animate-shimmer rounded-full" style={{ background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }} />
          <div className="mt-4 h-8 w-4/5 animate-shimmer rounded-lg" style={{ background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }} />
        </div>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } .animate-shimmer { animation: shimmer 1.5s infinite linear; }`}</style>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
        <span className="text-[32px]">⚠️</span>
        <h2 className="mt-4 text-lg font-semibold text-white">Erro ao carregar</h2>
        <p className="mt-2 text-sm text-[#767676]">Verifique sua conexão e tente novamente.</p>
        <button onClick={loadOpp} className="mt-8 flex h-[52px] items-center justify-center rounded-2xl bg-[#276EF1] px-8 text-base font-bold text-white">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
        <Zap size={32} fill="#276EF1" color="#276EF1" />
        <h2 className="mt-4 text-lg font-semibold text-white">Oportunidade não encontrada</h2>
        <p className="mt-2 text-sm text-[#767676]">Ela pode ter sido aceita por outro profissional.</p>
        <button onClick={() => navigate("/dashboard")} className="mt-8 flex h-[52px] items-center justify-center rounded-2xl bg-[#276EF1] px-8 text-base font-bold text-white">
          ← Voltar ao início
        </button>
      </div>
    );
  }

  const details = [
    { icon: <MapPin className="h-4 w-4 text-[#767676]" />, label: "Local", value: opp.location_address || "Não informado" },
    { icon: <DollarSign className="h-4 w-4 text-[#2E7D32]" />, label: "Valor", value: opp.budget ? `R$ ${opp.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "A combinar", valueColor: opp.budget ? "#2E7D32" : undefined, valueBold: !!opp.budget },
    { icon: <Calendar className="h-4 w-4 text-[#767676]" />, label: "Data", value: formatScheduleDetail(opp.scheduled_at) },
    { icon: <Tag className="h-4 w-4 text-[#767676]" />, label: "Categoria", value: opp.category_description || opp.category_name, clamp: true },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <div className="relative flex items-center justify-between bg-black px-6" style={{ paddingTop: 52, paddingBottom: 24 }}>
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-6 w-6 text-white" /></button>
        <span className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-white">Oportunidade</span>
        <div className="w-6" />
      </div>

      {/* STATUS BADGE */}
      {statusBadge && (
        <div className="flex justify-center" style={{ marginTop: -14, zIndex: 10, position: "relative" }}>
          <span className="rounded-full px-4 py-1.5 text-[13px] font-semibold" style={{ background: statusBadge.bg, color: statusBadge.color }}>
            {statusBadge.label}
          </span>
        </div>
      )}

      {/* BODY */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }} className="flex-1 px-6 pb-32 pt-5">
        {/* Private banner */}
        {isPrivateForMe && (opp.status === "open" || opp.status === "pending_selection") && (
          <div className="mb-4 rounded-xl p-3.5" style={{ background: "rgba(39,110,241,0.08)" }}>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" style={{ color: "#276EF1" }} />
              <span className="text-sm font-semibold" style={{ color: "#276EF1" }}>Proposta exclusiva para você</span>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: "#767676" }}>Este cliente escolheu você especificamente.</p>
          </div>
        )}

        {/* Applied banner */}
        {hasApplied && isPublicOpen && (
          <div className="mb-4 flex items-center gap-2 rounded-xl p-3.5" style={{ background: "#E8F5E9" }}>
            <CheckCircle className="h-4 w-4" style={{ color: "#2E7D32" }} />
            <span className="text-sm font-semibold" style={{ color: "#2E7D32" }}>Candidatura enviada ✓</span>
          </div>
        )}

        {/* Frozen value card - payment_confirmed or in_progress */}
        {(isPaymentConfirmed || isContractInProgress) && (
          <div className="mb-4 rounded-2xl border border-[#E8F5E9] p-4" style={{ background: "linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)" }}>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: "#2E7D32" }} />
              <span className="text-sm font-bold" style={{ color: "#2E7D32" }}>Valor congelado como garantia</span>
            </div>
            {(() => {
              const budget = opp.budget || 0;
              const feeRate = contract?.created_at ? getPlatformFeeRate(contract.created_at) : 0.07;
              const feePct = contract?.created_at ? getFeePercentLabel(contract.created_at) : "7%";
              const netValue = budget * (1 - feeRate);
              return (
                <>
                  <p className="mt-2 text-[28px] font-extrabold" style={{ color: "#1B5E20" }}>
                    R$ {netValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-0.5 text-[10px]" style={{ color: "#666" }}>
                    Taxa de {feePct} já descontada
                  </p>
                </>
              );
            })()}
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "#4CAF50" }}>
              Este valor será liberado para você após a conclusão confirmada pelo cliente.
          </p>
          </div>
        )}

        {/* Aditivos do contrato */}
        {contract?.id && contract.status !== "cancelled" && contract.status !== "completed" && opp?.accepted_by === user?.id && (
          <div className="mb-4">
            <ContractAddendums
              contractId={contract.id}
              contractStatus={contract.status}
              userRole="professional"
              professionalId={user?.id ?? null}
              onChange={loadOpp}
            />
          </div>
        )}

        {/* Category */}
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "rgba(39,110,241,0.12)" }}>
            <CategoryIcon slug={opp.category_slug} name={opp.category_name} size={20} className="text-[#276EF1]" strokeWidth={2.25} />
          </span>
          <span className="rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}>
            {opp.category_name}
          </span>
        </div>

        <h1 className="mt-3 text-[24px] font-extrabold leading-[1.2] text-black">{opp.title}</h1>
        {opp.description && <p className="mt-2.5 text-sm leading-[1.7] text-[#767676]">{opp.description}</p>}

        <div className="my-4 h-px bg-[#E5E5E5]" />

        <div className="grid grid-cols-2 gap-3">
          {details.map((d, i) => (
            <div key={i} className="rounded-xl bg-[#F7F7F7] p-3">
              <div className="flex items-center gap-1.5">
                {d.icon}
                <span className="text-[11px] text-[#767676]">{d.label}</span>
              </div>
              <p className={`mt-1.5 text-sm ${d.valueBold ? "font-bold" : "font-semibold"} text-black`}
                style={{ color: d.valueColor, ...(d.clamp ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" } : {}) }}>
                {d.value}
              </p>
            </div>
          ))}
        </div>

        {/* Client card */}
        <div
          className="mt-4 rounded-2xl bg-[#F7F7F7] p-3.5 cursor-pointer active:bg-[#EBEBEB] transition-colors"
          onClick={() => opp.client_id && navigate(`/perfil-cliente/${opp.client_id}`)}
        >
          <span className="text-[10px] font-semibold tracking-[2px] text-[#767676]">CONTRATANTE</span>
          <div className="mt-2.5 flex items-center gap-3">
            {opp.client_avatar ? (
              <img src={opp.client_avatar} alt={opp.client_name || ""} className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#276EF1] text-sm font-bold text-white">
                {getInitials(opp.client_name)}
              </div>
            )}
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-black">{opp.client_name || "Cliente"}</p>
              {opp.client_verified && <span className="text-[11px] font-medium text-[#2E7D32]">Verificado ✓</span>}
            </div>
            <ArrowLeft size={16} className="text-[#767676] rotate-180" />
          </div>
        </div>
      </motion.div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E5E5E5] bg-white px-6 py-4">
        {(opp.status === "open" || opp.status === "pending_selection") ? (
          isPrivateForMe ? (
            <div className="flex gap-2.5">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
                className="flex h-[52px] flex-1 items-center justify-center rounded-[14px] bg-[#276EF1] text-[15px] font-bold text-white">
                Aceitar ⚡
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowDeclineModal(true)}
                className="flex h-[52px] flex-1 items-center justify-center rounded-[14px] text-[15px] font-semibold"
                style={{ background: "#FFEBEE", color: "#C62828" }}>
                Recusar
              </motion.button>
            </div>
          ) : hasApplied ? (
            <div className="space-y-2">
              <button disabled className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#E8F5E9] text-base font-semibold" style={{ color: "#2E7D32" }}>
                Já me candidatei ✓
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-2xl text-[13px] font-semibold"
                style={{ background: "#FFEBEE", color: "#C62828" }}
              >
                <XCircle className="h-4 w-4" /> Desistir da oportunidade
              </button>
            </div>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowApplyModal(true)}
              className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#276EF1] text-base font-bold text-white">
              Me candidatar ⚡
            </motion.button>
          )
        ) : opp.status === "awaiting_signatures" ? (
          <div className="space-y-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/contratos")}
              className="flex h-[54px] w-full items-center justify-center rounded-2xl text-base font-bold text-white" style={{ background: "#1565C0" }}>
              ✍️ Assinar contrato →
            </motion.button>
            {contract && opp.accepted_by === user?.id && (
              <button
                onClick={() => setShowRefuseContractModal(true)}
                className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-2xl text-[13px] font-semibold"
                style={{ background: "#FFEBEE", color: "#C62828" }}
              >
                <XCircle className="h-4 w-4" /> Desistir do Freela
              </button>
            )}
          </div>
        ) : isPaymentConfirmed ? (
          <div className="space-y-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleStartWork} disabled={startingWork}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-base font-bold text-white disabled:opacity-50"
              style={{ background: "#2E7D32" }}>
              {startingWork ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Play className="h-5 w-5" /> Iniciar Trabalho</>}
            </motion.button>
            <button onClick={() => { setCancelReason(""); setCancelOtherText(""); setShowCancelModal(true); }}
              className="flex h-[40px] w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold"
              style={{ background: "#FFEBEE", color: "#C62828" }}>
              <XCircle className="h-4 w-4" /> Cancelar Freela
            </button>
          </div>
        ) : isContractInProgress ? (
          <div className="space-y-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowFinishWorkModal(true)} disabled={finishingWork}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-base font-bold text-white disabled:opacity-50"
              style={{ background: "#E65100" }}>
              {finishingWork ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Square className="h-5 w-5" /> Finalizar Trabalho</>}
            </motion.button>
            <button onClick={() => { setCancelReason(""); setCancelOtherText(""); setShowCancelModal(true); }}
              className="flex h-[40px] w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold"
              style={{ background: "#FFEBEE", color: "#C62828" }}>
              <XCircle className="h-4 w-4" /> Cancelar Freela
            </button>
          </div>
        ) : opp.status === "accepted" ? (
          <div className="rounded-2xl py-4 text-center text-sm font-semibold" style={{ background: "#FFF3E0", color: "#B45309" }}>
            ✓ Aguardando cliente confirmar o início
          </div>
        ) : opp.status === "in_progress" && opp.target_professional_id === user?.id ? (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowFinishModal(true)}
            className="flex h-[54px] w-full items-center justify-center rounded-2xl text-base font-bold text-white"
            style={{ background: "#2E7D32", borderRadius: 16, fontFamily: "Inter", fontWeight: 700, fontSize: 16 }}>
            ✓ Finalizar Freela
          </motion.button>
        ) : (
          <div className="rounded-2xl bg-[#F7F7F7] py-4 text-center text-sm text-[#767676]">
            Esta oportunidade não está mais disponível
          </div>
        )}
      </div>

      {/* ACCEPT MODAL (private) */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !accepting && setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }} className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center"><Zap size={32} fill="#276EF1" color="#276EF1" /></div>
              <h2 className="mt-3 text-center text-xl font-bold text-black">Confirmar aceite?</h2>
              <p className="mt-2 text-center text-sm leading-relaxed text-[#767676]">
                Ao aceitar, você se compromete a realizar este serviço. Cancelamentos geram penalidades.
              </p>
              <button onClick={handleAccept} disabled={accepting}
                className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#276EF1] text-base font-bold text-white disabled:opacity-50">
                {accepting ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirmar e aceitar"}
              </button>
              <button onClick={() => setShowModal(false)} disabled={accepting}
                className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-black">
                Voltar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* APPLY MODAL (public) */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !applying && setShowApplyModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }} className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center"><Zap size={32} fill="#276EF1" color="#276EF1" /></div>
              <h2 className="mt-3 text-center text-xl font-bold text-black">Me candidatar?</h2>
              <div className="mt-4 rounded-xl bg-[#F7F7F7] p-3.5">
                <p className="text-[15px] font-semibold text-black">{opp.title}</p>
                {opp.budget != null && (
                  <p className="mt-1 text-[14px] font-bold" style={{ color: "#2E7D32" }}>
                    R$ {opp.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <p className="mt-3 text-center text-[13px] leading-relaxed text-[#767676]">
                Ao se candidatar, o cliente poderá te selecionar para este freela.
              </p>
              <button onClick={handleApply} disabled={applying}
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#276EF1] text-base font-bold text-white disabled:opacity-50">
                {applying ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirmar candidatura"}
              </button>
              <button onClick={() => setShowApplyModal(false)} disabled={applying}
                className="mt-2.5 flex h-[48px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-black">
                Voltar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEXT STEPS MODAL */}
      <AnimatePresence>
        {showNextSteps && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.56)" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }} className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center"><span className="text-[40px]">✅</span></div>
              <h2 className="mt-3 text-center text-[22px] font-extrabold text-black">Oportunidade aceita!</h2>
              <p className="mt-1 text-center text-sm font-medium text-[#767676]">O que acontece agora?</p>
              <div className="mt-5 flex flex-col gap-3">
                {[
                  { num: "1", title: "Aguarde a confirmação do cliente", sub: "O contratante tem até 30 minutos para revisar seu perfil e confirmar." },
                  { num: "2", title: "Você receberá uma notificação", sub: "Assim que confirmado, você será notificado com todos os detalhes do serviço." },
                  { num: "3", title: "Assine o contrato digital", sub: "Um contrato será gerado e enviado por email para ambas as partes assinarem." },
                ].map((step) => (
                  <div key={step.num} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#276EF1] text-[13px] font-bold text-white">{step.num}</div>
                    <div>
                      <p className="text-sm font-semibold text-black">{step.title}</p>
                      <p className="mt-0.5 text-xs text-[#767676]">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2 rounded-xl bg-[#FFF3E0] p-3">
                <span className="shrink-0 text-sm">⚠️</span>
                <p className="text-xs leading-relaxed text-[#B45309]">Cancelamentos após confirmação geram penalidades. Em caso de imprevisto, acione o suporte.</p>
              </div>
              <button onClick={() => navigate("/dashboard")}
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#276EF1] text-base font-bold text-white">
                Ir para o início
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DECLINE MODAL */}
      <AnimatePresence>
        {showDeclineModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !declining && setShowDeclineModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }} className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center"><AlertCircle className="h-8 w-8" style={{ color: "#C62828" }} /></div>
              <h2 className="mt-3 text-center text-xl font-bold text-black">Recusar esta proposta?</h2>
              <p className="mt-2 text-center text-[13px] leading-relaxed text-[#767676]">
                Ao recusar, a oportunidade ficará visível para outros profissionais. O cliente será notificado.
              </p>
              <button onClick={handleDecline} disabled={declining}
                className="mt-6 flex h-[48px] w-full items-center justify-center rounded-xl text-base font-bold text-white disabled:opacity-50" style={{ background: "#E53935" }}>
                {declining ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirmar recusa"}
              </button>
              <button onClick={() => setShowDeclineModal(false)} disabled={declining}
                className="mt-2.5 flex h-[48px] w-full items-center justify-center rounded-xl bg-[#F7F7F7] text-base font-semibold text-black">
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FINISH MODAL */}
      <AnimatePresence>
        {showFinishModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !finishing && setShowFinishModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }} className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center"><span className="text-[40px]">✅</span></div>
              <h2 className="mt-3 text-center text-xl font-bold text-black">Finalizar este freela?</h2>
              <p className="mt-2 text-center text-[13px] leading-relaxed text-[#767676]">
                Confirme que o serviço foi concluído. O cliente será notificado para confirmar.
              </p>
              <button onClick={handleFinish} disabled={finishing}
                className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl text-base font-bold text-white disabled:opacity-50"
                style={{ background: "#2E7D32" }}>
                {finishing ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirmar conclusão"}
              </button>
              <button onClick={() => setShowFinishModal(false)} disabled={finishing}
                className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-black">
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WITHDRAW MODAL */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !withdrawing && setShowWithdrawModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }} className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center"><AlertCircle className="h-8 w-8" style={{ color: "#C62828" }} /></div>
              <h2 className="mt-3 text-center text-xl font-bold text-black">Tem certeza que deseja desistir?</h2>
              <p className="mt-2 text-center text-[13px] leading-relaxed text-[#767676]">
                Esta ação não pode ser desfeita.
              </p>
              <button onClick={handleWithdraw} disabled={withdrawing}
                className="mt-6 flex h-[48px] w-full items-center justify-center rounded-xl text-base font-bold text-white disabled:opacity-50"
                style={{ background: "#E53935" }}>
                {withdrawing ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirmar desistência"}
              </button>
              <button onClick={() => setShowWithdrawModal(false)} disabled={withdrawing}
                className="mt-2.5 flex h-[48px] w-full items-center justify-center rounded-xl bg-[#F7F7F7] text-base font-semibold text-black">
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CANCEL FREELA MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !cancelling && setShowCancelModal(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl bg-white px-6 pb-8 pt-5" style={{ maxHeight: "85vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E0E0E0]" />
              <div className="flex justify-center"><AlertCircle className="h-8 w-8" style={{ color: "#C62828" }} /></div>
              <h2 className="mt-3 text-center text-lg font-bold text-black">Por que você está cancelando?</h2>
              <p className="mt-1 text-center text-[13px] text-[#767676]">Selecione o motivo do cancelamento</p>

              <div className="mt-4 flex flex-col gap-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <button key={reason} onClick={() => setCancelReason(reason)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[14px] font-medium transition-all"
                    style={{
                      background: cancelReason === reason ? "#FFEBEE" : "#F7F7F7",
                      color: cancelReason === reason ? "#C62828" : "#333",
                      border: cancelReason === reason ? "1.5px solid #EF9A9A" : "1.5px solid transparent",
                    }}>
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        border: cancelReason === reason ? "none" : "2px solid #BDBDBD",
                        background: cancelReason === reason ? "#C62828" : "transparent",
                      }}>
                      {cancelReason === reason && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    {reason}
                  </button>
                ))}
              </div>

              {cancelReason === "Outros" && (
                <textarea
                  value={cancelOtherText}
                  onChange={(e) => setCancelOtherText(e.target.value)}
                  placeholder="Descreva o motivo..."
                  className="mt-3 w-full rounded-xl border border-[#E0E0E0] p-3 text-sm focus:border-[#C62828] focus:outline-none"
                  rows={3}
                />
              )}

              <button onClick={handleCancelFreela}
                disabled={cancelling || !cancelReason || (cancelReason === "Outros" && !cancelOtherText.trim())}
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-2xl text-base font-bold text-white disabled:opacity-40"
                style={{ background: "#E53935" }}>
                {cancelling ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirmar cancelamento"}
              </button>
              <button onClick={() => setShowCancelModal(false)} disabled={cancelling}
                className="mt-2.5 flex h-[48px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-black">
                Voltar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FINISH WORK CONFIRMATION MODAL */}
      <AnimatePresence>
        {showFinishWorkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !finishingWork && setShowFinishWorkModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }} className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center"><Square className="h-8 w-8" style={{ color: "#E65100" }} /></div>
              <h2 className="mt-3 text-center text-xl font-bold text-black">Finalizar trabalho?</h2>
              <p className="mt-2 text-center text-[13px] leading-relaxed text-[#767676]">
                Tem certeza que deseja finalizar? O cliente será notificado para confirmar a conclusão.
              </p>
              <button onClick={handleFinishWork} disabled={finishingWork}
                className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl text-base font-bold text-white disabled:opacity-50"
                style={{ background: "#E65100" }}>
                {finishingWork ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirmar"}
              </button>
              <button onClick={() => setShowFinishWorkModal(false)} disabled={finishingWork}
                className="mt-2.5 flex h-[48px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-black">
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REFUSE CONTRACT MODAL */}
      <AnimatePresence>
        {showRefuseContractModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !refusingContract && setShowRefuseContractModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }} className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center"><AlertCircle className="h-8 w-8" style={{ color: "#C62828" }} /></div>
              <h2 className="mt-3 text-center text-xl font-bold text-black">Não assinar o contrato?</h2>
              <p className="mt-2 text-center text-[13px] leading-relaxed text-[#767676]">
                O contrato será cancelado e a vaga ficará disponível para outros profissionais. O cliente será notificado.
              </p>
              <div className="mt-4 rounded-xl bg-[#FFF3E0] p-3">
                <p className="text-[12px] leading-relaxed text-[#B45309]">
                  ⚠️ Recusar contratos pode afetar sua reputação na plataforma.
                </p>
              </div>
              <button onClick={handleRefuseContract} disabled={refusingContract}
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-2xl text-base font-bold text-white disabled:opacity-50"
                style={{ background: "#E53935" }}>
                {refusingContract ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirmar recusa"}
              </button>
              <button onClick={() => setShowRefuseContractModal(false)} disabled={refusingContract}
                className="mt-2.5 flex h-[48px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-black">
                Voltar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OportunidadeDetalhePage;
