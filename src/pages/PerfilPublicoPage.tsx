import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Camera, Star, MapPin, X, Plus, Trash2, Grid3X3,
  Instagram, Globe, Linkedin, Github, Youtube,
} from "lucide-react";
import { toast } from "sonner";

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  linkedin: Linkedin,
  github: Github,
  youtube: Youtube,
  website: Globe,
};

const MAX_PHOTOS = 5;

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
    // Fetch all data in parallel
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
    return <Icon size={18} />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Cover / Header area */}
      <div className="relative">
        {/* Gradient cover */}
        <div className="h-36 w-full bg-gradient-to-br from-[#276EF1] via-[#1a4fc7] to-[#0d2d7a]" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 z-20"
          style={{ top: 48 }}
        >
          <ArrowLeft size={24} color="#fff" />
        </button>

        {/* Title */}
        <p className="absolute right-0 left-0 text-center text-[15px] font-semibold text-white/80" style={{ top: 52 }}>
          Perfil Público
        </p>

        {/* Avatar overlapping cover */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -44 }}>
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="h-[88px] w-[88px] rounded-full border-[3px] border-white object-cover shadow-lg"
                alt=""
              />
            ) : (
              <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] border-white bg-[#276EF1] text-2xl font-bold text-white shadow-lg">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 rounded-t-3xl bg-[#FAFAFA] pt-14 pb-10"
        style={{ marginTop: -16 }}
      >
        {/* Name + Rating */}
        <div className="text-center px-6">
          <h1 className="text-[20px] font-bold text-foreground">
            {profile?.full_name || "Profissional"}
          </h1>

          {/* Stars */}
          <div className="mt-1 flex items-center justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={16}
                fill={avgRating !== null && i <= Math.round(avgRating) ? "#F59E0B" : "none"}
                color={avgRating !== null && i <= Math.round(avgRating) ? "#F59E0B" : "#D1D5DB"}
                strokeWidth={1.5}
              />
            ))}
            <span className="ml-1.5 text-[13px] text-muted-foreground">
              {avgRating !== null ? `${avgRating} (${reviewCount})` : "Sem avaliações"}
            </span>
          </div>

          {/* Categories tags */}
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-[#276EF1]/10 px-3 py-1 text-[11px] font-medium text-[#276EF1]"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-5 flex items-center justify-center gap-8 border-y border-[#E8E8E8] py-3 px-6">
          <div className="text-center">
            <p className="text-[18px] font-bold text-foreground">{photos.length}</p>
            <p className="text-[11px] text-muted-foreground">Trabalhos</p>
          </div>
          <div className="h-6 w-px bg-[#E8E8E8]" />
          <div className="text-center">
            <p className="text-[18px] font-bold text-foreground">{reviewCount}</p>
            <p className="text-[11px] text-muted-foreground">Avaliações</p>
          </div>
          {pricing && (
            <>
              <div className="h-6 w-px bg-[#E8E8E8]" />
              <div className="text-center">
                <p className="text-[18px] font-bold text-foreground">
                  R$ {pricing.hourly_rate || 0}
                </p>
                <p className="text-[11px] text-muted-foreground">/hora</p>
              </div>
            </>
          )}
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div className="mt-4 px-6">
            <p className="text-[13px] leading-relaxed text-[#444]">{profile.bio}</p>
          </div>
        )}

        {/* Social links */}
        {socials.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 px-6">
            {socials.map((s) => (
              <a
                key={s.platform}
                href={getSocialUrl(s.platform, s.value)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-[#E0E0E0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#333] transition-colors hover:border-[#276EF1] hover:text-[#276EF1]"
              >
                <SocialIcon platform={s.platform} />
                {s.platform}
              </a>
            ))}
          </div>
        )}

        {/* Portfolio grid */}
        <div className="mt-6 px-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Grid3X3 size={18} className="text-muted-foreground" />
              <span className="text-[14px] font-semibold text-foreground">Portfólio</span>
            </div>
            <span className="text-[12px] text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-md">
                <img
                  src={photo.photo_url}
                  alt=""
                  className="h-full w-full object-cover cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setLightbox(photo.photo_url)}
                />
                <button
                  onClick={() => handleDelete(photo)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* Add photo button */}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-[#D0D0D0] bg-white transition-colors hover:border-[#276EF1] hover:bg-[#276EF1]/5"
              >
                {uploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
                ) : (
                  <Plus size={24} className="text-[#999]" />
                )}
              </button>
            )}
          </div>

          {photos.length === 0 && !uploading && (
            <p className="mt-2 text-center text-[12px] text-muted-foreground">
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-12 right-4 text-white" onClick={() => setLightbox(null)}>
              <X size={28} />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={lightbox}
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
              alt=""
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerfilPublicoPage;
