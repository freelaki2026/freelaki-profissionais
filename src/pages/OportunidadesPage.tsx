import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MapPin, Calendar } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/dashboard/BottomNav";
import DashboardDrawer from "@/components/dashboard/DashboardDrawer";

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

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  approval_status: string | null;
  is_online: boolean | null;
  is_approved: boolean | null;
}

const formatSchedule = (s: string | null | undefined): string => {
  if (!s) return "";
  const d = new Date(s);
  if (isToday(d)) return `Hoje às ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Amanhã às ${format(d, "HH:mm")}`;
  return format(d, "d MMM yyyy", { locale: ptBR });
};

const statusBadges: Record<string, { text: string; bg: string; color: string }> = {
  accepted: { text: "Confirmado ✓", bg: "#E8F5E9", color: "#2E7D32" },
  in_progress: { text: "Em andamento", bg: "#E3F2FD", color: "#1565C0" },
};

const OportunidadesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [available, setAvailable] = useState<Opp[]>([]);
  const [accepted, setAccepted] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, approval_status, is_online, is_approved")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  const loadOpps = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: cats } = await supabase
      .from("professional_categories")
      .select("category_id")
      .eq("profile_id", user.id);

    const catIds = cats?.map((r) => r.category_id!).filter(Boolean) || [];

    if (catIds.length > 0) {
      const { data: avail } = await supabase
        .from("opportunities")
        .select("id, title, description, budget, status, scheduled_at, location_address, category_id, categories(name, icon)")
        .eq("status", "open")
        .in("category_id", catIds)
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
    } else {
      setAvailable([]);
    }

    const { data: acc } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, scheduled_at, location_address, category_id, categories(name, icon)")
      .eq("accepted_by", user.id)
      .in("status", ["accepted", "in_progress"])
      .order("created_at", { ascending: false });

    if (acc) {
      setAccepted(
        acc.map((o: any) => ({
          id: o.id, title: o.title, description: o.description,
          budget: o.budget, status: o.status, scheduled_at: o.scheduled_at,
          location_address: o.location_address,
          category_name: o.categories?.name, category_icon: o.categories?.icon,
        }))
      );
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { loadOpps(); }, [loadOpps]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("opps-page-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "opportunities" }, () => loadOpps())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "opportunities" }, (payload) => {
        const updated = payload.new as any;
        if (
          updated.status !== "open" ||
          (updated.is_private === false && updated.target_professional_id !== user.id)
        ) {
          setAvailable((prev) => prev.filter((op) => op.id !== updated.id));
          if (updated.accepted_by === user.id) {
            loadOpps();
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadOpps]);

  const toggleOnline = async () => {
    if (!user || !profile) return;
    setTogglingOnline(true);
    const newVal = !profile.is_online;
    const { error } = await supabase.from("profiles").update({ is_online: newVal }).eq("id", user.id);
    if (!error) {
      setProfile((p) => p ? { ...p, is_online: newVal } : p);
      if (newVal) loadOpps();
    } else {
      toast({ title: "Erro ao alterar status.", variant: "destructive" });
    }
    setTogglingOnline(false);
  };

  const approvalStatus = profile?.approval_status || "incomplete";
  const isApproved = approvalStatus === "approved";
  const isOnline = profile?.is_online ?? false;

  const shortAddr = (addr: string | null | undefined) => {
    if (!addr) return "";
    const parts = addr.split(",").map((s) => s.trim());
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  };

  const OppCard = ({ opp, variant }: { opp: Opp; variant: "available" | "accepted" }) => (
    <div className="mb-3 rounded-[20px] bg-white p-4" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
          style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}>
          <span className="text-[16px] leading-none">{opp.category_icon || "📦"}</span>
          {opp.category_name || "Geral"}
        </span>
        {variant === "available" && opp.budget != null && (
          <span className="text-[15px] font-bold" style={{ color: "#2E7D32" }}>
            R$ {opp.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        )}
        {variant === "accepted" && opp.status && statusBadges[opp.status] && (
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style={{ background: statusBadges[opp.status].bg, color: statusBadges[opp.status].color }}>
            {statusBadges[opp.status].text}
          </span>
        )}
      </div>

      <p className="mt-2.5 text-[16px] font-bold text-black">{opp.title}</p>
      {opp.description && (
        <p className="mt-1.5 text-[13px] leading-[1.5] text-[#767676]"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {opp.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {shortAddr(opp.location_address) && (
            <span className="flex items-center gap-1 text-[12px] text-[#767676]">
              <MapPin className="h-3 w-3" /> {shortAddr(opp.location_address)}
            </span>
          )}
          {opp.scheduled_at && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-[#276EF1]">
              <Calendar className="h-3 w-3" /> {formatSchedule(opp.scheduled_at)}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => navigate(`/oportunidade/${opp.id}`)}
        className="mt-3 flex h-[40px] w-full items-center justify-center rounded-[12px] text-[13px] font-semibold"
        style={variant === "available"
          ? { background: "#276EF1", color: "#FFFFFF" }
          : { background: "#F7F7F7", color: "#000000" }
        }
      >
        Ver detalhes →
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="flex items-center justify-center px-6 pt-[52px] pb-6">
        <div className="flex items-center" style={{ gap: 10 }}>
          <Zap size={24} fill="#276EF1" color="#276EF1" />
          <span className="font-bold text-white" style={{ fontSize: 22, letterSpacing: "-0.5px" }}>freelaki</span>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 rounded-t-3xl bg-[#F7F7F7] px-4 pb-24 pt-5 overflow-y-auto">
        {/* Not approved banner */}
        {!isApproved && (
          <div className="mb-4 rounded-[14px] p-3.5" style={{ background: "#FFF3E0" }}>
            <p className="text-[13px] text-[#B45309]">Complete seu cadastro para ver oportunidades.</p>
            <button
              onClick={() => navigate("/documentos")}
              className="mt-2 flex h-[36px] items-center justify-center rounded-[10px] bg-[#276EF1] px-4 text-[13px] font-semibold text-white"
            >
              Enviar documentos →
            </button>
          </div>
        )}

        {/* Offline banner */}
        {isApproved && !isOnline && (
          <div className="mb-4 flex items-center gap-3 rounded-[14px] p-4" style={{ background: "#111111" }}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#E53935]"
                  style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
                <span className="text-[13px] text-[#767676]">
                  Você está offline. Fique online para ver oportunidades em tempo real.
                </span>
              </div>
            </div>
            <button
              disabled={togglingOnline}
              onClick={toggleOnline}
              className="shrink-0 rounded-[10px] bg-[#276EF1] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {togglingOnline ? "..." : "Ficar Online →"}
            </button>
          </div>
        )}

        {/* AVAILABLE */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[2px] text-[#767676]">DISPONÍVEIS</span>
          {available.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#276EF1] px-2.5 text-[12px] font-medium text-white">
              {available.length}
            </span>
          )}
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
            </div>
          ) : available.length > 0 ? (
            <AnimatePresence>
              {available.map((opp) => (
                <motion.div key={opp.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <OppCard opp={opp} variant="available" />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <p className="py-6 text-center text-[13px] text-[#767676]">
              Nenhuma oportunidade disponível no momento.
            </p>
          )}
        </div>

        {/* DIVIDER */}
        <div className="relative my-6 flex items-center">
          <div className="flex-1 border-t border-[#E5E5E5]" />
          <div className="flex items-center gap-2 px-3">
            <span className="text-[10px] font-semibold tracking-[2px] text-[#767676]">ACEITAS</span>
            {accepted.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-2.5 text-[12px] font-medium text-white" style={{ background: "#2E7D32" }}>
                {accepted.length}
              </span>
            )}
          </div>
          <div className="flex-1 border-t border-[#E5E5E5]" />
        </div>

        {/* ACCEPTED */}
        <div>
          {accepted.length > 0 ? (
            <AnimatePresence>
              {accepted.map((opp) => (
                <motion.div key={opp.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <OppCard opp={opp} variant="accepted" />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <p className="py-5 text-center text-[13px] text-[#767676]">
              Nenhuma oportunidade aceita ainda.
            </p>
          )}
        </div>
      </div>

      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} profile={profile} />
      <BottomNav onOpenDrawer={() => setDrawerOpen(true)} />
    </div>
  );
};

export default OportunidadesPage;
