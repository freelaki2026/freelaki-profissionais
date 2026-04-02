import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, User, Zap, ScrollText, Bell, BellOff } from "lucide-react";
import type { Notification } from "@/hooks/useNotifications";

const typeConfig: Record<string, { bg: string; color: string; Icon: any }> = {
  suporte:      { bg: "rgba(39,110,241,0.1)",  color: "#276EF1", Icon: MessageCircle },
  cliente:      { bg: "rgba(0,200,83,0.1)",     color: "#00C853", Icon: User },
  oportunidade: { bg: "rgba(245,158,11,0.1)",   color: "#F59E0B", Icon: Zap },
  contrato:     { bg: "rgba(139,92,246,0.1)",    color: "#8B5CF6", Icon: ScrollText },
  sistema:      { bg: "rgba(118,118,118,0.1)",   color: "#767676", Icon: Bell },
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Agora";
  if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Há ${Math.floor(diff / 86400)} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationPanel = ({ open, onClose, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }: Props) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (open && unreadCount > 0) {
      onMarkAllAsRead();
    }
  }, [open, unreadCount, onMarkAllAsRead]);

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) onMarkAsRead(notif.id);
    onClose();
    if (notif.action_url) {
      setTimeout(() => navigate(notif.action_url!), 150);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70]"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-[70] flex flex-col bg-white"
            style={{
              maxHeight: "75vh",
              borderRadius: "0 0 24px 24px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5"
              style={{ paddingTop: 52, paddingBottom: 16, borderBottom: "1px solid #E5E5E5" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#000" }}>Notificações</span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={onMarkAllAsRead} className="text-[13px] font-medium" style={{ color: "#276EF1" }}>
                    Marcar todas como lidas
                  </button>
                )}
                <button onClick={onClose}>
                  <X size={20} color="#767676" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto" style={{ padding: "8px 0" }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <BellOff size={40} color="#E5E5E5" />
                  <p className="mt-3 text-[15px] font-semibold text-[#767676]">Nenhuma notificação</p>
                  <p className="mt-1 text-[13px] text-[#767676]">Você está em dia!</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const config = typeConfig[notif.type] || typeConfig.sistema;
                  const IconComp = config.Icon;
                  const isUnread = !notif.is_read;

                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className="flex w-full items-start gap-3 text-left"
                      style={{
                        padding: "16px 20px",
                        background: isUnread ? "rgba(245,158,11,0.06)" : "#FFFFFF",
                        borderLeft: isUnread ? "3px solid #F59E0B" : "3px solid transparent",
                        borderBottom: "1px solid #F7F7F7",
                      }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ background: config.bg }}
                      >
                        <IconComp size={18} color={config.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold" style={{ color: isUnread ? "#000" : "#767676" }}>
                          {notif.title}
                        </p>
                        <p className="mt-0.5 text-[13px] leading-[1.5] text-[#767676]"
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {notif.body}
                        </p>
                        <p className="mt-1 text-[11px] text-[#767676]">{timeAgo(notif.created_at)}</p>
                      </div>
                      {isUnread && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: "#F59E0B" }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
