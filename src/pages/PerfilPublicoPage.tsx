import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Star, X, Plus, Trash2, Grid3X3,
  Instagram, Globe, Linkedin, Github, Youtube, Zap,
} from "lucide-react";
import { toast } from "sonner";

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  linkedin: Linkedin,
  github: Github,
  youtube: Youtube,
  website: Globe,
};

const MAX_PHOTOS = 6;

interface PortfolioPhoto {
  id: string;
  photo_url: string;
  order_index: number;
}

const PerfilPublicoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pricing, setPricing] = useState<{ hourly_rate: number | null; daily_rate: number | null } | null>(null);

  const socialFields = [
    "instagram", "tiktok", "youtube", "linkedin", "behance",
    "dribbble", "figma", "github", "vimeo", "twitter", "pinterest", "website",
  ];

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, photosRes, reviewsRes, catsRes, pricingRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("portfolio_photos").select("*").eq("profile_id", user.id).order("order_index"),
        supabase.from("reviews").select("rating").eq("professional_id", user.id),
        supabase.from("professional_categories").select("category_id, categories(name)").eq("profile_id", user.id),
        supabase.from("professional_pricing").select("hourly_rate, daily_rate").eq("profile_id", user.id).maybeSingle(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (photosRes.data) setPhotos(photosRes.data as PortfolioPhoto[]);
      if (pricingRes.data) setPricing(pricingRes.data);

      if (reviewsRes.data && reviewsRes.data.length > 0) {
        const sum = reviewsRes.data.reduce((s: number, r: any) => s + (r.rating || 0), 0);
        setAvgRating(Math.round((sum / reviewsRes.data.length) * 10) / 10);
        setReviewCount(reviewsRes.data.length);
      }

      if (catsRes.data) {
        setCategories(catsRes.data.map((c: any) => c.categories?.name).filter(Boolean));
      }
    };
    fetchAll();
  }, [user]);

  const socials = profile
    ? socialFields.filter((f) => profile[f]).map((f) => ({ platform: f, value: profile[f] }))
    : [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Máximo de ${MAX_PHOTOS} fotos atingido`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 5MB)");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("portfolio").upload(path, file);
    if (uploadErr) {
      toast.error("Erro ao enviar foto");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);

    const { data: inserted, error: insertErr } = await supabase
      .from("portfolio_photos")
      .insert({ profile_id: user.id, photo_url: urlData.publicUrl, file_name: file.name, order_index: photos.length })
      .select()
      .single();

    if (insertErr) {
      toast.error("Erro ao salvar foto");
    } else if (inserted) {
      setPhotos((prev) => [...prev, inserted as PortfolioPhoto]);
      toast.success("Foto adicionada!");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (photo: PortfolioPhoto) => {
    const pathMatch = photo.photo_url.match(/portfolio\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from("portfolio").remove([pathMatch[1]]);
    }
    await supabase.from("portfolio_photos").delete().eq("id", photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    toast.success("Foto removida");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
    : "?";

  const getSocialUrl = (platform: string, value: string) => {
    if (value.startsWith("http")) return value;
    const bases: Record<string, string> = {
      instagram: "https://instagram.com/",
      tiktok: "https://tiktok.com/@",
      youtube: "https://youtube.com/@",
      linkedin: "https://linkedin.com/in/",
      behance: "https://behance.net/",
      dribbble: "https://dribbble.com/",
      github: "https://github.com/",
      vimeo: "https://vimeo.com/",
      twitter: "https://x.com/",
      pinterest: "https://pinterest.com/",
      figma: "https://figma.com/@",
      website: "",
    };
    return (bases[platform] || "") + value;
  };

  const SocialIcon = ({ platform }: { platform: string }) => {
    const Icon = SOCIAL_ICONS[platform] || Globe;
    return <Icon size={16} />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0F]">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-[#276EF1]/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 h-48 w-48 rounded-full bg-[#7C3AED]/10 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10" style={{ paddingTop: 48 }}>
        <div className="flex items-center px-5 pb-6">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={22} className="text-white/70" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <Zap size={14} className="text-[#276EF1]" />
            <span className="text-[14px] font-semibold tracking-wide text-white/60 uppercase">
              Perfil Público
            </span>
          </div>
          <div className="w-[22px]" />
        </div>

        {/* Avatar + Name block */}
        <div className="flex flex-col items-center px-6">
          {/* Avatar with glow ring */}
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

          {/* Name */}
          <h1 className="mt-4 text-[22px] font-bold text-white tracking-tight">
            {profile?.full_name || "Profissional"}
          </h1>

          {/* Stars */}
          <div className="mt-1.5 flex items-center gap-0.5">
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

          {/* Category tags */}
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-[#276EF1]/15 border border-[#276EF1]/25 px-3 py-1 text-[11px] font-medium text-[#6B9BFF]"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-6 mx-6 flex items-center justify-around rounded-2xl bg-white/[0.04] border border-white/[0.06] py-4 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-[20px] font-bold text-white">{photos.length}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">publicações</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-[20px] font-bold text-white">{reviewCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Avaliações</p>
          </div>
          {pricing && (
            <>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-[20px] font-bold text-white">
                  R${pricing.hourly_rate || 0}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">/hora</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative z-10 flex-1 mt-6 px-6 pb-10"
      >
        {/* Bio */}
        {profile?.bio && (
          <div className="mb-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
            <p className="text-[13px] leading-relaxed text-white/60">{profile.bio}</p>
          </div>
        )}

        {/* Social links */}
        {socials.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {socials.map((s) => (
              <a
                key={s.platform}
                href={getSocialUrl(s.platform, s.value)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-white/50 transition-all hover:bg-[#276EF1]/20 hover:border-[#276EF1]/40 hover:text-[#6B9BFF]"
              >
                <SocialIcon platform={s.platform} />
                {s.platform}
              </a>
            ))}
          </div>
        )}

        {/* Portfolio grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Grid3X3 size={16} className="text-white/30" />
              <span className="text-[13px] font-semibold text-white/70">Portfólio</span>
            </div>
            <span className="text-[11px] text-white/25 font-medium">{photos.length}/{MAX_PHOTOS}</span>
          </div>

          <div className="grid grid-cols-3 gap-[3px]">
            {photos.map((photo, idx) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative aspect-square overflow-hidden rounded-lg"
              >
                <img
                  src={photo.photo_url}
                  alt=""
                  className="h-full w-full object-cover cursor-pointer transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                  onClick={() => setLightbox(photo.photo_url)}
                />
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <button
                  onClick={() => handleDelete(photo)}
                  className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}

            {/* Add photo slot */}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.03] transition-all hover:border-[#276EF1]/40 hover:bg-[#276EF1]/10"
              >
                {uploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
                ) : (
                  <Plus size={22} className="text-white/20" />
                )}
              </button>
            )}
          </div>

          {photos.length === 0 && !uploading && (
            <p className="mt-3 text-center text-[12px] text-white/25">
              Adicione fotos dos seus trabalhos para atrair mais clientes
            </p>
          )}
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-12 right-4 text-white/60 hover:text-white transition-colors" onClick={() => setLightbox(null)}>
              <X size={28} />
            </button>
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              src={lightbox}
              className="max-h-[80vh] max-w-full rounded-xl object-contain"
              alt=""
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerfilPublicoPage;
