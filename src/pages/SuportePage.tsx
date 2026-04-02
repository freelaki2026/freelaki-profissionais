import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  profile_id: string | null;
  sender: string;
  message: string;
  file_url: string | null;
  created_at: string | null;
  is_read: boolean | null;
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

const SuportePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      scrollToBottom(false);
    };
    load();

    const channel = supabase
      .channel("support-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `profile_id=eq.${user.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          if (newMsg.sender === "support") {
            navigator.vibrate?.(100);
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

  const allMessages: (Message | { type: "welcome" })[] =
    messages.length === 0
      ? [{ type: "welcome" as const }]
      : messages;

  let lastDateLabel = "";

  return (
    <div className="flex flex-col h-screen" style={{ background: "#000" }}>
      {/* Header */}
      <div style={{ padding: "52px 24px 16px" }} className="relative flex items-center">
        <button onClick={() => navigate(-1)} className="z-10">
          <ArrowLeft size={24} color="#FFF" />
        </button>
        <div className="absolute inset-x-0 flex flex-col items-center">
          <div
            className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: "50%", background: "#276EF1" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#FFFFFF" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#FFF", marginTop: 4 }}>Suporte Freelaki</span>
          <div className="flex items-center gap-1 mt-0.5">
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2E7D32" }} />
            <span style={{ fontSize: 12, color: "#2E7D32", fontWeight: 400 }}>Online</span>
          </div>
        </div>
        <div style={{ width: 24 }} />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ background: "#F7F7F7", padding: "16px 16px 80px" }}
      >
        <AnimatePresence initial={false}>
          {allMessages.map((item, i) => {
            if ("type" in item && item.type === "welcome") {
              return (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start mb-3"
                >
                  <div style={{ background: "#FFF", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", maxWidth: "75%" }}>
                    <p style={{ fontSize: 14, color: "#000", lineHeight: 1.5 }}>
                      Olá! 👋 Sou o suporte da Freelaki. Como posso te ajudar hoje?
                    </p>
                  </div>
                </motion.div>
              );
            }

            const msg = item as Message;
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
                    <span
                      style={{
                        background: "#E5E5E5",
                        borderRadius: 20,
                        padding: "4px 12px",
                        fontSize: 11,
                        color: "#767676",
                        fontWeight: 400,
                      }}
                    >
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
                  <div
                    style={{
                      background: isUser ? "#276EF1" : "#FFF",
                      borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      padding: "10px 14px",
                      maxWidth: "75%",
                    }}
                  >
                    {msg.file_url && (
                      <img
                        src={msg.file_url}
                        alt="Anexo"
                        style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 4 }}
                      />
                    )}
                    {msg.message !== "[Imagem]" && (
                      <p style={{ fontSize: 14, color: isUser ? "#FFF" : "#000", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {msg.message}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: 10,
                        color: "#767676",
                        marginTop: 4,
                        textAlign: isUser ? "right" : "left",
                      }}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center gap-2"
        style={{ background: "#FFF", borderTop: "1px solid #E5E5E5", padding: "8px 16px" }}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
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
            flex: 1,
            borderRadius: 22,
            border: "1px solid #E5E5E5",
            padding: "10px 16px",
            fontSize: 14,
            maxHeight: 100,
            resize: "none",
            outline: "none",
            lineHeight: 1.4,
            fontFamily: "Inter, sans-serif",
          }}
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: input.trim() ? "#276EF1" : "#E5E5E5",
            transition: "background 200ms",
          }}
        >
          <Send size={18} color={input.trim() ? "#FFF" : "#767676"} />
        </button>
      </div>
    </div>
  );
};

export default SuportePage;
