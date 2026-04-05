import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, DollarSign, Calendar, Tag, Star, AlertCircle } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OppDetail {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: string | null;
  scheduled_at: string | null;
  location_address: string | null;
  category_name: string;
  category_icon: string;
  category_description: string | null;
  client_name: string | null;
  client_avatar: string | null;
  client_verified: boolean;
  is_private: boolean;
  target_professional_id: string | null;
}

const formatScheduleDetail = (scheduledAt: string | null): string => {
  if (!scheduledAt) return "A combinar";
  const date = new Date(scheduledAt);
  if (isToday(date)) return `Hoje às ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Amanhã às ${format(date, "HH:mm")}`;
  return format(date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR });
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "open":
      return { label: "● Disponível", bg: "#E8F5E9", color: "#2E7D32" };
    case "accepted":
      return { label: "● Aceita", bg: "#E3F2FD", color: "#1565C0" };
    case "completed":
      return { label: "● Encerrada", bg: "#F7F7F7", color: "#767676" };
    case "cancelled":
      return { label: "● Cancelada", bg: "#FFEBEE", color: "#C62828" };
    default:
      return { label: "● Desconhecido", bg: "#F7F7F7", color: "#767676" };
  }
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const OportunidadeDetalhePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [opp, setOpp] = useState<OppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);
   const [accepting, setAccepting] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declining, setDeclining] = useState(false);

  const loadOpp = async () => {
    if (!id) return;
    setLoading(true);
    setNetworkError(false);
    const { data, error } = await supabase
      .from("opportunities")
      .select(
        "id, title, description, budget, status, scheduled_at, location_address, is_private, target_professional_id, category_id, categories(name, icon, description), client_id, profiles!opportunities_client_id_fkey(full_name, avatar_url, is_approved)"
      )
      .eq("id", id)
      .single();

    if (data) {
      const cat = (data as any).categories;
      const prof = (data as any).profiles;
      setOpp({
        id: data.id,
        title: data.title,
        description: data.description,
        budget: data.budget,
        status: data.status,
        scheduled_at: data.scheduled_at,
        location_address: data.location_address,
        category_name: cat?.name || "Geral",
        category_icon: cat?.icon || "📦",
        category_description: cat?.description || null,
        client_name: prof?.full_name || null,
        client_avatar: prof?.avatar_url || null,
        client_verified: prof?.is_approved || false,
      });
    } else if (error) {
      // PGRST116 = not found (single row expected but 0 returned)
      if (error.code !== "PGRST116") {
        setNetworkError(true);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOpp();
  }, [id]);

  // Realtime: watch for status changes on this specific opportunity
  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase
      .channel(`oportunidade_${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "opportunities",
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.status !== "open") {
          setOpp((prev) => prev ? { ...prev, status: updated.status } : prev);
          if (updated.accepted_by !== user.id) {
            toast.error("Esta oportunidade acabou de ser aceita por outro profissional.");
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const handleAccept = async () => {
    if (!user || !opp) return;
    setAccepting(true);

    const { error } = await supabase
      .from("opportunities")
      .update({
        status: "accepted",
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", opp.id)
      .eq("status", "open");

    if (!error) {
      setShowModal(false);
      setTimeout(() => setShowNextSteps(true), 150);
      window.dispatchEvent(new CustomEvent("opportunity_accepted", { detail: { id: opp.id } }));
    } else {
      toast.error("Esta oportunidade já foi aceita por outro profissional.");
      setShowModal(false);
    }
    setAccepting(false);
  };

  const statusBadge = opp ? getStatusBadge(opp.status) : null;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        {/* Skeleton header */}
        <div className="bg-black px-6" style={{ paddingTop: 52, paddingBottom: 24 }}>
          <div className="mx-auto h-5 w-32 animate-shimmer rounded-lg" style={{ background: "linear-gradient(90deg, #333 25%, #444 50%, #333 75%)", backgroundSize: "200% 100%" }} />
        </div>
        {/* Skeleton body */}
        <div className="flex-1 px-6 pt-8">
          <div className="h-7 w-24 animate-shimmer rounded-full" style={{ background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }} />
          <div className="mt-4 h-8 w-4/5 animate-shimmer rounded-lg" style={{ background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }} />
          <div className="mt-2 h-5 w-3/5 animate-shimmer rounded-lg" style={{ background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }} />
          <div className="mt-3 h-16 w-full animate-shimmer rounded-lg" style={{ background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }} />
          <div className="my-5 h-px bg-[#E5E5E5]" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-shimmer rounded-xl" style={{ background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }} />
            ))}
          </div>
          <div className="mt-4 h-20 animate-shimmer rounded-2xl" style={{ background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }} />
        </div>
        <style>{`
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          .animate-shimmer { animation: shimmer 1.5s infinite linear; }
        `}</style>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
        <span className="text-[32px]">⚠️</span>
        <h2 className="mt-4 text-lg font-semibold text-white">Erro ao carregar</h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Verifique sua conexão e tente novamente.</p>
        <button
          onClick={loadOpp}
          className="mt-8 flex h-[52px] items-center justify-center rounded-2xl bg-[hsl(var(--primary))] px-8 text-base font-bold text-white"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L4.09 12.24a1 1 0 00.77 1.62H11v6.14a1 1 0 001.8.55L21.91 10.31a1 1 0 00-.77-1.62H13V2.86a1 1 0 00-1.8-.55z" fill="#276EF1" />
        </svg>
        <h2 className="mt-4 text-lg font-semibold text-white">Oportunidade não encontrada</h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Ela pode ter sido aceita por outro profissional.</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-8 flex h-[52px] items-center justify-center rounded-2xl bg-[hsl(var(--primary))] px-8 text-base font-bold text-white"
        >
          ← Voltar ao início
        </button>
      </div>
    );
  }

  const details = [
    {
      icon: <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />,
      label: "Local",
      value: opp.location_address || "Não informado",
    },
    {
      icon: <DollarSign className="h-4 w-4 text-[#2E7D32]" />,
      label: "Valor",
      value: opp.budget ? `R$ ${opp.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "A combinar",
      valueColor: opp.budget ? "#2E7D32" : undefined,
      valueBold: !!opp.budget,
    },
    {
      icon: <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />,
      label: "Data",
      value: formatScheduleDetail(opp.scheduled_at),
    },
    {
      icon: <Tag className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />,
      label: "Categoria",
      value: opp.category_description || opp.category_name,
      clamp: true,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <div className="relative flex items-center justify-between bg-black px-6" style={{ paddingTop: 52, paddingBottom: 24 }}>
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-white">
          Oportunidade
        </span>
        <div className="w-6" />
      </div>

      {/* STATUS BADGE */}
      {statusBadge && (
        <div className="flex justify-center" style={{ marginTop: -14, zIndex: 10, position: "relative" }}>
          <span
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={{ background: statusBadge.bg, color: statusBadge.color }}
          >
            {statusBadge.label}
          </span>
        </div>
      )}

      {/* BODY */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 px-6 pb-32 pt-5"
      >
        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span className="text-[28px] leading-none">{opp.category_icon}</span>
          <span
            className="rounded-full px-3 py-1 text-[13px] font-semibold"
            style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}
          >
            {opp.category_name}
          </span>
        </div>

        {/* Title */}
        <h1 className="mt-3 text-[24px] font-extrabold leading-[1.2] text-foreground">
          {opp.title}
        </h1>

        {/* Description */}
        {opp.description && (
          <p className="mt-2.5 text-sm leading-[1.7] text-[hsl(var(--muted-foreground))]">
            {opp.description}
          </p>
        )}

        {/* Divider */}
        <div className="my-4 h-px bg-[hsl(var(--border))]" />

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3">
          {details.map((d, i) => (
            <div key={i} className="rounded-xl bg-[#F7F7F7] p-3">
              <div className="flex items-center gap-1.5">
                {d.icon}
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{d.label}</span>
              </div>
              <p
                className={`mt-1.5 text-sm ${d.valueBold ? "font-bold" : "font-semibold"} text-foreground`}
                style={{
                  color: d.valueColor || undefined,
                  ...(d.clamp
                    ? {
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }
                    : {}),
                }}
              >
                {d.value}
              </p>
            </div>
          ))}
        </div>

        {/* Client card */}
        <div className="mt-4 rounded-2xl bg-[#F7F7F7] p-3.5">
          <span className="text-[10px] font-semibold tracking-[2px] text-[hsl(var(--muted-foreground))]">
            CONTRATANTE
          </span>
          <div className="mt-2.5 flex items-center gap-3">
            {opp.client_avatar ? (
              <img
                src={opp.client_avatar}
                alt={opp.client_name || ""}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-sm font-bold text-white">
                {getInitials(opp.client_name)}
              </div>
            )}
            <div>
              <p className="text-[15px] font-semibold text-foreground">
                {opp.client_name || "Cliente"}
              </p>
              {opp.client_verified && (
                <span className="text-[11px] font-medium text-[#2E7D32]">Verificado ✓</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[hsl(var(--border))] bg-white px-6 py-4">
        {opp.status === "open" ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-base font-bold text-white"
          >
            Aceitar Oportunidade ⚡
          </motion.button>
        ) : (
          <div className="rounded-2xl bg-[#F7F7F7] py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Esta oportunidade não está mais disponível
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !accepting && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L4.09 12.24a1 1 0 00.77 1.62H11v6.14a1 1 0 001.8.55L21.91 10.31a1 1 0 00-.77-1.62H13V2.86a1 1 0 00-1.8-.55z" fill="#276EF1" />
                </svg>
              </div>
              <h2 className="mt-3 text-center text-xl font-bold text-foreground">Confirmar aceite?</h2>
              <p className="mt-2 text-center text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Ao aceitar, você se compromete a realizar este serviço. Cancelamentos geram penalidades.
              </p>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-base font-bold text-white disabled:opacity-50"
              >
                {accepting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Confirmar e aceitar"
                )}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={accepting}
                className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-foreground"
              >
                Voltar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEXT STEPS MODAL */}
      <AnimatePresence>
        {showNextSteps && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.56)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-6 w-full max-w-sm rounded-3xl bg-white p-7"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-center">
                <span className="text-[40px]">✅</span>
              </div>
              <h2 className="mt-3 text-center text-[22px] font-extrabold text-foreground">
                Oportunidade aceita!
              </h2>
              <p className="mt-1 text-center text-sm font-medium text-[hsl(var(--muted-foreground))]">
                O que acontece agora?
              </p>

              {/* Steps */}
              <div className="mt-5 flex flex-col gap-3">
                {[
                  {
                    num: "1",
                    title: "Aguarde a confirmação do cliente",
                    sub: "O contratante tem até 30 minutos para revisar seu perfil e confirmar.",
                  },
                  {
                    num: "2",
                    title: "Você receberá uma notificação",
                    sub: "Assim que confirmado, você será notificado com todos os detalhes do serviço.",
                  },
                  {
                    num: "3",
                    title: "Assine o contrato digital",
                    sub: "Um contrato será gerado e enviado por email para ambas as partes assinarem.",
                  },
                ].map((step) => (
                  <div key={step.num} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[13px] font-bold text-white">
                      {step.num}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning */}
              <div className="mt-4 flex gap-2 rounded-xl bg-[#FFF3E0] p-3">
                <span className="shrink-0 text-sm">⚠️</span>
                <p className="text-xs leading-relaxed text-[#B45309]">
                  Cancelamentos após confirmação geram penalidades. Em caso de imprevisto, acione o suporte.
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-base font-bold text-white"
              >
                Ir para o início
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OportunidadeDetalhePage;
