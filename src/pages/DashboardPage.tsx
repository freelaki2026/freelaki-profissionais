import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Bell, ArrowRight, MapPin } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardDrawer from "@/components/dashboard/DashboardDrawer";
import BottomNav from "@/components/dashboard/BottomNav";
import OnlineCard from "@/components/dashboard/OnlineCard";
import OpportunityCard from "@/components/dashboard/OpportunityCard";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  approval_status: string | null;
  is_online: boolean | null;
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
      {/* Mock Preview badge */}
      {isMock && (
        <span className="absolute top-3 right-3 rounded-full bg-[#F7F7F7] px-2 py-[3px] text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
          Preview
        </span>
      )}

      {/* Category Badge */}
      <span
        className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}
      >
        <span className="text-[16px] leading-none">{opp.category_icon || "📦"}</span>
        <span className="truncate">{opp.category_name || "Geral"}</span>
      </span>

      {/* Title */}
      <p
        className="mt-2.5 text-[15px] font-bold text-foreground leading-[1.3]"
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {opp.title}
      </p>

      {/* Footer */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        {shortAddr && (
          <span className="flex items-center gap-0.5 text-[11px] text-[hsl(var(--muted-foreground))] max-w-[100px] truncate">
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

const DashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const oppRef = useRef<HTMLDivElement>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
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
      .select("full_name, avatar_url, approval_status, is_online")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setIsOnline(data.is_online ?? false);
        }
      });
  }, [user]);

  // Load opportunities
  const loadOpportunities = useCallback(async () => {
    if (!user) return;
    setLoadingOpps(true);

    // Available: open opportunities matching user's categories
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
          id: o.id,
          title: o.title,
          description: o.description,
          budget: o.budget,
          status: o.status,
          scheduled_at: o.scheduled_at,
          location_address: o.location_address,
          category_name: o.categories?.name,
          category_icon: o.categories?.icon,
        }))
      );
    }

    // Accepted
    const { data: acc } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, category_id, categories(name, icon)")
      .eq("accepted_by", user.id)
      .in("status", ["accepted", "in_progress"])
      .order("created_at", { ascending: false });

    if (acc) {
      setAccepted(
        acc.map((o: any) => ({
          id: o.id,
          title: o.title,
          description: o.description,
          budget: o.budget,
          status: o.status,
          category_name: o.categories?.name,
          category_icon: o.categories?.icon,
        }))
      );
    }

    setLoadingOpps(false);
  }, [user]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  // Realtime subscription when online
  useEffect(() => {
    if (!isOnline || !user) return;

    const channel = supabase
      .channel("opportunities-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        () => loadOpportunities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, user, loadOpportunities]);

  const toggleOnline = async () => {
    if (!user) return;
    setTogglingOnline(true);
    const newVal = !isOnline;
    const { error } = await supabase
      .from("profiles")
      .update({ is_online: newVal })
      .eq("id", user.id);

    if (!error) {
      setIsOnline(newVal);
      if (newVal) loadOpportunities();
    } else {
      toast({ title: "Erro ao alterar status.", variant: "destructive" });
    }
    setTogglingOnline(false);
  };

  const scrollToOpp = () => {
    oppRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 pt-[52px] pb-5">
        <div className="w-[22px]" />
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
          <span className="text-base font-bold text-white">freelaki</span>
        </div>
        <button>
          <Bell className="h-[22px] w-[22px] text-white" />
        </button>
      </div>

      {/* ONLINE/OFFLINE CARD */}
      <OnlineCard isOnline={isOnline} loading={togglingOnline} onToggle={toggleOnline} />

      {/* BODY */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="mt-5 flex-1 rounded-t-3xl bg-[#F7F7F7] px-4 pb-24 pt-5"
      >
        {/* AVAILABLE — Carousel */}
        <div ref={oppRef}>
          <div className="flex items-center gap-2 px-1">
            <span className="text-base font-semibold text-foreground">Disponíveis</span>
            {available.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[hsl(var(--primary))] px-2.5 text-xs font-medium text-white">
                {available.length}
              </span>
            )}
          </div>

          <div className="relative mt-3 -mx-4">
            {loadingOpps ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
              </div>
            ) : available.length > 0 ? (
              <div
                className={`flex gap-3.5 overflow-x-auto px-6 pb-4 pt-2 ${!isOnline ? "opacity-40 pointer-events-none" : ""}`}
                style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", cursor: "grab" }}
              >
                <style>{`div:active { cursor: grabbing; } .carousel-scroll::-webkit-scrollbar { display: none; }`}</style>
                {available.map((opp) => (
                  <CarouselOppCard key={opp.id} opp={opp} />
                ))}
                {/* Ver Mais card */}
                <button
                  onClick={scrollToOpp}
                  className="flex h-[160px] w-[80px] shrink-0 flex-col items-center justify-center rounded-[24px] border border-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.06] mb-2"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <ArrowRight className="h-6 w-6 text-[hsl(var(--primary))]" />
                  <span className="mt-1 text-[11px] font-medium text-[hsl(var(--primary))]">Ver todas</span>
                </button>
              </div>
            ) : isOnline ? (
              <div className="flex gap-3.5 overflow-x-auto px-6 pb-4 pt-2 pointer-events-none"
                style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
              >
                <CarouselOppCard
                  isMock
                  opp={{
                    id: "mock-1",
                    title: "Cobertura de evento",
                    description: null,
                    budget: null,
                    status: null,
                    category_name: "Fotógrafo",
                    category_icon: "📷",
                    location_address: "Alphaville, SP",
                    scheduled_at: (() => { const d = new Date(); d.setHours(15, 0, 0, 0); return d.toISOString(); })(),
                  }}
                />
                <CarouselOppCard
                  isMock
                  opp={{
                    id: "mock-2",
                    title: "Vídeo institucional",
                    description: null,
                    budget: null,
                    status: null,
                    category_name: "Filmmaker",
                    category_icon: "🎬",
                    location_address: "Pinheiros, SP",
                    scheduled_at: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d.toISOString(); })(),
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* ACCEPTED */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">Aceitas</span>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-2.5 text-xs font-medium text-white" style={{ background: "#2E7D32" }}>
              {accepted.length}
            </span>
          </div>

          <div className="mt-3">
            {accepted.length > 0 ? (
              accepted.map((opp) => (
                <OpportunityCard key={opp.id} opp={opp} variant="accepted" />
              ))
            ) : (
              <p className="py-5 text-center text-[13px] text-[hsl(var(--muted-foreground))]">
                Nenhuma oportunidade aceita ainda.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* DRAWER */}
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} profile={profile} />

      {/* BOTTOM NAV */}
      <BottomNav onScrollToOpportunities={scrollToOpp} onOpenDrawer={() => setDrawerOpen(true)} />
    </div>
  );
};

export default DashboardPage;
