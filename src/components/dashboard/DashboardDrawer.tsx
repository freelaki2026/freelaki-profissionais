import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { X } from "lucide-react";

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
  { icon: "👤", label: "Meu Perfil", path: "/perfil" },
  { icon: "📄", label: "Documentos", path: "/documentos" },
  { icon: "📍", label: "Endereço", path: "/endereco" },
  { icon: "🪪", label: "Dados Pessoais", path: "/dados-pessoais" },
  { icon: "🏦", label: "Dados Bancários", path: "/dados-bancarios" },
  { icon: "❓", label: "Ajuda e FAQ", path: "/ajuda" },
  { icon: "📋", label: "Contratos", path: "/contratos" },
  { icon: "💬", label: "Suporte", path: "/suporte" },
  { icon: "📜", label: "Termos de Uso", path: "/termos" },
];

const DashboardDrawer = ({ open, onClose, profile }: DashboardDrawerProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
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
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-lg font-bold text-white">
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
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => goTo(item.path)}
                  className="flex w-full items-center gap-3.5 border-b border-[hsl(var(--muted))] py-3.5 text-left"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[15px] font-medium text-foreground">{item.label}</span>
                </button>
              ))}

              <div className="my-2 h-px bg-[hsl(var(--border))]" />

              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3.5 py-3.5 text-left"
              >
                <span className="text-xl">🚪</span>
                <span className="text-[15px] font-medium text-[#E53935]">Sair</span>
              </button>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DashboardDrawer;
