import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Calendar, Briefcase, Zap, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientProfile {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  is_approved: boolean | null;
}

interface Review {
  id: string;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  professional_name: string | null;
  professional_avatar: string | null;
}

const PerfilClientePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const firstName = profile?.full_name
    ? profile.full_name.trim().split(/\s+/)[0]
    : "Cliente";
  const initials = firstName.charAt(0).toUpperCase();

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMM yyyy", { locale: ptBR })
    : "—";

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      const [profileRes, reviewsRes, servicesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url, bio, created_at, is_approved")
          .eq("id", id)
          .single(),
        supabase
          .from("reviews")
          .select("id, rating, comment, created_at, professional_id, profiles!reviews_professional_id_fkey(full_name, avatar_url)")
          .eq("client_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .eq("client_id", id)
          .in("status", ["completed", "in_progress", "accepted", "awaiting_signatures"]),
      ]);

      if (profileRes.data) setProfile(profileRes.data as ClientProfile);
      if (servicesRes.count != null) setServicesCount(servicesRes.count);

      if (reviewsRes.data && reviewsRes.data.length > 0) {
        const mapped = reviewsRes.data.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          professional_name: r.profiles?.full_name || null,
          professional_avatar: r.profiles?.avatar_url || null,
        }));
        setReviews(mapped);
        const sum = mapped.reduce((s, r) => s + (r.rating || 0), 0);
        setAvgRating(Math.round((sum / mapped.length) * 10) / 10);
        setReviewCount(mapped.length);
      }

      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#276EF1] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-12 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-[#276EF1]/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 h-48 w-48 rounded-full bg-[#7C3AED]/10 blur-[100px]" />
      </div>

      <div className="relative z-10" style={{ paddingTop: 48 }}>
        {/* Header */}
        <div className="flex items-center px-5 pb-6">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={22} className="text-white/70" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <Zap size={14} className="text-[#276EF1]" />
            <span className="text-[14px] font-semibold tracking-wide text-white/60 uppercase">
              Perfil do Cliente
            </span>
          </div>
          <div className="w-[22px]" />
        </div>

        {/* Avatar + Name */}
        <motion.div
          className="flex flex-col items-center px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#276EF1] to-[#7C3AED] blur-md opacity-50 scale-110" />
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="relative h-24 w-24 rounded-full border-2 border-[#276EF1]/50 object-cover"
                alt=""
              />
            ) : (
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#276EF1]/50 bg-[#1A1A2E] text-2xl font-bold text-white">
                {initials}
              </div>
            )}
          </div>

          <h1 className="mt-4 text-[22px] font-bold text-white tracking-tight">
            {firstName}
          </h1>

          {/* Verified badge */}
          {profile?.is_approved && (
            <div className="mt-1.5 flex items-center gap-1">
              <Shield size={12} className="text-[#2E7D32]" />
              <span className="text-[11px] font-medium text-[#4CAF50]">Verificado</span>
            </div>
          )}

          {/* Stars */}
          <div className="mt-2 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={14}
                fill={avgRating !== null && i <= Math.round(avgRating) ? "#F59E0B" : "none"}
                color={avgRating !== null && i <= Math.round(avgRating) ? "#F59E0B" : "#3A3A4A"}
                strokeWidth={1.5}
              />
            ))}
            <span className="ml-1.5 text-[12px] text-white/40">
              {avgRating !== null ? `${avgRating} (${reviewCount})` : "Sem avaliações"}
            </span>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="mt-6 mx-6 grid grid-cols-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] py-4 backdrop-blur-sm"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="flex flex-col items-center justify-center">
            <Briefcase size={16} className="text-[#276EF1] mb-1" />
            <p className="text-[20px] font-bold text-white leading-none">{servicesCount}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/30">serviços</p>
          </div>
          <div className="flex flex-col items-center justify-center border-x border-white/10">
            <Star size={16} className="text-[#F59E0B] mb-1" />
            <p className="text-[20px] font-bold text-white leading-none">{reviewCount}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/30">avaliações</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <Calendar size={16} className="text-[#7C3AED] mb-1" />
            <p className="text-[14px] font-bold text-white leading-none capitalize">{memberSince}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/30">membro</p>
          </div>
        </motion.div>

        {/* Bio */}
        {profile?.bio && (
          <motion.div
            className="mt-5 mx-6 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 backdrop-blur-sm"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[2px] text-white/30 mb-2">Sobre</p>
            <p className="text-[14px] leading-relaxed text-white/70">{profile.bio}</p>
          </motion.div>
        )}

        {/* Reviews */}
        <motion.div
          className="mt-5 mx-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-white/30 mb-3">
            Avaliações recebidas
          </p>

          {reviews.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-6 text-center backdrop-blur-sm">
              <Star size={28} className="mx-auto text-white/10 mb-2" />
              <p className="text-[13px] text-white/30">Nenhuma avaliação ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    {r.professional_avatar ? (
                      <img src={r.professional_avatar} className="h-8 w-8 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#276EF1]/20 text-[10px] font-bold text-[#6B9BFF]">
                        {r.professional_name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-white/80">{r.professional_name || "Profissional"}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={10}
                            fill={r.rating && i <= r.rating ? "#F59E0B" : "none"}
                            color={r.rating && i <= r.rating ? "#F59E0B" : "#3A3A4A"}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-white/20">
                      {r.created_at ? format(new Date(r.created_at), "dd/MM/yy") : ""}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="mt-2.5 text-[13px] leading-relaxed text-white/50">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PerfilClientePage;
