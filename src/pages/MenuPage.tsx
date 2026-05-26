import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, User, FileText, MapPin, CreditCard, Landmark,
  HelpCircle, ScrollText, MessageCircle, Shield,
  Info, LogOut, Zap, MessageSquare, DollarSign, LayoutGrid, Star, Eye, Wrench, Wallet, PlayCircle,
} from "lucide-react";
import FreelakiButton from "@/components/ui/FreelakiButton";
import BottomNav from "@/components/dashboard/BottomNav";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  approval_status: string | null;
}

const menuItems = [
  { icon: User, label: "Meu Perfil", path: "/perfil" },
  { icon: LayoutGrid, label: "Meus Serviços", path: "/meus-servicos" },
  { icon: Wrench, label: "Meus Equipamentos", path: "/equipamentos" },
  { icon: FileText, label: "Documentos", path: "/documentos" },
  { icon: MapPin, label: "Endereço", path: "/endereco" },
  { icon: CreditCard, label: "Dados Pessoais", path: "/dados-pessoais" },
  { icon: Landmark, label: "Dados Bancários", path: "/dados-bancarios" },
  { icon: ScrollText, label: "Contratos", path: "/contratos" },
  { icon: DollarSign, label: "Ganhos", path: "/ganhos" },
  { icon: Wallet, label: "Financeiro", path: "/financeiro" },
  { icon: MessageSquare, label: "Mensagens", path: "/mensagens" },
  { icon: PlayCircle, label: "Tutorial do app", path: "/dashboard?tour=replay" },
  { icon: HelpCircle, label: "Ajuda e FAQ", path: "/ajuda" },
  { icon: MessageCircle, label: "Suporte", path: "/suporte" },
  { icon: Shield, label: "Termos de Uso", path: "/termos" },
];

const MenuPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showVersion, setShowVersion] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, approval_status")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });

    supabase
      .from("conversations")
      .select("unread_pro")
      .eq("professional_id", user.id)
      .then(({ data }) => {
        if (data) setUnreadMsgs(data.reduce((s: number, c: any) => s + (c.unread_pro || 0), 0));
      });

    supabase
      .from("reviews")
      .select("rating")
      .eq("professional_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const sum = data.reduce((s: number, r: any) => s + (r.rating || 0), 0);
          setAvgRating(Math.round((sum / data.length) * 10) / 10);
          setReviewCount(data.length);
        }
      });
  }, [user]);

  const handleSignOut = async () => {
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
    return { text: "Complete o cadastro →", bg: "#FFF3E0", color: "#B45309", click: () => navigate("/documentos") };
  };

  const badge = statusBadge();

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Header */}
      <div className="flex items-center px-6 pb-5" style={{ paddingTop: 52 }}>
        <button onClick={() => navigate(-1)} className="z-10">
          <ArrowLeft size={24} color="#FFFFFF" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-white -ml-6">Menu</h1>
        <div className="w-6" />
      </div>

      {/* Body */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 rounded-t-3xl bg-[#F7F7F7] pb-20"
      >
        {/* Profile header */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="h-14 w-14 rounded-full object-cover" alt="" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#276EF1] text-lg font-bold text-white">
                {initials}
              </div>
            )}
            {/* Stars */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={avgRating !== null && i <= Math.round(avgRating) ? "#F59E0B" : "none"}
                    color={avgRating !== null && i <= Math.round(avgRating) ? "#F59E0B" : "#D1D5DB"}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <span className="mt-0.5 text-[12px] text-[#767676]">
                {avgRating !== null ? `${avgRating} (${reviewCount})` : "Sem avaliações"}
              </span>
            </div>
          </div>
          <p className="mt-3 text-[17px] font-bold text-foreground">
            {profile?.full_name || "Profissional"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={badge.click}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.text}
            </button>
            <button
              onClick={() => navigate("/perfil-publico")}
              className="flex items-center gap-1.5 rounded-full border border-[#276EF1] px-3 py-1 text-xs font-medium text-[#276EF1]"
            >
              <Eye size={13} />
              Ver meu perfil público
            </button>
          </div>
        </div>

        {/* Menu items */}
        <nav className="mt-4 px-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex w-full items-center gap-3.5 border-b border-[#E8E8E8] py-3.5 text-left"
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

          {/* Version */}
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

      <BottomNav />

      {/* Version Bottom Sheet */}
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
    </div>
  );
};

export default MenuPage;
