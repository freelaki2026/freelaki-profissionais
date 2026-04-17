import { useState, useEffect, useRef, useCallback, memo } from "react";

import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Bell, MapPin, FileText, Clock,
  Eye, EyeOff, ArrowUp, ArrowDown, Plus, CheckCircle, Map, MessageCircle,
} from "lucide-react";

import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { FloatingNav } from "@/components/FloatingNav";
import NotificationPanel from "@/components/dashboard/NotificationPanel";

const SOUND_ONLINE = 'https://chkeoqugdcciojzmuczr.supabase.co/storage/v1/object/public/Sounds/Online%20button%20freelaki.mp3';
const SOUND_OFFLINE = 'https://chkeoqugdcciojzmuczr.supabase.co/storage/v1/object/public/Sounds/Offline%20button%20freelaki.mp3';

const playSound = (url: string) => {
  try {
    const audio = new Audio(url);
    audio.volume = 0.6;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Som bloqueado pelo browser:', err);
      });
    }
  } catch (err) {
    console.warn('Erro ao criar Audio:', err);
  }
};

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  approval_status: string | null;
  is_online: boolean | null;
  is_approved: boolean | null;
  cpf_cnpj: string | null;
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
  application_count?: number;
  is_private?: boolean;
  is_remote?: boolean;
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

/* ───── Carousel Card (memoized: só re-renderiza se a oportunidade mudar) ───── */
const CarouselOppCard = memo(({ opp, onApply }: { opp: Opp; onApply: () => void }) => {
  const navigate = useNavigate();
  const shortAddr = extractShortAddress(opp.location_address);

  return (
    <div
      className="relative flex h-[170px] w-[220px] shrink-0 flex-col rounded-[24px] bg-white p-4 text-left mb-2"
      style={{
        scrollSnapAlign: "start",
        boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <button onClick={() => navigate(`/oportunidade/${opp.id}`)} className="flex flex-1 flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}
          >
            <span className="text-[16px] leading-none">{opp.category_icon || "📦"}</span>
            <span className="truncate">{opp.category_name || "Geral"}</span>
          </span>
          {opp.status === "pending_selection" && opp.application_count != null && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: "#FFF3E0", color: "#B45309" }}
            >
              {opp.application_count}/3
            </span>
          )}
        </div>
        <p
          className="mt-2 text-[14px] font-bold text-foreground leading-[1.3]"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {opp.title}
        </p>
        {shortAddr && (
          <span className="mt-1.5 flex items-center gap-0.5 text-[11px] text-[#767676] max-w-[140px] truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{shortAddr}</span>
          </span>
        )}
      </button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={(e) => { e.stopPropagation(); onApply(); }}
        className="mt-auto flex h-[32px] w-full items-center justify-center rounded-[10px] text-[12px] font-semibold text-white"
        style={{ background: opp.is_private ? "#2E7D32" : "#276EF1" }}
      >
        {opp.is_private ? "Aceitar ⚡" : "Me candidatar →"}
      </motion.button>
    </div>
  );
});
CarouselOppCard.displayName = "CarouselOppCard";

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

  const [notifOpen, setNotifOpen] = useState(false);
  const [bellShake, setBellShake] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [available, setAvailable] = useState<Opp[]>([]);
  const [applications, setApplications] = useState<{ id: string; opportunity: Opp }[]>([]);
  const [accepted, setAccepted] = useState<Opp[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [applyModal, setApplyModal] = useState<Opp | null>(null);
  const [applyingId, setApplyingId] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "going-online" | "going-offline">("idle");
  const [showOnlineLayout, setShowOnlineLayout] = useState(false);
  const [weekTotal, setWeekTotal] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [financialSummary, setFinancialSummary] = useState<{ available: number; reserved: number }>({ available: 0, reserved: 0 });
  const [recentEarnings, setRecentEarnings] = useState<Array<{ id: string; description: string | null; amount: number; created_at: string }>>([]);
  const [balanceVisible, setBalanceVisible] = useState(true);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, approval_status, is_online, is_approved, cpf_cnpj")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setIsOnline(data.is_online ?? false);
          setShowOnlineLayout(data.is_online ?? false);
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

    const { data: cats } = await supabase
      .from("professional_categories")
      .select("category_id")
      .eq("profile_id", user.id);
    const catIds = cats?.map((r) => r.category_id!).filter(Boolean) || [];
    setUserCategories(catIds);

    // Load my pending applications
    const { data: myApps } = await supabase
      .from("opportunity_applications")
      .select("id, opportunity_id, status, opportunities(id, title, description, budget, status, scheduled_at, location_address, categories(name, icon))")
      .eq("professional_id", user.id)
      .eq("status", "pending");
    
    const appliedIds = new Set(myApps?.map((a: any) => a.opportunity_id) || []);
    
    const appsList = (myApps || [])
      .filter((a: any) => a.opportunities && ["open", "pending_selection"].includes(a.opportunities.status))
      .map((a: any) => ({
        id: a.id,
        opportunity: {
          id: a.opportunities.id, title: a.opportunities.title, description: a.opportunities.description,
          budget: a.opportunities.budget, status: a.opportunities.status, scheduled_at: a.opportunities.scheduled_at,
          location_address: a.opportunities.location_address,
          category_name: a.opportunities.categories?.name, category_icon: a.opportunities.categories?.icon,
        } as Opp,
      }));
    setApplications(appsList);

    // Available (exclude already applied)
    // Public opportunities in my categories
    const { data: publicAvail } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, scheduled_at, location_address, category_id, is_private, categories(name, icon), opportunity_applications(id)")
      .in("status", ["open", "pending_selection"])
      .eq("is_private", false)
      .in("category_id", catIds.length > 0 ? catIds : ["__none__"])
      .order("created_at", { ascending: false });

    // Private opportunities targeted directly at me
    const { data: privateAvail } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, scheduled_at, location_address, category_id, is_private, categories(name, icon), opportunity_applications(id)")
      .in("status", ["open", "pending_selection"])
      .eq("is_private", true)
      .eq("target_professional_id", user.id)
      .order("created_at", { ascending: false });

    const avail = [...(publicAvail || []), ...(privateAvail || [])];

    if (avail) {
      setAvailable(
        avail
          .filter((o: any) => !appliedIds.has(o.id))
          .map((o: any) => ({
            id: o.id, title: o.title, description: o.description,
            budget: o.budget, status: o.status, scheduled_at: o.scheduled_at,
            location_address: o.location_address,
            category_name: o.categories?.name, category_icon: o.categories?.icon,
            application_count: o.opportunity_applications?.length || 0,
            is_private: o.is_private || false,
          }))
      );
    }

    const { data: acc } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, category_id, is_remote, location_address, scheduled_at, categories(name, icon)")
      .eq("accepted_by", user.id)
      .in("status", ["awaiting_signatures", "accepted", "in_progress"])
      .order("created_at", { ascending: false });

    if (acc) {
      setAccepted(
        acc.map((o: any) => ({
          id: o.id, title: o.title, description: o.description,
          budget: o.budget, status: o.status,
          scheduled_at: o.scheduled_at, location_address: o.location_address,
          is_remote: o.is_remote ?? false,
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "opportunities" }, async (payload) => {
        const newOp = payload.new as any;
        const isForMe = (newOp.is_private && newOp.target_professional_id === user.id) || (!newOp.is_private && userCategories.includes(newOp.category_id));
        if (newOp && isForMe) {
          const { data } = await supabase
            .from("opportunities")
            .select("id, title, description, budget, status, scheduled_at, location_address, category_id, categories(name, icon)")
            .eq("id", newOp.id)
            .single();
          if (data && data.status === "open") {
            const mapped: Opp = {
              id: data.id, title: data.title, description: data.description,
              budget: data.budget, status: data.status, scheduled_at: data.scheduled_at,
              location_address: data.location_address,
              category_name: (data as any).categories?.name, category_icon: (data as any).categories?.icon,
            };
            setAvailable((prev) => [mapped, ...prev.filter((o) => o.id !== data.id)]);
          }
          insertNotification({
            type: "oportunidade",
            title: "⚡ Nova oportunidade!",
            body: `${newOp.title}${newOp.budget ? ` — R$ ${Number(newOp.budget).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}`,
            action_url: `/oportunidade/${newOp.id}`,
          });
          setBellShake(true);
          setTimeout(() => setBellShake(false), 300);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "opportunities" }, (payload) => {
        const updated = payload.new as any;
        if (
          !["open", "pending_selection"].includes(updated.status) ||
          (updated.is_private === true && updated.target_professional_id !== user.id)
        ) {
          setAvailable((prev) => prev.filter((op) => op.id !== updated.id));
          if (updated.accepted_by === user.id) {
            loadOpportunities();
          }
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "opportunity_applications" }, async (payload) => {
        const newApp = payload.new as any;
        // Check if this opportunity now has max candidates and we're not one of them
        const oppId = newApp.opportunity_id;
        if (!oppId) return;
        const { data: appCount } = await supabase
          .from("opportunity_applications")
          .select("id, professional_id")
          .eq("opportunity_id", oppId)
          .eq("status", "pending");
        if (appCount && appCount.length >= 3) {
          const isMe = appCount.some(a => a.professional_id === user.id);
          if (!isMe) {
            setAvailable((prev) => prev.filter((op) => op.id !== oppId));
            toast({ title: "Esta oportunidade atingiu o máximo de candidatos." });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOnline, user, userCategories, insertNotification]);

  // Polling: check opportunity statuses every 30s when online
  useEffect(() => {
    if (!isOnline || !user) return;
    const interval = setInterval(async () => {
      const ids = available.map((o) => o.id);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("opportunities")
        .select("id, status")
        .in("id", ids);
      if (data) {
        const closedIds = data.filter((op) => !["open", "pending_selection"].includes(op.status!)).map((op) => op.id);
        if (closedIds.length > 0) {
          setAvailable((prev) => prev.filter((o) => !closedIds.includes(o.id)));
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline, user, available]);

  // Realtime for applications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-apps-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunity_applications" }, (payload) => {
        const updated = payload.new as any;
        if (updated?.professional_id !== user.id) return;
        if (updated.status === "selected") {
          toast({ title: "🎉 Você foi selecionado! Assine o contrato." });
          navigator.vibrate?.([200, 100, 200]);
          loadOpportunities();
        } else if (updated.status === "rejected") {
          toast({ title: "Outra pessoa foi escolhida. Continue online! 💪" });
          setApplications(prev => prev.filter(a => a.id !== updated.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadOpportunities]);

  // Apply to opportunity handler
  const handleApplyFromDashboard = async () => {
    if (!user || !applyModal) return;
    setApplyingId(true);

    // Private opportunities use accept_opportunity RPC
    if (applyModal.is_private) {
      const { data, error } = await supabase.rpc("accept_opportunity", { p_opportunity_id: applyModal.id });
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (error || !result?.success) {
        toast({ title: result?.error === "already_taken" ? "Esta oportunidade não está mais disponível." : "Erro ao aceitar. Tente novamente.", variant: "destructive" });
      } else {
        toast({ title: "Oportunidade aceita! Mensagem enviada ao cliente. 🎉" });
        window.dispatchEvent(new CustomEvent("opportunity_accepted", { detail: { id: applyModal.id } }));
        setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
        loadOpportunities();
      }
      setApplyingId(false);
      setApplyModal(null);
      return;
    }

    // Public opportunities use apply_to_opportunity RPC
    const { data, error } = await supabase.rpc("apply_to_opportunity", { p_opportunity_id: applyModal.id });
    const result = typeof data === "string" ? JSON.parse(data) : data;

    if (error) {
      toast({ title: "Erro ao enviar candidatura. Tente novamente.", variant: "destructive" });
      setApplyingId(false);
      setApplyModal(null);
      return;
    }

    if (result?.error) {
      switch (result.error) {
        case "not_available":
          toast({ title: "Esta oportunidade não está mais disponível.", variant: "destructive" });
          setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
          window.dispatchEvent(new CustomEvent("opportunity_unavailable", { detail: { id: applyModal.id } }));
          break;
        case "already_applied":
          toast({ title: "Você já se candidatou a esta oportunidade." });
          setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
          break;
        case "max_reached":
          toast({ title: "Esta oportunidade atingiu o máximo de candidatos por enquanto. Fique atento a novas oportunidades!" });
          setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
          break;
        default:
          toast({ title: "Erro ao se candidatar. Tente novamente.", variant: "destructive" });
      }
    } else if (result?.success) {
      toast({ title: "Candidatura enviada! ⚡ Aguarde o cliente te selecionar." });
      setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
      loadOpportunities();
    }
    setApplyingId(false);
    setApplyModal(null);
  };

  // Listen for custom events from detail page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        setAvailable((prev) => prev.filter((o) => o.id !== detail.id));
      }
    };
    const unavailableHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        setAvailable((prev) => prev.filter((o) => o.id !== detail.id));
      }
    };
    window.addEventListener("opportunity_accepted", handler);
    window.addEventListener("opportunity_declined", handler);
    window.addEventListener("opportunity_unavailable", unavailableHandler);
    return () => {
      window.removeEventListener("opportunity_accepted", handler);
      window.removeEventListener("opportunity_declined", handler);
      window.removeEventListener("opportunity_unavailable", unavailableHandler);
    };
  }, []);

  // Load earnings summary
  const loadEarnings = useCallback(async () => {
    if (!user) return;

    // Available = sum of earnings with status 'available'
    const { data: availableEarnings } = await supabase
      .from('earnings')
      .select('net_amount')
      .eq('profile_id', user.id)
      .eq('status', 'available');
    const availableTotal = availableEarnings?.reduce((sum, e) => sum + Number(e.net_amount), 0) || 0;

    // Reserved = sum from active contracts (payment_confirmed / in_progress)
    const { data: activeContracts } = await supabase
      .from('contracts')
      .select('opportunity_id, created_at')
      .eq('professional_id', user.id)
      .in('status', ['payment_confirmed', 'in_progress']);

    let reservedTotal = 0;
    if (activeContracts && activeContracts.length > 0) {
      const oppIds = activeContracts.map((c: any) => c.opportunity_id).filter(Boolean);
      if (oppIds.length > 0) {
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id, budget')
          .in('id', oppIds);
        if (opps) {
          reservedTotal = opps.reduce((sum: number, o: any) => sum + (Number(o.budget) || 0), 0);
        }
      }
    }

    setFinancialSummary({ available: availableTotal, reserved: reservedTotal });

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const { data: weekEarnings } = await supabase
      .from('earnings')
      .select('net_amount, status, created_at')
      .eq('profile_id', user.id)
      .gte('created_at', startOfWeek.toISOString());
    setWeekTotal(weekEarnings?.reduce((sum, e) => sum + Number(e.net_amount), 0) || 0);
    setWeekCount(weekEarnings?.length || 0);

    // Recent earnings for histórico
    const { data: recent } = await supabase
      .from('earnings')
      .select('id, description, net_amount, created_at')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentEarnings(
      (recent || []).map((e: any) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.net_amount),
        created_at: e.created_at,
      }))
    );
  }, [user]);

  useEffect(() => { loadEarnings(); }, [loadEarnings]);

  // Realtime for earnings — DEBOUNCED 300ms para agrupar múltiplos eventos
  // (ex: 3 earnings inseridas no mesmo segundo viram 1 reload).
  const earningsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('earnings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'earnings', filter: `profile_id=eq.${user.id}` }, () => {
        if (earningsDebounceRef.current) clearTimeout(earningsDebounceRef.current);
        earningsDebounceRef.current = setTimeout(() => {
          loadEarnings();
          earningsDebounceRef.current = null;
        }, 300);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (earningsDebounceRef.current) clearTimeout(earningsDebounceRef.current);
    };
  }, [user, loadEarnings]);

  const toggleOnline = async () => {
    if (!user || transitionPhase !== "idle") return;
    setTogglingOnline(true);
    const newVal = !isOnline;
    const { error } = await supabase.from("profiles").update({ is_online: newVal }).eq("id", user.id);
    if (error) {
      toast({ title: "Erro ao alterar status.", variant: "destructive" });
      setTogglingOnline(false);
      return;
    }
    setIsOnline(newVal);

    // Sound feedback — called in click handler for browser autoplay policy
    playSound(newVal ? SOUND_ONLINE : SOUND_OFFLINE);

    if (newVal) {
      // OFFLINE → ONLINE transition
      loadOpportunities();
      setTransitionPhase("going-online");
      // Phase 1: flash bolt (500ms), then fade out offline (400ms), then show online (400ms)
      setTimeout(() => {
        setShowOnlineLayout(true);
        setTransitionPhase("idle");
        setTogglingOnline(false);
      }, 900);
    } else {
      // ONLINE → OFFLINE transition
      setTransitionPhase("going-offline");
      setTimeout(() => {
        setShowOnlineLayout(false);
        setTransitionPhase("idle");
        setTogglingOnline(false);
      }, 600);
    }
  };

  const approvalStatus = profile?.approval_status || "incomplete";
  const isApproved = approvalStatus === "approved";

  // Helpers for new layout
  const profileFirstName = (profile?.full_name?.trim().split(" ")[0]) || "Profissional";
  const profileInitials = profile?.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const maskedCpf = (() => {
    const raw = (profile?.cpf_cnpj || "").replace(/\D/g, "");
    if (!raw) return "CPF não informado";
    const last3 = raw.slice(-3);
    return `CPF •••.${last3}`;
  })();
  const saldoDisponivel = financialSummary.available;
  const acceptedOpportunities = accepted;

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {!isApproved ? (
        <>
          <div className="flex items-center justify-between px-6 pt-[52px] pb-5">
            <div className="w-[22px]" />
            <div className="flex items-center" style={{ gap: 10 }}>
              <Zap size={24} fill="#276EF1" color="#276EF1" />
              <span className="font-bold text-white" style={{ fontSize: 22, letterSpacing: "-0.5px" }}>freelaki</span>
            </div>
            <button type="button" onClick={() => setNotifOpen(true)} className="relative outline-none"
              style={{ animation: bellShake ? "bellShake 300ms ease" : "none" }}>
              <Bell className="h-[22px] w-[22px]" style={{ color: unreadCount > 0 ? "#F59E0B" : "#FFFFFF", transition: "color 300ms ease" }} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                    style={{ background: "#F59E0B", color: "#000" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
          {approvalStatus === "pending" ? <UnderReviewState /> : <DocumentsPendingState />}
        </>
      ) : (
        <main className="pb-28">
          {/* 3a. Top bar */}
          <div className="flex justify-between items-center px-5 pt-10 pb-2">
            <div className="flex items-center gap-2 bg-zinc-900 rounded-full px-3 py-1.5">
              <div className="flex">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <div className="w-4 h-4 rounded-full bg-violet-400 -ml-1" />
              </div>
              <span className="text-xs text-zinc-400">{maskedCpf}</span>
            </div>

            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="relative outline-none"
              style={{ animation: bellShake ? "bellShake 300ms ease" : "none" }}
            >
              <Bell size={18} className="text-zinc-300" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-1.5 -right-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
                    style={{ background: "#F59E0B", color: "#000" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              type="button"
              onClick={() => navigate("/perfil")}
              className="flex items-center gap-2 bg-zinc-900 rounded-full px-3 py-1.5 outline-none"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-medium text-white">
                  {profileInitials}
                </div>
              )}
              <span className="text-xs text-zinc-300">{profileFirstName}</span>
            </button>
          </div>

          {/* 3b. Saldo disponível */}
          <div className="flex flex-col items-center py-5 px-5">
            <button
              type="button"
              onClick={toggleOnline}
              disabled={togglingOnline}
              className="flex items-center gap-1.5 bg-zinc-900 rounded-full px-3 py-1 mb-4 outline-none disabled:opacity-50"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: isOnline ? "#00C853" : "#E53935",
                  animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                }}
              />
              <span className="text-xs text-zinc-400">
                {togglingOnline ? "..." : isOnline ? "Online • Carteira BRL" : "Offline • Toque para ativar"}
              </span>
            </button>
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Saldo disponível</p>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-medium tracking-tight text-white">
                {balanceVisible
                  ? `R$ ${saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "R$ ••••••"}
              </span>
              <button
                type="button"
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="text-zinc-600 outline-none"
              >
                {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            {financialSummary.reserved > 0 && (
              <p className="mt-2 text-[11px] text-zinc-500">
                + R$ {financialSummary.reserved.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} reservado
              </p>
            )}
          </div>

          {/* 3c. Botões de ação */}
          <div className="flex gap-3 px-5 mb-5">
            {[
              { icon: <ArrowUp size={18} />, label: "Sacar", onClick: () => navigate("/ganhos") },
              { icon: <Map size={18} />, label: "Mapa", onClick: () => navigate("/mapa") },
              { icon: <MessageCircle size={18} />, label: "Mensagens", onClick: () => navigate("/mensagens") },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.onClick}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl py-4 flex flex-col items-center gap-1.5 active:scale-95 transition-transform outline-none"
              >
                <span className="text-zinc-300">{btn.icon}</span>
                <span className="text-[11px] text-zinc-400">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* 3d. Card "Meus Jobs" */}
          <div className="px-5 mb-5">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] text-zinc-600 uppercase tracking-widest">Meus Freelas</span>
              {acceptedOpportunities.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/contratos")}
                  className="text-[11px] text-zinc-500 outline-none"
                >
                  Ver todos →
                </button>
              )}
            </div>
            <div
              className="rounded-2xl p-4 border border-blue-900/40"
              style={{ background: "linear-gradient(145deg, #1a2744 0%, #0d1b38 60%, #0a1229 100%)" }}
            >
              {loadingOpps ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                </div>
              ) : acceptedOpportunities.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">Nenhum job ativo no momento.</p>
              ) : (
                acceptedOpportunities.map((job, i) => (
                  <div
                    key={job.id}
                    className={`flex items-center justify-between py-3 ${
                      i < acceptedOpportunities.length - 1 ? "border-b border-white/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-900/60 flex items-center justify-center flex-shrink-0">
                        <Zap size={13} className="text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-200 leading-none mb-0.5 truncate">{job.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {job.description ? `${job.description.slice(0, 30)}${job.description.length > 30 ? "..." : ""}` : "Sem descrição"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-medium text-white">
                        R$ {Number(job.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/oportunidade/${job.id}`)}
                        className="text-[10px] text-blue-400 outline-none"
                      >
                        Ver detalhes →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AVAILABLE — carrossel quando online */}
          {isOnline && available.length > 0 && (
            <div className="px-5 mb-5" ref={oppRef}>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[11px] text-zinc-600 uppercase tracking-widest">Disponíveis</span>
                <span className="text-[11px] text-zinc-500">{available.length}</span>
              </div>
              <div
                className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2"
                style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {available.map((opp) => (
                  <CarouselOppCard key={opp.id} opp={opp} onApply={() => setApplyModal(opp)} />
                ))}
              </div>
            </div>
          )}

          {/* EM ANÁLISE */}
          {applications.length > 0 && (
            <div className="px-5 mb-5">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[11px] text-zinc-600 uppercase tracking-widest">Em Análise</span>
                <span className="text-[11px] text-amber-500">{applications.length}</span>
              </div>
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="mb-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{app.opportunity.category_icon || "📦"}</span>
                    <span className="text-[11px] text-zinc-400">{app.opportunity.category_name || "Geral"}</span>
                    <span className="ml-auto text-[10px] text-amber-500">Aguardando ⏳</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-zinc-200">{app.opportunity.title}</p>
                </div>
              ))}
            </div>
          )}

          {/* 3e. Histórico */}
          <div className="px-5 pb-4">
            <p className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">Histórico</p>
            {recentEarnings.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum pagamento registrado ainda.</p>
            ) : (
              recentEarnings.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`flex items-center gap-3 py-3 ${
                    i < recentEarnings.length - 1 ? "border-b border-zinc-900" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={15} className="text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium leading-none mb-0.5 truncate">
                      {tx.description ?? "Pagamento recebido"}
                    </p>
                    <p className="text-[11px] text-zinc-600">Pago via Pix</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-green-400">
                      + R$ {Number(tx.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(tx.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* FLOATING NAV */}
      <FloatingNav />

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* APPLY MODAL */}
      <AnimatePresence>
        {applyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !applyingId && setApplyModal(null)}
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
                <Zap size={32} fill="#276EF1" color="#276EF1" />
              </div>
              <h2 className="mt-3 text-center text-xl font-bold text-foreground">
                {applyModal.is_private ? "Aceitar proposta?" : "Me candidatar?"}
              </h2>
              <div className="mt-4 rounded-xl bg-[#F7F7F7] p-3.5">
                <p className="text-[15px] font-semibold text-foreground">{applyModal.title}</p>
                {applyModal.budget != null && (
                  <p className="mt-1 text-[14px] font-bold" style={{ color: "#2E7D32" }}>
                    R$ {applyModal.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              {applyModal.is_private ? (
                <p className="mt-3 text-center text-[13px] leading-relaxed text-[#767676]">
                  Ao aceitar, você se compromete a realizar este serviço. Cancelamentos geram penalidades.
                </p>
              ) : (
                <p className="mt-3 text-center text-[13px] leading-relaxed text-[#767676]">
                  Ao se candidatar, o cliente poderá te selecionar para este freela.
                </p>
              )}
              <button
                onClick={handleApplyFromDashboard}
                disabled={applyingId}
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-2xl text-base font-bold text-white disabled:opacity-50"
                style={{ background: applyModal.is_private ? "#2E7D32" : "#276EF1" }}
              >
                {applyingId ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : applyModal.is_private ? (
                  "Confirmar e aceitar"
                ) : (
                  "Confirmar candidatura"
                )}
              </button>
              <button
                onClick={() => setApplyModal(null)}
                disabled={applyingId}
                className="mt-2.5 flex h-[48px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-foreground"
              >
                Voltar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        @keyframes offlinePulseRing {
          0% { transform: scale(0.8); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes offlineBoltBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        .offline-ring { animation: offlinePulseRing 2s ease-out infinite; }
        .offline-ring-2 { animation-delay: 0.4s; }
        .offline-ring-3 { animation-delay: 0.8s; }
        .offline-bolt { animation: offlineBoltBreath 2s ease-in-out infinite; }
        @keyframes boltFlash {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        .bolt-flash { animation: boltFlash 300ms ease-out !important; }
        @media (prefers-reduced-motion: reduce) {
          .offline-ring, .offline-bolt, .bolt-flash { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
