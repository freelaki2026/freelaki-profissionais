import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MapPin, Calendar, AlertCircle, XCircle } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BottomNav from "@/components/dashboard/BottomNav";


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
  is_private?: boolean;
}

interface Application {
  id: string;
  opportunity_id: string;
  status: string;
  opportunity?: Opp;
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
  awaiting_signatures: { text: "✍️ Assinar contrato", bg: "#E3F2FD", color: "#1565C0" },
  accepted: { text: "✓ Aguardando início", bg: "#FFF3E0", color: "#B45309" },
  in_progress: { text: "Em andamento 🔥", bg: "#E8F5E9", color: "#2E7D32" },
};

const tabs = ["Disponíveis", "Em Análise", "Aceitas"] as const;
type Tab = typeof tabs[number];

const OportunidadesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Disponíveis");
  const [available, setAvailable] = useState<Opp[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [accepted, setAccepted] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [applyModal, setApplyModal] = useState<Opp | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [withdrawApp, setWithdrawApp] = useState<Application | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, approval_status, is_online, is_approved")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: cats } = await supabase
      .from("professional_categories")
      .select("category_id")
      .eq("profile_id", user.id);
    const catIds = cats?.map((r) => r.category_id!).filter(Boolean) || [];

    // Available (public, open/pending_selection, in my categories)
    // Load my existing applications to filter out
    const { data: myApps } = await supabase
      .from("opportunity_applications")
      .select("opportunity_id")
      .eq("professional_id", user.id);
    const appliedSet = new Set(myApps?.map(a => a.opportunity_id) || []);
    setAppliedIds(appliedSet);

    // Public opportunities in my categories
    let publicAvail: any[] = [];
    if (catIds.length > 0) {
      const { data } = await supabase
        .from("opportunities")
        .select("id, title, description, budget, status, scheduled_at, location_address, category_id, is_private, categories(name, icon)")
        .in("status", ["open", "pending_selection"])
        .eq("is_private", false)
        .in("category_id", catIds)
        .order("created_at", { ascending: false });
      publicAvail = data || [];
    }

    // Private opportunities targeted directly at me
    const { data: privateAvail } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, scheduled_at, location_address, category_id, is_private, categories(name, icon)")
      .in("status", ["open", "pending_selection"])
      .eq("is_private", true)
      .eq("target_professional_id", user.id)
      .order("created_at", { ascending: false });

    const allAvail = [...publicAvail, ...(privateAvail || [])];
    setAvailable(
      allAvail
        .filter((o: any) => !appliedSet.has(o.id))
        .map((o: any) => ({
          id: o.id, title: o.title, description: o.description,
          budget: o.budget, status: o.status, scheduled_at: o.scheduled_at,
          location_address: o.location_address, is_private: o.is_private,
          category_name: o.categories?.name, category_icon: o.categories?.icon,
        }))
    );

    // Applications (Em Análise)
    const { data: apps } = await supabase
      .from("opportunity_applications")
      .select("id, opportunity_id, status, opportunities(id, title, description, budget, status, scheduled_at, location_address, categories(name, icon))")
      .eq("professional_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (apps) {
      setApplications(
        apps
          .filter((a: any) => a.opportunities && ["open", "pending_selection"].includes(a.opportunities.status))
          .map((a: any) => ({
            id: a.id,
            opportunity_id: a.opportunity_id,
            status: a.status,
            opportunity: {
              id: a.opportunities.id,
              title: a.opportunities.title,
              description: a.opportunities.description,
              budget: a.opportunities.budget,
              status: a.opportunities.status,
              scheduled_at: a.opportunities.scheduled_at,
              location_address: a.opportunities.location_address,
              category_name: a.opportunities.categories?.name,
              category_icon: a.opportunities.categories?.icon,
            },
          }))
      );
    }

    // Accepted
    const { data: acc } = await supabase
      .from("opportunities")
      .select("id, title, description, budget, status, scheduled_at, location_address, category_id, categories(name, icon)")
      .eq("accepted_by", user.id)
      .in("status", ["awaiting_signatures", "accepted", "in_progress"])
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

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime for opportunities
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("opps-page-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "opportunities" }, () => loadData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "opportunities" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  // Realtime for applications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("apps-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunity_applications" }, (payload) => {
        const updated = payload.new as any;
        if (updated?.professional_id !== user.id) return;

        if (updated.status === "selected") {
          toast.success("🎉 Você foi selecionado! Assine o contrato.");
          navigator.vibrate?.([200, 100, 200]);
          loadData();
        } else if (updated.status === "rejected") {
          toast("Outra pessoa foi escolhida. Continue online! 💪");
          setApplications(prev => prev.filter(a => a.id !== updated.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  // Listen for custom events
  useEffect(() => {
    const handler = () => loadData();
    const unavailableHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        setAvailable((prev) => prev.filter((o) => o.id !== detail.id));
      }
    };
    window.addEventListener("opportunity_declined", handler);
    window.addEventListener("opportunity_accepted", handler);
    window.addEventListener("opportunity_unavailable", unavailableHandler);
    return () => {
      window.removeEventListener("opportunity_declined", handler);
      window.removeEventListener("opportunity_accepted", handler);
      window.removeEventListener("opportunity_unavailable", unavailableHandler);
    };
  }, [loadData]);

  const handleApply = async () => {
    if (!user || !applyModal) return;
    setApplying(true);

    const { data, error } = await supabase.rpc("apply_to_opportunity", {
      p_opportunity_id: applyModal.id,
    });

    const result = typeof data === "string" ? JSON.parse(data) : data;

    if (error) {
      toast.error("Erro ao enviar candidatura. Tente novamente.");
      setApplying(false);
      setApplyModal(null);
      return;
    }

    if (result?.error) {
      switch (result.error) {
        case "not_available":
          toast.error("Esta oportunidade não está mais disponível.");
          setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
          window.dispatchEvent(new CustomEvent("opportunity_unavailable", { detail: { id: applyModal.id } }));
          break;
        case "already_applied":
          toast("Você já se candidatou a esta oportunidade.");
          setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
          break;
        case "max_reached":
          toast("Esta oportunidade atingiu o máximo de candidatos por enquanto. Fique atento a novas oportunidades!");
          setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
          break;
        case "private":
          toast.error("Esta oportunidade não está disponível.");
          break;
        default:
          toast.error("Erro ao se candidatar. Tente novamente.");
      }
      setApplying(false);
      setApplyModal(null);
      return;
    }

    if (result?.success) {
      toast.success("Candidatura enviada! ⚡ Aguarde o cliente te selecionar.");
      setAvailable(prev => prev.filter(o => o.id !== applyModal.id));
      setAppliedIds(prev => new Set([...prev, applyModal.id]));
      loadData();
      setApplying(false);
      setApplyModal(null);
      setActiveTab("Em Análise");
    }
  };

  const shortAddr = (addr: string | null | undefined) => {
    if (!addr) return "";
    const parts = addr.split(",").map((s) => s.trim());
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  };

  const OppCard = ({ opp, variant, onApply }: { opp: Opp; variant: "available" | "analysis" | "accepted"; onApply?: () => void }) => (
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
        {variant === "analysis" && (
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style={{ background: "#FFF3E0", color: "#B45309" }}>
            Aguardando seleção ⏳
          </span>
        )}
        {variant === "accepted" && opp.status && statusBadges[opp.status] && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${opp.status === "awaiting_signatures" ? "cursor-pointer" : ""}`}
            style={{ background: statusBadges[opp.status].bg, color: statusBadges[opp.status].color }}
            onClick={() => { if (opp.status === "awaiting_signatures") navigate("/contratos"); }}
          >
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

      {variant === "available" && (
        <button
          onClick={onApply}
          className="mt-3 flex h-[40px] w-full items-center justify-center rounded-[12px] text-[13px] font-semibold text-white"
          style={{ background: "#276EF1" }}
        >
          Me candidatar →
        </button>
      )}
      {variant === "analysis" && (
        <div className="mt-3 rounded-[12px] bg-[#F7F7F7] py-2.5 text-center text-[12px] text-[#767676]">
          O cliente está analisando os candidatos.
        </div>
      )}
      {variant === "accepted" && (
        <button
          onClick={() => navigate(`/oportunidade/${opp.id}`)}
          className="mt-3 flex h-[40px] w-full items-center justify-center rounded-[12px] text-[13px] font-semibold"
          style={{ background: "#F7F7F7", color: "#000000" }}
        >
          Ver detalhes →
        </button>
      )}
    </div>
  );

  const counts = {
    "Disponíveis": available.length,
    "Em Análise": applications.length,
    "Aceitas": accepted.length,
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="flex items-center justify-center px-6 pt-[52px] pb-4">
        <div className="flex items-center" style={{ gap: 10 }}>
          <Zap size={24} fill="#276EF1" color="#276EF1" />
          <span className="font-bold text-white" style={{ fontSize: 22, letterSpacing: "-0.5px" }}>freelaki</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 px-4 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold transition-all"
            style={{
              background: activeTab === tab ? "#276EF1" : "rgba(255,255,255,0.06)",
              color: activeTab === tab ? "#FFFFFF" : "#767676",
            }}
          >
            {tab}
            {counts[tab] > 0 && (
              <span
                className="absolute -top-1.5 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{
                  background: tab === "Em Análise" ? "#F59E0B" : tab === "Aceitas" ? "#2E7D32" : "#276EF1",
                }}
              >
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div className="flex-1 rounded-t-3xl bg-[#F7F7F7] px-4 pb-24 pt-5 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "Disponíveis" && (
                <>
                  {available.length > 0 ? (
                    available.map((opp) => (
                      <OppCard key={opp.id} opp={opp} variant="available" onApply={() => setApplyModal(opp)} />
                    ))
                  ) : (
                    <p className="py-10 text-center text-[13px] text-[#767676]">
                      Nenhuma oportunidade disponível no momento.
                    </p>
                  )}
                </>
              )}

              {activeTab === "Em Análise" && (
                <>
                  {applications.length > 0 ? (
                    applications.map((app) =>
                      app.opportunity ? (
                        <OppCard key={app.id} opp={app.opportunity} variant="analysis" />
                      ) : null
                    )
                  ) : (
                    <p className="py-10 text-center text-[13px] text-[#767676]">
                      Nenhuma candidatura em análise.
                    </p>
                  )}
                </>
              )}

              {activeTab === "Aceitas" && (
                <>
                  {accepted.length > 0 ? (
                    accepted.map((opp) => (
                      <OppCard key={opp.id} opp={opp} variant="accepted" />
                    ))
                  ) : (
                    <p className="py-10 text-center text-[13px] text-[#767676]">
                      Nenhuma oportunidade aceita ainda.
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* APPLY MODAL */}
      <AnimatePresence>
        {applyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => !applying && setApplyModal(null)}
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
              <h2 className="mt-3 text-center text-xl font-bold text-black">Me candidatar?</h2>
              <div className="mt-4 rounded-xl bg-[#F7F7F7] p-3.5">
                <p className="text-[15px] font-semibold text-black">{applyModal.title}</p>
                {applyModal.budget != null && (
                  <p className="mt-1 text-[14px] font-bold" style={{ color: "#2E7D32" }}>
                    R$ {applyModal.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <p className="mt-3 text-center text-[13px] leading-relaxed text-[#767676]">
                Ao se candidatar, o cliente poderá te selecionar para este freela.
              </p>
              <button
                onClick={handleApply}
                disabled={applying}
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#276EF1] text-base font-bold text-white disabled:opacity-50"
              >
                {applying ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Confirmar candidatura"
                )}
              </button>
              <button
                onClick={() => setApplyModal(null)}
                disabled={applying}
                className="mt-2.5 flex h-[48px] w-full items-center justify-center rounded-2xl bg-[#F7F7F7] text-base font-semibold text-black"
              >
                Voltar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default OportunidadesPage;
