import { useState, useEffect, useRef, useCallback, memo } from "react";

import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Bell, MapPin, Clock,
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
import OnlineToggle from "@/components/ui/OnlineToggle";
import { OnboardingChecklistBanner } from "@/components/dashboard/OnboardingChecklistBanner";
import { TipsBanner } from "@/components/dashboard/TipsBanner";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";
import { haptics } from "@/lib/haptics";

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
    className="mx-5 mt-4 rounded-[20px] p-5 flex items-center gap-4"
    style={{
      border: isOnline ? "1.5px solid #00C853" : "1.5px solid #333333",
      background: isOnline ? "rgba(0,200,83,0.06)" : "#111111",
      transition: "all 400ms ease",
    }}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background: isOnline ? "#00C853" : "#E53935",
            animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
          }}
        />
        <span
          className="text-[15px] font-semibold"
          style={{ color: isOnline ? "#00C853" : "#FFFFFF" }}
        >
          {isOnline ? "Você está online" : "Você está offline"}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-[#767676]">
        {isOnline ? "Aguardando oportunidades..." : "Toque pra receber oportunidades"}
      </p>
    </div>

    <OnlineToggle isOnline={isOnline} loading={loading} onToggle={onToggle} />
  </motion.div>
);

/* ───── Main Dashboard ───── */
const DashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const oppRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, insertNotification } = useNotifications();
  const { canAcceptWork, pending: pendingChecklist, isApproved: checklistApproved } = useOnboardingChecklist();

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

  // Recarrega ao voltar para a aba/dashboard (ex: após avaliar cliente)
  useEffect(() => {
    const onFocus = () => loadOpportunities();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadOpportunities]);

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
    const newVal = !isOnline;
    // Bloqueia ficar online se checklist não estiver completo
    if (newVal && !canAcceptWork) {
      const firstPending = pendingChecklist[0];
      toast({
        title: "Complete seu cadastro primeiro",
        description: firstPending
          ? `Faltando: ${firstPending.label}`
          : "Verifique os itens pendentes no banner do dashboard.",
        variant: "destructive",
      });
      haptics.warning();
      if (firstPending) navigate(firstPending.route);
      return;
    }
    setTogglingOnline(true);
    const { error } = await supabase.from("profiles").update({ is_online: newVal }).eq("id", user.id);
    if (error) {
      toast({ title: "Erro ao alterar status.", variant: "destructive" });
      setTogglingOnline(false);
      return;
    }
    setIsOnline(newVal);

    // Sound + haptic feedback (autoplay-safe: dispara dentro do click handler)
    playSound(newVal ? SOUND_ONLINE : SOUND_OFFLINE);
    if (newVal) haptics.success();
    else haptics.warning();

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
  const saldoDisponivel = financialSummary.available;
  const acceptedOpportunities = accepted;

  // 🔒 Lock presencial: profissional só pode ter 1 contrato presencial ativo por vez.
  // Home office (is_remote=true) NÃO bloqueia — pode acumular vários em paralelo.
  const activePresencial = accepted.find((o) => !o.is_remote);
  const hasActivePresencial = !!activePresencial;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F7F7] text-foreground">
      <main className="pb-28">
          {/* 1. Top bar — header escuro arredondado para contrastar com fundo claro */}
          <div
            className="px-5 pt-12 pb-6 rounded-b-[28px]"
            style={{ background: "linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => navigate("/perfil")}
                className="flex items-center gap-2.5 outline-none"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#276EF1] flex items-center justify-center text-xs font-bold text-white">
                    {profileInitials}
                  </div>
                )}
                <div className="text-left leading-tight">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Olá</p>
                  <p className="text-[13px] font-semibold text-white">{profileFirstName}</p>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-tour="online-toggle"
                  onClick={toggleOnline}
                  disabled={togglingOnline || !canAcceptWork}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-full px-3 py-1.5 outline-none disabled:opacity-50 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: isOnline ? "#00C853" : "#E53935",
                      animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                    }}
                  />
                  <span className="text-[11px] font-medium text-zinc-200">
                    {togglingOnline ? "..." : isOnline ? "Online" : "Offline"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifOpen(true)}
                  className="relative outline-none w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  style={{ animation: bellShake ? "bellShake 300ms ease" : "none" }}
                >
                  <Bell size={16} className="text-zinc-200" />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute -top-0.5 -right-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
                        style={{ background: "#F59E0B", color: "#000" }}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Saldo destacado dentro do header escuro */}
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Saldo disponível</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[36px] font-bold tracking-tight text-white leading-none">
                  {balanceVisible
                    ? `R$ ${saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    : "R$ ••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="text-zinc-500 outline-none"
                >
                  {balanceVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
              {financialSummary.reserved > 0 && (
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  + R$ {financialSummary.reserved.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} reservado
                </p>
              )}
              {!canAcceptWork && (
                <p className="mt-2 text-[10px] text-amber-400/90">
                  Complete seu cadastro para ficar online
                </p>
              )}
            </div>
          </div>

          {/* 2. Onboarding checklist banner — só aparece se faltam itens */}
          <div className="-mt-2">
            <OnboardingChecklistBanner />
          </div>

          {/* 3. Tips banner roxo (carrossel automático leve) */}
          <div className="mt-4">
            <TipsBanner />
          </div>

          {/* 4. Botões de ação rápida em cards brancos */}
          <div className="grid grid-cols-3 gap-3 px-5 mb-5">
            {[
              { icon: <ArrowUp size={18} className="text-[#276EF1]" />, label: "Sacar", onClick: () => navigate("/ganhos") },
              { icon: <Map size={18} className="text-[#276EF1]" />, label: "Mapa", onClick: () => navigate("/mapa") },
              { icon: <MessageCircle size={18} className="text-[#276EF1]" />, label: "Mensagens", onClick: () => navigate("/mensagens") },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.onClick}
                className="bg-white border border-[#E8E8E8] rounded-2xl py-4 flex flex-col items-center gap-1.5 active:scale-95 transition-transform outline-none shadow-sm"
              >
                {btn.icon}
                <span className="text-[11px] font-medium text-foreground">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* 5. 🔒 Modo Exclusivo: contrato presencial ativo */}
          {hasActivePresencial ? (
            <div className="px-5 mb-5">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[11px] text-amber-600 uppercase tracking-widest font-semibold">
                  ⚡ Freela em andamento
                </span>
                <span className="text-[10px] text-[#767676]">Presencial</span>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="rounded-3xl p-5 border border-amber-200 bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Zap size={16} className="text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-amber-600 uppercase tracking-wider mb-0.5">
                      {activePresencial?.category_icon} {activePresencial?.category_name || "Freela"}
                    </p>
                    <p className="text-[15px] font-semibold text-foreground leading-tight truncate">
                      {activePresencial?.title}
                    </p>
                  </div>
                </div>

                {activePresencial?.location_address && (
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin size={13} className="text-[#767676] mt-0.5 flex-shrink-0" />
                    <p className="text-[12px] text-[#767676] leading-snug">
                      {extractShortAddress(activePresencial.location_address)}
                    </p>
                  </div>
                )}
                {activePresencial?.scheduled_at && (
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={13} className="text-[#767676] flex-shrink-0" />
                    <p className="text-[12px] text-[#767676]">
                      {formatSchedule(activePresencial.scheduled_at)}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#E8E8E8] mb-3">
                  <span className="text-[11px] text-[#767676] uppercase tracking-wider">Valor</span>
                  <span className="text-[18px] font-bold text-foreground">
                    R$ {Number(activePresencial?.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/oportunidade/${activePresencial?.id}`)}
                  className="w-full h-[48px] rounded-2xl bg-amber-500 text-[14px] font-bold text-black active:scale-[0.98] transition-transform outline-none"
                >
                  Acompanhar chamado →
                </button>
              </motion.div>

              <p className="mt-3 text-center text-[11px] text-[#767676] leading-relaxed px-4">
                Você está em um freela presencial. Conclua para liberar novas oportunidades.
              </p>
            </div>
          ) : (
            <>
              {/* 6. Card "Meus Freelas" */}
              <div className="px-5 mb-5">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[11px] text-[#767676] uppercase tracking-widest font-semibold">Meus Freelas</span>
                  {acceptedOpportunities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate("/contratos")}
                      className="text-[11px] text-[#276EF1] font-medium outline-none"
                    >
                      Ver todos →
                    </button>
                  )}
                </div>
                <div className="rounded-2xl bg-white border border-[#E8E8E8] p-4 shadow-sm">
                  {loadingOpps ? (
                    <div className="flex justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
                    </div>
                  ) : acceptedOpportunities.length === 0 ? (
                    <p className="text-xs text-[#767676] text-center py-4">Nenhum job ativo no momento.</p>
                  ) : (
                    acceptedOpportunities.map((job, i) => (
                      <div
                        key={job.id}
                        className={`flex items-center justify-between py-3 ${
                          i < acceptedOpportunities.length - 1 ? "border-b border-[#E8E8E8]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Zap size={13} className="text-[#276EF1]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground leading-none mb-0.5 truncate">{job.title}</p>
                            <p className="text-[10px] text-[#767676] truncate">
                              {job.is_remote ? "🏠 Home office" : job.description ? `${job.description.slice(0, 30)}${job.description.length > 30 ? "..." : ""}` : "Sem descrição"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-sm font-semibold text-foreground">
                            R$ {Number(job.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate(`/oportunidade/${job.id}`)}
                            className="text-[10px] text-[#276EF1] font-medium outline-none"
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
                    <span className="text-[11px] text-[#767676] uppercase tracking-widest font-semibold">Disponíveis</span>
                    <span className="text-[11px] text-[#276EF1] font-medium">{available.length}</span>
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
                    <span className="text-[11px] text-[#767676] uppercase tracking-widest font-semibold">Em Análise</span>
                    <span className="text-[11px] text-amber-600 font-medium">{applications.length}</span>
                  </div>
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="mb-2 rounded-2xl border border-[#E8E8E8] bg-white p-3.5 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{app.opportunity.category_icon || "📦"}</span>
                        <span className="text-[11px] text-[#767676]">{app.opportunity.category_name || "Geral"}</span>
                        <span className="ml-auto text-[10px] text-amber-600 font-medium">Aguardando ⏳</span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-foreground">{app.opportunity.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 7. Histórico */}
          <div className="px-5 pb-4">
            <p className="text-[11px] text-[#767676] uppercase tracking-widest mb-3 font-semibold">Histórico</p>
            {recentEarnings.length === 0 ? (
              <div className="rounded-2xl bg-white border border-[#E8E8E8] p-4 shadow-sm">
                <p className="text-xs text-[#767676] text-center">Nenhum pagamento registrado ainda.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-[#E8E8E8] px-4 shadow-sm">
                {recentEarnings.map((tx, i) => (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 py-3 ${
                      i < recentEarnings.length - 1 ? "border-b border-[#E8E8E8]" : ""
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={15} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium leading-none mb-0.5 truncate">
                        {tx.description ?? "Pagamento recebido"}
                      </p>
                      <p className="text-[11px] text-[#767676]">Pago via Pix</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-green-600">
                        + R$ {Number(tx.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-[#767676]">
                        {new Date(tx.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

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
