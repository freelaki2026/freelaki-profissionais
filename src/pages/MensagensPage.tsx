import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Conversation {
  id: string;
  client_id: string | null;
  opportunity_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_pro: number | null;
  client_name: string;
  client_avatar: string | null;
  job_title: string;
  category_icon: string;
}

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

const MensagensPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_pro || 0), 0);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, client_id, opportunity_id, last_message, last_message_at, unread_pro")
      .eq("professional_id", user.id)
      .order("last_message_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const enriched: Conversation[] = [];
    for (const cv of data) {
      let clientName = "Cliente";
      let clientAvatar: string | null = null;
      let jobTitle = "";
      let categoryIcon = "📦";

      if (cv.client_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", cv.client_id)
          .single();
        if (p) { clientName = p.full_name || "Cliente"; clientAvatar = p.avatar_url; }
      }
      if (cv.opportunity_id) {
        const { data: o } = await supabase
          .from("opportunities")
          .select("title, category_id, categories(icon)")
          .eq("id", cv.opportunity_id)
          .single();
        if (o) {
          jobTitle = o.title;
          categoryIcon = (o as any).categories?.icon || "📦";
        }
      }

      enriched.push({
        ...cv,
        client_name: clientName,
        client_avatar: clientAvatar,
        job_title: jobTitle,
        category_icon: categoryIcon,
      });
    }

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conv-list-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `professional_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="relative flex items-center justify-between px-6" style={{ paddingTop: 52, paddingBottom: 24 }}>
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={24} color="#FFF" />
        </button>
        <span className="absolute inset-x-0 text-center text-[17px] font-semibold text-white pointer-events-none">
          Mensagens
        </span>
        {totalUnread > 0 ? (
          <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ background: "#F59E0B", color: "#000" }}>
            {totalUnread}
          </span>
        ) : <div className="w-6" />}
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto rounded-t-3xl bg-[#F7F7F7] p-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center pt-16">
            <MessageSquare size={48} color="#E5E5E5" />
            <p className="mt-4 text-[16px] font-semibold text-[#767676]">Nenhuma conversa ainda</p>
            <p className="mt-1 text-[13px] text-[#767676]">As mensagens dos seus clientes aparecerão aqui.</p>
          </div>
        ) : (
          conversations.map((cv) => (
            <button
              key={cv.id}
              onClick={() => navigate(`/mensagens/${cv.id}`)}
              className="mb-2.5 flex w-full items-center gap-3 rounded-[16px] bg-white p-4 text-left"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                {cv.client_avatar ? (
                  <img src={cv.client_avatar} className="h-[52px] w-[52px] rounded-full object-cover" alt="" />
                ) : (
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#276EF1] text-[16px] font-bold text-white">
                    {initials(cv.client_name)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px]">
                  {cv.category_icon}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold text-black truncate">{cv.client_name}</span>
                  <span className="shrink-0 text-[11px] text-[#767676]">{timeAgo(cv.last_message_at)}</span>
                </div>
                {cv.job_title && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] text-[#767676]"
                    style={{ background: "#F7F7F7" }}>
                    <span className="text-[11px]">{cv.category_icon}</span> {cv.job_title}
                  </span>
                )}
                <p className="mt-0.5 truncate text-[13px]"
                  style={{ color: (cv.unread_pro || 0) > 0 ? "#000" : "#767676", fontWeight: (cv.unread_pro || 0) > 0 ? 500 : 400 }}>
                  {cv.last_message || "..."}
                </p>
              </div>

              {/* Indicator */}
              {(cv.unread_pro || 0) > 0 ? (
                <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                  style={{ background: "#F59E0B", color: "#000" }}>
                  {cv.unread_pro}
                </span>
              ) : (
                <ChevronRight size={18} color="#E5E5E5" className="shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default MensagensPage;
