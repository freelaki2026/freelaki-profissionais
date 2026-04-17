import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, ChevronRight, Paperclip, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import FloatingNav from "@/components/FloatingNav";

/** Card agregado: 1 por cliente, somando todas as conversations daquele cliente. */
interface ClientCard {
  client_id: string;
  client_name: string;
  client_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_pro: number;
  job_title: string; // título da oportunidade mais recente
  category_icon: string;
  conv_count: number;
}

interface SupportMessage {
  id: string;
  profile_id: string | null;
  sender: string;
  message: string;
  file_url: string | null;
  created_at: string | null;
  is_read: boolean | null;
}

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

const formatTime = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const getDateLabel = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - msgDay.getTime()) / 86400000;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR");
};

/* ───── Clients Tab (agrupado POR CLIENTE) ───── */
const ClientsTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    // 1) Todas as conversas do profissional, mais recente primeiro
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, client_id, opportunity_id, last_message, last_message_at, unread_pro")
      .eq("professional_id", user.id)
      .order("last_message_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setCards([]);
      setLoading(false);
      return;
    }

    // 2) Coleta IDs únicos para batch fetch
    const clientIds = Array.from(new Set(convs.map((c) => c.client_id).filter(Boolean) as string[]));
    const oppIds = Array.from(new Set(convs.map((c) => c.opportunity_id).filter(Boolean) as string[]));

    const [profilesRes, oppsRes] = await Promise.all([
      clientIds.length
        ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", clientIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }),
      oppIds.length
        ? supabase.from("opportunities").select("id, title, categories(icon)").in("id", oppIds)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string; categories: { icon: string | null } | null }> }),
    ]);

    const profMap = new Map((profilesRes.data || []).map((p) => [p.id, p] as const));
    const oppMap = new Map(
      (oppsRes.data || []).map((o) => [o.id, { title: o.title, icon: (o as any).categories?.icon || "📦" }] as const)
    );

    // 3) Agrega por client_id (convs já vêm ordenadas desc por last_message_at)
    const byClient = new Map<string, ClientCard>();
    for (const cv of convs) {
      if (!cv.client_id) continue;
      const existing = byClient.get(cv.client_id);
      const opp = cv.opportunity_id ? oppMap.get(cv.opportunity_id) : null;

      if (!existing) {
        const p = profMap.get(cv.client_id);
        byClient.set(cv.client_id, {
          client_id: cv.client_id,
          client_name: p?.full_name || "Cliente",
          client_avatar: p?.avatar_url || null,
          last_message: cv.last_message,
          last_message_at: cv.last_message_at,
          unread_pro: cv.unread_pro || 0,
          job_title: opp?.title || "",
          category_icon: opp?.icon || "📦",
          conv_count: 1,
        });
      } else {
        existing.unread_pro += cv.unread_pro || 0;
        existing.conv_count += 1;
      }
    }

    setCards(Array.from(byClient.values()));
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

  const firstName = (name: string) => (name || "Cliente").trim().split(/\s+/)[0];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center pt-16">
        <MessageSquare size={48} color="#E5E5E5" />
        <p className="mt-4 text-[16px] font-semibold text-[#767676]">Nenhuma conversa ainda</p>
        <p className="mt-1 text-[13px] text-[#767676]">As mensagens dos seus clientes aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <>
      {cards.map((c) => (
        <button
          key={c.client_id}
          onClick={() => navigate(`/mensagens/cliente/${c.client_id}`)}
          className="mb-2.5 flex w-full items-center gap-3 rounded-[16px] bg-white p-4 text-left"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="relative shrink-0">
            {c.client_avatar ? (
              <img src={c.client_avatar} className="h-[52px] w-[52px] rounded-full object-cover" alt="" />
            ) : (
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#276EF1] text-[18px] font-bold text-white">
                {firstName(c.client_name).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px]">
              {c.category_icon}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-black truncate">{firstName(c.client_name)}</span>
              <span className="shrink-0 text-[11px] text-[#767676]">{timeAgo(c.last_message_at)}</span>
            </div>
            {c.conv_count > 1 ? (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] text-[#276EF1]"
                style={{ background: "#EAF2FF" }}>
                {c.conv_count} oportunidades
              </span>
            ) : c.job_title ? (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] text-[#767676]"
                style={{ background: "#F7F7F7" }}>
                <span className="text-[11px]">{c.category_icon}</span> {c.job_title}
              </span>
            ) : null}
            <p className="mt-0.5 truncate text-[13px]"
              style={{ color: c.unread_pro > 0 ? "#000" : "#767676", fontWeight: c.unread_pro > 0 ? 500 : 400 }}>
              {c.last_message || "..."}
            </p>
          </div>
          {c.unread_pro > 0 ? (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
              style={{ background: "#F59E0B", color: "#000" }}>
              {c.unread_pro}
            </span>
          ) : (
            <ChevronRight size={18} color="#E5E5E5" className="shrink-0" />
          )}
        </button>
      ))}
    </>
  );
};

/* ───── Support Tab ───── */
const SupportTab = () => {
  const { user } = useAuth();
  const { insertNotification } = useNotifications();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    }, 50);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
      setLoadingMsgs(false);
      scrollToBottom(false);
    };
    load();

    const channel = supabase
      .channel("support-msgs-tab-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `profile_id=eq.${user.id}` },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          if (newMsg.sender === "support") {
            navigator.vibrate?.(100);
            insertNotification({
              type: "suporte",
              title: "Nova mensagem do suporte",
              body: newMsg.message.substring(0, 80) + (newMsg.message.length > 80 ? "..." : ""),
              action_url: "/mensagens",
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const msg = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    const { error } = await supabase.from("support_messages").insert({
      profile_id: user.id,
      sender: "user",
      message: msg,
    });

    if (error) toast.error("Erro ao enviar mensagem.");
    setSending(false);
    scrollToBottom();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const path = `${user.id}/support_${Date.now()}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) {
      toast.error("Erro ao enviar arquivo.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
    const fileUrl = urlData?.publicUrl || path;

    await supabase.from("support_messages").insert({
      profile_id: user.id,
      sender: "user",
      message: "[Imagem]",
      file_url: fileUrl,
    });

    setUploading(false);
    scrollToBottom();
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
  };

  let lastDateLabel = "";

  return (
    <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ padding: "16px 16px 80px" }}>
        {loadingMsgs ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start mb-3">
                <div style={{ background: "#FFF", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", maxWidth: "75%" }}>
                  <p style={{ fontSize: 14, color: "#000", lineHeight: 1.5 }}>
                    Olá! 👋 Sou o suporte da Freelaki. Como posso te ajudar hoje?
                  </p>
                </div>
              </motion.div>
            )}
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              const dateLabel = getDateLabel(msg.created_at);
              let showDate = false;
              if (dateLabel !== lastDateLabel) {
                showDate = true;
                lastDateLabel = dateLabel;
              }

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span style={{ background: "#E5E5E5", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#767676" }}>
                        {dateLabel}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex mb-2 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div style={{
                      background: isUser ? "#276EF1" : "#FFF",
                      borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      padding: "10px 14px", maxWidth: "75%",
                    }}>
                      {msg.file_url && (
                        <img src={msg.file_url} alt="Anexo" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 4 }} />
                      )}
                      {msg.message !== "[Imagem]" && (
                        <p style={{ fontSize: 14, color: isUser ? "#FFF" : "#000", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          {msg.message}
                        </p>
                      )}
                      <p style={{ fontSize: 10, color: "#767676", marginTop: 4, textAlign: isUser ? "right" : "left" }}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2" style={{ background: "#FFF", borderTop: "1px solid #E5E5E5", padding: "8px 16px" }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="shrink-0">
          <Paperclip size={20} color="#767676" />
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); autoResize(); }}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          rows={1}
          style={{
            flex: 1, borderRadius: 22, border: "1px solid #E5E5E5", padding: "10px 16px",
            fontSize: 14, maxHeight: 100, resize: "none", outline: "none", lineHeight: 1.4,
            fontFamily: "Inter, sans-serif",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: input.trim() ? "#276EF1" : "#E5E5E5", transition: "background 200ms",
          }}
        >
          <Send size={18} color={input.trim() ? "#FFF" : "#767676"} />
        </button>
      </div>
    </div>
  );
};

/* ───── Main Page ───── */
const MensagensPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"clientes" | "suporte">("clientes");
  const [unreadClients, setUnreadClients] = useState(0);
  const [unreadSupport, setUnreadSupport] = useState(0);

  // Fetch unread counts
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("unread_pro")
        .eq("professional_id", user.id);
      if (convs) setUnreadClients(convs.reduce((s, c) => s + (c.unread_pro || 0), 0));

      const { data: supMsgs } = await supabase
        .from("support_messages")
        .select("id")
        .eq("profile_id", user.id)
        .eq("sender", "support")
        .eq("is_read", false);
      if (supMsgs) setUnreadSupport(supMsgs.length);
    };
    fetchUnread();
  }, [user, activeTab]);

  const totalUnread = unreadClients + unreadSupport;

  const tabs = [
    { key: "clientes" as const, label: "💬 Clientes", badge: unreadClients },
    { key: "suporte" as const, label: "🎧 Suporte", badge: unreadSupport },
  ];

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
      <div className="flex flex-1 flex-col rounded-t-3xl bg-[#F7F7F7] overflow-hidden">
        {/* TABS */}
        <div className="flex bg-white px-5" style={{ borderBottom: "1px solid #E5E5E5" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex items-center justify-center gap-1.5"
              style={{
                height: 48, flex: 1,
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? "#276EF1" : "#767676",
              }}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ background: "#F59E0B", color: "#000" }}>
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "#276EF1" }} />
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {activeTab === "clientes" ? (
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            <ClientsTab />
          </div>
        ) : (
          <SupportTab />
        )}
      </div>
      <FloatingNav />
    </div>
  );
};

export default MensagensPage;
