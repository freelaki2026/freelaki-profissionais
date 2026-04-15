import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Paperclip, Send, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Msg {
  id: string;
  sender_id: string | null;
  body: string | null;
  file_url: string | null;
  created_at: string | null;
}

interface ConvMeta {
  client_id: string | null;
  client_name: string;
  client_avatar: string | null;
  job_title: string;
  opportunity_id: string | null;
}

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

const ChatClientePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { insertNotification } = useNotifications();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [meta, setMeta] = useState<ConvMeta | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    }, 50);
  }, []);

  // Load conversation meta + messages
  useEffect(() => {
    if (!user || !id) return;
    const loadAll = async () => {
      // Meta
      const { data: cv } = await supabase
        .from("conversations")
        .select("client_id, opportunity_id")
        .eq("id", id)
        .single();

      if (cv) {
        let clientName = "Cliente";
        let clientAvatar: string | null = null;
        let jobTitle = "";
        let opportunityId = cv.opportunity_id;

        if (cv.client_id) {
          const { data: p } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", cv.client_id).single();
          if (p) { clientName = p.full_name || "Cliente"; clientAvatar = p.avatar_url; }
        }
        if (cv.opportunity_id) {
          const { data: o } = await supabase.from("opportunities").select("title").eq("id", cv.opportunity_id).single();
          if (o) jobTitle = o.title;
        }
        setMeta({ client_id: cv.client_id, client_name: clientName, client_avatar: clientAvatar, job_title: jobTitle, opportunity_id: opportunityId });
      }

      // Messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, body, file_url, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (msgs) setMessages(msgs);
      scrollToBottom(false);

      // Mark as read
      await supabase.from("conversations").update({ unread_pro: 0 } as any).eq("id", id);
      await supabase.from("messages").update({ is_read: true } as any).eq("conversation_id", id).neq("sender_id", user.id);
    };
    loadAll();
  }, [user, id, scrollToBottom]);

  // Realtime
  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const newMsg = payload.new as Msg;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          // Mark as read immediately
          if (newMsg.sender_id !== user.id) {
            supabase.from("messages").update({ is_read: true } as any).eq("id", newMsg.id);
            supabase.from("conversations").update({ unread_pro: 0 } as any).eq("id", id);
            navigator.vibrate?.(100);
            // Create notification
            insertNotification({
              type: "cliente",
              title: `Nova mensagem de ${meta?.client_name || "Cliente"}`,
              body: (newMsg.body || "").substring(0, 80),
              action_url: `/mensagens/${id}`,
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user, scrollToBottom, meta, insertNotification]);

  const handleSend = async () => {
    if (!input.trim() || !user || !id || sending) return;
    const msg = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      body: msg,
    } as any);
    setSending(false);
    scrollToBottom();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    const path = `${user.id}/msg_${Date.now()}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) { toast.error("Erro ao enviar arquivo."); return; }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
    await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      body: "[Imagem]",
      file_url: urlData?.publicUrl || path,
    } as any);
    scrollToBottom();
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
  };

  const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  let lastDateLabel = "";

  return (
    <div className="flex h-screen flex-col" style={{ background: "#000" }}>
      {/* Header */}
      <div className="relative flex items-center px-6" style={{ paddingTop: 52, paddingBottom: 16 }}>
        <button onClick={() => navigate("/mensagens")} className="z-10">
          <ArrowLeft size={24} color="#FFF" />
        </button>
        <div
          className="absolute inset-x-0 flex flex-col items-center cursor-pointer"
          onClick={() => meta?.client_id && navigate(`/perfil-cliente/${meta.client_id}`)}
        >
          {meta?.client_avatar ? (
            <img src={meta.client_avatar} className="h-9 w-9 rounded-full object-cover" alt="" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#276EF1] text-[12px] font-bold text-white">
              {initials(meta?.client_name || "?")}
            </div>
          )}
          <span className="mt-1 text-[15px] font-semibold text-white">{meta?.client_name || "..."}</span>
          {meta?.job_title && (
            <span className="text-[11px] text-[#767676]">{meta.job_title}</span>
          )}
        </div>
        {meta?.opportunity_id ? (
          <button onClick={() => navigate(`/oportunidade/${meta.opportunity_id}`)} className="z-10 ml-auto">
            <FileText size={20} color="#FFF" />
          </button>
        ) : <div className="w-5 ml-auto" />}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ background: "#F7F7F7", padding: "16px 16px 80px" }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const dateLabel = getDateLabel(msg.created_at);
            let showDate = false;
            if (dateLabel !== lastDateLabel) { showDate = true; lastDateLabel = dateLabel; }

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full px-3 py-1 text-[11px] text-[#767676]" style={{ background: "#E5E5E5" }}>
                      {dateLabel}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`mb-2 flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div style={{
                    background: isMe ? "#276EF1" : "#FFF",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "10px 14px",
                    maxWidth: "75%",
                  }}>
                    {msg.file_url && (
                      <img src={msg.file_url} alt="Anexo"
                        style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 4 }} />
                    )}
                    {msg.body && msg.body !== "[Imagem]" && (
                      <p style={{ fontSize: 14, color: isMe ? "#FFF" : "#000", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {msg.body}
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.6)" : "#767676", marginTop: 4, textAlign: isMe ? "right" : "left" }}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
        {messages.length === 0 && (
          <p className="pt-12 text-center text-[13px] text-[#767676]">Nenhuma mensagem ainda. Envie a primeira!</p>
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center gap-2"
        style={{ background: "#FFF", borderTop: "1px solid #E5E5E5", padding: "8px 16px" }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} className="shrink-0">
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
          className="flex shrink-0 items-center justify-center"
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

export default ChatClientePage;
