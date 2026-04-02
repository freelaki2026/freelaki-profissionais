import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Bell, ArrowRight, MapPin, FileText, Clock } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import DashboardDrawer from "@/components/dashboard/DashboardDrawer";
import BottomNav from "@/components/dashboard/BottomNav";
import OpportunityCard from "@/components/dashboard/OpportunityCard";
import NotificationPanel from "@/components/dashboard/NotificationPanel";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  approval_status: string | null;
  is_online: boolean | null;
  is_approved: boolean | null;
}

interface Opp {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: string | null;
  scheduled_at?: string | null;
  location_address?: string | null;
  category_name?: string;
  category_icon?: string;
}

const formatSchedule = (scheduledAt: string | null | undefined): string => {
  if (!scheduledAt) return "A combinar";
  const date = new Date(scheduledAt);
  if (isToday(date)) return `Hoje às ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Amanhã às ${format(date, "HH:mm")}`;
  return format(date, "EEE, d MMM", { locale: ptBR });
};

const extractShortAddress = (address: string | null | undefined): string => {
  if (!address) return "";
  const parts = address.split(",").map((s) => s.trim());
  return parts.length >= 2 ? `${parts[parts.length - 2]}` : parts[0];
};

/* ───── Pulsing circles animation ───── */
const PulsingCircles = ({
  color,
  icon,
}: {
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
    {/* Outer */}
    <div
      className="absolute inset-0 rounded-full"
      style={{
        border: `2px solid ${color}`,
        opacity: 0.2,
        animation: "dashPulseOuter 2s ease-in-out infinite",
      }}
    />
    {/* Middle */}
    <div
      className="absolute rounded-full"
      style={{
        width: 100,
        height: 100,
        border: `2px solid ${color}`,
        opacity: 0.4,
        animation: "dashPulseMiddle 2s ease-in-out infinite 0.3s",
      }}
    />
    {/* Inner */}
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: 70,
        height: 70,
        background: `${color}1A`,
        border: `2px solid ${color}`,
      }}
    >
      {icon}
    </div>
  </div>
);

/* ───── Carousel Card ───── */
const CarouselOppCard = ({ opp, isMock = false }: { opp: Opp; isMock?: boolean }) => {
  const navigate = useNavigate();
  const shortAddr = extractShortAddress(opp.location_address);

  return (
    <motion.button
      whileTap={isMock ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onClick={isMock ? undefined : () => navigate(`/oportunidade/${opp.id}`)}
      className="relative flex h-[160px] w-[220px] shrink-0 flex-col rounded-[24px] bg-white p-4 text-left mb-2"
      style={{
        scrollSnapAlign: "start",
        boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        pointerEvents: isMock ? "none" : undefined,
      }}
    >
      {isMock && (
        <span className="absolute top-3 right-3 rounded-full bg-[#F7F7F7] px-2 py-[3px] text-[10px] font-medium text-[#767676]">
          Preview
        </span>
      )}
      <span
        className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}
      >
        <span className="text-[16px] leading-none">{opp.category_icon || "📦"}</span>
        <span className="truncate">{opp.category_name || "Geral"}</span>
      </span>
      <p
        className="mt-2.5 text-[15px] font-bold text-foreground leading-[1.3]"
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {opp.title}
      </p>
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        {shortAddr && (
          <span className="flex items-center gap-0.5 text-[11px] text-[#767676] max-w-[100px] truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{shortAddr}</span>
          </span>
        )}
        <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-semibold text-white whitespace-nowrap">
          {formatSchedule(opp.scheduled_at)}
        </span>
      </div>
    </motion.button>
  );
};

/* ───── State 1: Documents Pending ───── */
const DocumentsPendingState = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8" style={{ minHeight: "60vh" }}>
      <PulsingCircles color="#276EF1" icon={<FileText size={28} color="#276EF1" />} />
      <h2 className="mt-8 text-center text-[22px] font-bold text-white">Ative sua conta</h2>
      <p className="mt-2 text-center text-[14px] text-[#767676]" style={{ lineHeight: 1.6 }}>
        Envie seus documentos para começar a receber oportunidades.
      </p>
      <button
        onClick={() => navigate("/documentos")}
        className="mt-7 flex h-[52px] w-full max-w-[280px] items-center justify-center rounded-[16px] bg-[#276EF1] text-[16px] font-bold text-white"
      >
        Enviar documentos →
      </button>
    </div>
  );
};

/* ───── State 2: Under Review ───── */
const UnderReviewState = () => (
  <div className="flex flex-1 flex-col items-center justify-center px-8" style={{ minHeight: "60vh" }}>
    <PulsingCircles color="#F59E0B" icon={<Clock size={28} color="#B45309" />} />
    <h2 className="mt-8 text-center text-[22px] font-bold text-white">Documentos em análise</h2>
    <p className="mt-2 text-center text-[14px] text-[#767676]" style={{ lineHeight: 1.6 }}>
      Nossa equipe está analisando seus documentos. Prazo de até 3 dias úteis.
    </p>
    <span
      className="mt-4 inline-flex items-center rounded-full px-4 py-2 text-[13px] font-medium"
      style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
    >
      Notificaremos você por email ✉️
    </span>
  </div>
);

/* ───── Online/Offline Card ───── */
const OnlineOfflineCard = ({
  isOnline,
  loading,
  onToggle,
}: {
  isOnline: boolean;
  loading: boolean;
  onToggle: () => void;
}) => (
  <motion.div
    key={isOnline ? "online" : "offline"}
    initial={{ scale: 1 }}
    animate={{ scale: [1, 1.02, 1] }}
    transition={{ duration: 0.3 }}
    className="mx-5 mt-4 rounded-[20px] p-4"
    style={{
      border: isOnline ? "1.5px solid #00C853" : "1.5px solid #333333",
      background: isOnline ? "rgba(0,200,83,0.06)" : "#111111",
      transition: "all 400ms ease",
    }}
  >
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{
          background: isOnline ? "#00C853" : "#E53935",
          animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      />
      <span className="text-[15px] font-semibold" style={{ color: isOnline ? "#00C853" : "#FFFFFF" }}>
        {isOnline ? "Você está online" : "Você está offline"}
      </span>
    </div>
    <p className="mt-1 text-[13px] text-[#767676]">
      {isOnline ? "Aguardando oportunidades..." : "Fique online para receber oportunidades"}
    </p>
    <button
      disabled={loading}
      onClick={onToggle}
      className="mt-3 flex h-[44px] w-full items-center justify-center rounded-[12px] text-[14px] font-semibold disabled:opacity-50"
      style={
        isOnline
          ? { background: "#1A1A1A", color: "#767676" }
          : { background: "#276EF1", color: "#FFFFFF" }
      }
    >
      {loading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : isOnline ? (
        "Ficar Offline"
      ) : (
        "Ficar Online →"
      )}
    </button>
  </motion.div>
);

/* ───── Main Dashboard ───── */
const DashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const oppRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, insertNotification } = useNotifications();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [bellShake, setBellShake] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [available, setAvailable] = useState<Opp[]>([]);
  const [accepted, setAccepted] = useState<Opp[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, approval_status, is_online, is_approved")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setIsOnline(data.is_online ?? false);
        }
      });
  }, [user]);

  // Realtime: listen for profile approval_status changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("profile-status-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as any;
          setProfile((prev) =>
            prev
              ? { ...prev, approval_status: updated.approval_status, is_approved: updated.is_approved }
              : prev
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load opportunities
  const loadOpportunities = useCallback(async () => {
    if (!user) return;
    setLoadingOpps(true);

    const { data: avail } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, scheduled_at, location_address, category_id, categories(name, icon)")
      .eq("status", "open")
      .in(
        "category_id",
        (await supabase
          .from("professional_categories")
          .select("category_id")
          .eq("profile_id", user.id)
        ).data?.map((r) => r.category_id!) || []
      )
      .order("created_at", { ascending: false });

    if (avail) {
      setAvailable(
        avail.map((o: any) => ({
          id: o.id, title: o.title, description: o.description,
          budget: o.budget, status: o.status, scheduled_at: o.scheduled_at,
          location_address: o.location_address,
          category_name: o.categories?.name, category_icon: o.categories?.icon,
        }))
      );
    }

    const { data: acc } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, category_id, categories(name, icon)")
      .eq("accepted_by", user.id)
      .in("status", ["accepted", "in_progress"])
      .order("created_at", { ascending: false });

    if (acc) {
      setAccepted(
        acc.map((o: any) => ({
          id: o.id, title: o.title, description: o.description,
          budget: o.budget, status: o.status,
          category_name: o.categories?.name, category_icon: o.categories?.icon,
        }))
      );
    }

    setLoadingOpps(false);
  }, [user]);

  useEffect(() => { loadOpportunities(); }, [loadOpportunities]);

  // Realtime for opportunities when online
  useEffect(() => {
    if (!isOnline || !user) return;
    const channel = supabase
      .channel("opportunities-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "opportunities" }, (payload) => {
        loadOpportunities();
        const opp = payload.new as any;
        if (opp && isOnline) {
          insertNotification({
            type: "oportunidade",
            title: "⚡ Nova oportunidade!",
            body: `${opp.title}${opp.budget ? ` — R$ ${Number(opp.budget).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}`,
            action_url: `/oportunidade/${opp.id}`,
          });
          setBellShake(true);
          setTimeout(() => setBellShake(false), 300);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "opportunities" }, () => loadOpportunities())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOnline, user, loadOpportunities]);

  const toggleOnline = async () => {
    if (!user) return;
    setTogglingOnline(true);
    const newVal = !isOnline;
    const { error } = await supabase.from("profiles").update({ is_online: newVal }).eq("id", user.id);
    if (!error) {
      setIsOnline(newVal);
      if (newVal) loadOpportunities();
    } else {
      toast({ title: "Erro ao alterar status.", variant: "destructive" });
    }
    setTogglingOnline(false);
  };

  const scrollToOpp = () => { oppRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const approvalStatus = profile?.approval_status || "incomplete";
  const isApproved = approvalStatus === "approved";

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 pt-[52px] pb-5">
        <div className="w-[22px]" />
        <div className="flex items-center" style={{ gap: 10 }}>
          <Zap size={24} fill="#276EF1" color="#276EF1" />
          <span className="font-bold text-white" style={{ fontSize: 22, letterSpacing: "-0.5px" }}>freelaki</span>
        </div>
        <button onClick={() => setNotifOpen(true)} className="relative"
          style={{ animation: bellShake ? "bellShake 300ms ease" : "none" }}>
          <Bell className="h-[22px] w-[22px]" style={{ color: unreadCount > 0 ? "#F59E0B" : "#FFFFFF" }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
              style={{ background: "#F59E0B", color: "#000" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* STATE-BASED CONTENT */}
      {!isApproved ? (
        approvalStatus === "pending" ? (
          <UnderReviewState />
        ) : (
          <DocumentsPendingState />
        )
      ) : (
        <>
          {/* Online/Offline Card */}
          <OnlineOfflineCard isOnline={isOnline} loading={togglingOnline} onToggle={toggleOnline} />

          {/* Body */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="mt-5 flex-1 rounded-t-3xl bg-[#F7F7F7] px-4 pb-24 pt-5"
          >
            {isOnline ? (
              <>
                {/* AVAILABLE — Carousel */}
                <div ref={oppRef}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-base font-semibold text-foreground">Disponíveis</span>
                    {available.length > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#276EF1] px-2.5 text-xs font-medium text-white">
                        {available.length}
                      </span>
                    )}
                  </div>

                  <div className="relative mt-3 -mx-4">
                    {loadingOpps ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
                      </div>
                    ) : available.length > 0 ? (
                      <div
                        className="flex gap-3.5 overflow-x-auto px-6 pb-4 pt-2"
                        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", cursor: "grab" }}
                      >
                        <style>{`.carousel-scroll::-webkit-scrollbar { display: none; }`}</style>
                        {available.map((opp) => (
                          <CarouselOppCard key={opp.id} opp={opp} />
                        ))}
                        <button
                          onClick={scrollToOpp}
                          className="flex h-[160px] w-[80px] shrink-0 flex-col items-center justify-center rounded-[24px] border border-[#276EF1] mb-2"
                          style={{ scrollSnapAlign: "start", background: "rgba(39,110,241,0.06)" }}
                        >
                          <ArrowRight className="h-6 w-6 text-[#276EF1]" />
                          <span className="mt-1 text-[11px] font-medium text-[#276EF1]">Ver todas</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex gap-3.5 overflow-x-auto px-6 pb-4 pt-2 pointer-events-none"
                        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
                      >
                        <CarouselOppCard
                          isMock
                          opp={{
                            id: "mock-1", title: "Cobertura de evento", description: null, budget: null, status: null,
                            category_name: "Fotógrafo", category_icon: "📷", location_address: "Alphaville, SP",
                            scheduled_at: (() => { const d = new Date(); d.setHours(15, 0, 0, 0); return d.toISOString(); })(),
                          }}
                        />
                        <CarouselOppCard
                          isMock
                          opp={{
                            id: "mock-2", title: "Vídeo institucional", description: null, budget: null, status: null,
                            category_name: "Filmmaker", category_icon: "🎬", location_address: "Pinheiros, SP",
                            scheduled_at: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d.toISOString(); })(),
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ACCEPTED */}
                <div className="mt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-foreground">Aceitas</span>
                    {accepted.length > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-2.5 text-xs font-medium text-white" style={{ background: "#2E7D32" }}>
                        {accepted.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <AnimatePresence>
                      {accepted.length > 0 ? (
                        accepted.map((opp) => (
                          <motion.div
                            key={opp.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                          >
                            <OpportunityCard opp={opp} variant="accepted" />
                          </motion.div>
                        ))
                      ) : (
                        <p className="py-5 text-center text-[13px] text-[#767676]">
                          Nenhuma oportunidade aceita ainda.
                        </p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-6 text-center text-[13px] text-[#767676]">
                Fique online para ver as oportunidades disponíveis
              </p>
            )}
          </motion.div>
        </>
      )}

      {/* DRAWER */}
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} profile={profile} />

      {/* BOTTOM NAV */}
      <BottomNav onOpenDrawer={() => setDrawerOpen(true)} />

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      <style>{`
        @keyframes dashPulseOuter {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes dashPulseMiddle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(12deg); }
          50% { transform: rotate(-12deg); }
          75% { transform: rotate(6deg); }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
