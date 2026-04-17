import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  X, User, FileText, MapPin, CreditCard, Landmark,
  HelpCircle, ScrollText, MessageCircle, Shield,
  Info, LogOut, Zap, MessageSquare, DollarSign, LayoutGrid, Wrench, CalendarDays,
} from "lucide-react";
import FreelakiButton from "@/components/ui/FreelakiButton";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  approval_status: string | null;
}

interface DashboardDrawerProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
}

const menuItems = [
  { icon: User, label: "Meu Perfil", path: "/perfil" },
  { icon: CalendarDays, label: "Minha Agenda", path: "/agenda" },
  { icon: LayoutGrid, label: "Meus Serviços", path: "/meus-servicos" },
  { icon: Wrench, label: "Meus Equipamentos", path: "/equipamentos" },
  { icon: FileText, label: "Documentos", path: "/documentos" },
  { icon: MapPin, label: "Endereço", path: "/endereco" },
  { icon: CreditCard, label: "Dados Pessoais", path: "/dados-pessoais" },
  { icon: Landmark, label: "Dados Bancários", path: "/dados-bancarios" },
  { icon: ScrollText, label: "Contratos", path: "/contratos" },
  { icon: DollarSign, label: "Ganhos", path: "/ganhos" },
  { icon: MessageSquare, label: "Mensagens", path: "/mensagens" },
  { icon: HelpCircle, label: "Ajuda e FAQ", path: "/ajuda" },
  { icon: MessageCircle, label: "Suporte", path: "/suporte" },
  { icon: Shield, label: "Termos de Uso", path: "/termos" },
];

const DashboardDrawer = ({ open, onClose, profile }: DashboardDrawerProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showVersion, setShowVersion] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  // Load unread message count
  useEffect(() => {
    if (!open) return;
    const loadUnread = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("conversations")
        .select("unread_pro")
        .eq("professional_id", session.user.id);
      if (data) {
        setUnreadMsgs(data.reduce((s: number, c: any) => s + (c.unread_pro || 0), 0));
      }
    };
    loadUnread();
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else { document.body.style.overflow = ""; setShowVersion(false); }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const goTo = (path: string) => {
    onClose();
    setTimeout(() => navigate(path), 150);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const statusBadge = () => {
    const s = profile?.approval_status;
    if (s === "approved") return { text: "Aprovado ✓", bg: "#E8F5E9", color: "#2E7D32" };
    if (s === "pending") return { text: "Em análise ⏳", bg: "#FFF3E0", color: "#B45309" };
    return { text: "Complete o cadastro →", bg: "#FFF3E0", color: "#B45309", click: () => goTo("/documentos") };
  };

  const badge = statusBadge();

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-y-0 right-0 z-50 flex w-[82%] flex-col bg-white"
            >
              <div className="px-6 pt-14">
                <button onClick={onClose} className="absolute left-4 top-14">
                  <X className="h-5 w-5 text-foreground/40" />
                </button>

                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="h-14 w-14 rounded-full object-cover" alt="" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#276EF1] text-lg font-bold text-white">
                    {initials}
                  </div>
                )}

                <p className="mt-3 text-[17px] font-bold text-foreground">
                  {profile?.full_name || "Profissional"}
                </p>

                <button
                  onClick={badge.click}
                  className="mt-2 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {badge.text}
                </button>
              </div>

              <nav className="mt-6 flex-1 overflow-y-auto px-6">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className="flex w-full items-center gap-3.5 border-b border-[#F0F0F0] py-3.5 text-left"
                    >
                      <Icon size={20} color="#276EF1" />
                      <span className="flex-1 text-[15px] font-medium text-foreground">{item.label}</span>
                      {item.path === "/mensagens" && unreadMsgs > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{ background: "#F59E0B", color: "#000" }}>
                          {unreadMsgs}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Version item */}
                <button
                  onClick={() => setShowVersion(true)}
                  className="flex w-full items-center gap-3.5 py-3.5 text-left"
                >
                  <Info size={20} color="#767676" />
                  <span className="text-[15px] font-medium text-[#767676]">Versão do app</span>
                </button>

                <div style={{ height: 1, background: "#E5E5E5" }} />

                {/* Sair */}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3.5 py-3.5 text-left"
                >
                  <LogOut size={20} color="#E53935" />
                  <span className="text-[15px] font-medium text-[#E53935]">Sair</span>
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Version Bottom Sheet */}
      <AnimatePresence>
        {showVersion && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVersion(false)}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.56)" }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col items-center"
              style={{ background: "#FFF", borderRadius: "24px 24px 0 0", padding: "20px 24px 32px" }}
            >
              <div style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2, marginBottom: 24 }} />
              <Zap size={32} fill="#276EF1" color="#276EF1" />
              <p className="mt-3 text-center text-[20px] font-bold text-foreground">freelaki profissionais</p>
              <p className="mt-1 text-center text-[14px] text-[#767676]">Versão 1.0.0</p>
              <p className="mt-2 text-center text-[12px] text-[#767676]">© 2025 Freelaki. Todos os direitos reservados.</p>
              <p className="mt-1 text-center text-[12px] text-[#767676]">Desenvolvido com ⚡ no Brasil</p>
              <div className="mt-6 w-full">
                <FreelakiButton variant="secondary" onClick={() => setShowVersion(false)} className="w-full">
                  Fechar
                </FreelakiButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardDrawer;
