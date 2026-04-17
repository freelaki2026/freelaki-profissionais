import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Conversa UNIFICADA por cliente.
 * - Junta TODAS as conversations entre o profissional e o cliente (de qualquer oportunidade).
 * - Renderiza uma única timeline com separadores "— Oportunidade: X —" entre blocos.
 * - Envio sempre vai para a conversation MAIS RECENTE (a do contrato/oportunidade ativa).
 * - Não altera o banco; é apenas uma visão unificada.
 */

interface Msg {
  id: string;
  conversation_id: string | null;
  sender_id: string | null;
  body: string | null;
  file_url: string | null;
  created_at: string | null;
}

interface ConvInfo {
  id: string;
  opportunity_id: string | null;
  job_title: string;
  created_at: string | null;
}

interface ClientMeta {
  client_id: string;
  client_name: string;
  client_avatar: string | null;
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

const ChatClienteUnificadoPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { insertNotification } = useNotifications();

  const [meta, setMeta] = useState<ClientMeta | null>(null);
  const [conversations, setConversations] = useState<ConvInfo[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
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

  // conversation alvo do envio: a mais recente (último contrato/oportunidade)
  const activeConvId = useMemo(() => {
    if (conversations.length === 0) return null;
    return conversations[conversations.length - 1].id;
  }, [conversations]);

  const convsById = useMemo(() => {
    const m = new Map<string, ConvInfo>();
    conversations.forEach((c) => m.set(c.id, c));
    return m;
  }, [conversations]);

  // Carga inicial: cliente + conversas + mensagens
  useEffect(() => {
    if (!user || !clientId) return;
    const loadAll = async () => {
      // Cliente
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", clientId)
        .single();
      if (p) {
        setMeta({
          client_id: p.id,
          client_name: p.full_name || "Cliente",
          client_avatar: p.avatar_url,
        });
      }

      // Conversas
      const { data: cvs } = await supabase
        .from("conversations")
        .select("id, opportunity_id, created_at")
        .eq("professional_id", user.id)
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });

      if (!cvs || cvs.length === 0) {
        setConversations([]);
        setMessages([]);
        return;
      }

      // Buscar títulos das oportunidades em batch
      const oppIds = cvs.map((c) => c.opportunity_id).filter(Boolean) as string[];
      const titlesMap = new Map<string, string>();
      if (oppIds.length > 0) {
        const { data: opps } = await supabase
          .from("opportunities")
          .select("id, title")
          .in("id", oppIds);
        opps?.forEach((o) => titlesMap.set(o.id, o.title));
      }

      const convInfos: ConvInfo[] = cvs.map((c) => ({
        id: c.id,
        opportunity_id: c.opportunity_id,
        job_title: c.opportunity_id ? (titlesMap.get(c.opportunity_id) || "Conversa") : "Conversa",
        created_at: c.created_at,
      }));
      setConversations(convInfos);

      // Mensagens de TODAS as conversations
      const convIds = cvs.map((c) => c.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, file_url, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
      scrollToBottom(false);

      // Marcar todas como lidas
      await supabase.from("conversations").update({ unread_pro: 0 } as any).in("id", convIds);
      await supabase.from("messages").update({ is_read: true } as any).in("conversation_id", convIds).neq("sender_id", user.id);
    };
    loadAll();
  }, [user, clientId, scrollToBottom]);

  // Realtime: escuta INSERTs em todas as conversations carregadas
  useEffect(() => {
    if (!user || conversations.length === 0) return;
    const convIds = conversations.map((c) => c.id);
    const channel = supabase
      .channel(`chat-cliente-unif-${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Msg;
          if (!newMsg.conversation_id || !convIds.includes(newMsg.conversation_id)) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          if (newMsg.sender_id !== user.id) {
            supabase.from("messages").update({ is_read: true } as any).eq("id", newMsg.id);
            supabase.from("conversations").update({ unread_pro: 0 } as any).eq("id", newMsg.conversation_id);
            navigator.vibrate?.(100);
            insertNotification({
              type: "cliente",
              title: `Nova mensagem de ${meta?.client_name || "Cliente"}`,
              body: (newMsg.body || "").substring(0, 80),
              action_url: `/mensagens/cliente/${clientId}`,
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, clientId, conversations, scrollToBottom, meta, insertNotification]);

  const handleSend = async () => {
    if (!input.trim() || !user || !activeConvId || sending) return;
    const msg = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: activeConvId,
      sender_id: user.id,
      body: msg,
    } as any);
    setSending(false);
    scrollToBottom();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConvId) return;
    const path = `${user.id}/msg_${Date.now()}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) { toast.error("Erro ao enviar arquivo."); return; }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
    await supabase.from("messages").insert({
      conversation_id: activeConvId,
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
  let lastConvId: string | null = null;

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
          {conversations.length > 0 && (
            <span className="text-[11px] text-[#767676]">
              {conversations.length === 1 ? "1 oportunidade" : `${conversations.length} oportunidades`}
            </span>
          )}
        </div>
        <div className="w-5 ml-auto" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ background: "#F7F7F7", padding: "16px 16px 80px" }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const dateLabel = getDateLabel(msg.created_at);
            let showDate = false;
            if (dateLabel !== lastDateLabel) { showDate = true; lastDateLabel = dateLabel; }

            // Separador de oportunidade quando muda a conversation
            let showConvSep = false;
            if (msg.conversation_id && msg.conversation_id !== lastConvId) {
              showConvSep = true;
              lastConvId = msg.conversation_id;
            }
            const convInfo = msg.conversation_id ? convsById.get(msg.conversation_id) : null;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full px-3 py-1 text-[11px] text-[#767676]" style={{ background: "#E5E5E5" }}>
                      {dateLabel}
                    </span>
                  </div>
                )}
                {showConvSep && convInfo && (
                  <div
                    className="my-3 flex cursor-pointer justify-center"
                    onClick={() => convInfo.opportunity_id && navigate(`/oportunidade/${convInfo.opportunity_id}`)}
                  >
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-medium"
                      style={{ background: "#276EF1", color: "#FFF" }}
                    >
                      📋 {convInfo.job_title}
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
        <button onClick={() => fileRef.current?.click()} className="shrink-0" disabled={!activeConvId}>
          <Paperclip size={20} color="#767676" />
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); autoResize(); }}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          rows={1}
          disabled={!activeConvId}
          style={{
            flex: 1, borderRadius: 22, border: "1px solid #E5E5E5", padding: "10px 16px",
            fontSize: 14, maxHeight: 100, resize: "none", outline: "none", lineHeight: 1.4,
            fontFamily: "Inter, sans-serif",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending || !activeConvId}
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: input.trim() && activeConvId ? "#276EF1" : "#E5E5E5", transition: "background 200ms",
          }}
        >
          <Send size={18} color={input.trim() && activeConvId ? "#FFF" : "#767676"} />
        </button>
      </div>
    </div>
  );
};

export default ChatClienteUnificadoPage;
