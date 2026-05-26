import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Star, X, Plus, Trash2, Grid3X3,
  Instagram, Globe, Linkedin, Github, Youtube, Zap,
  Wrench, Camera, Mic, Lightbulb, Smartphone, Laptop, Package, Play,
} from "lucide-react";
import { toast } from "sonner";

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  linkedin: Linkedin,
  github: Github,
  youtube: Youtube,
  website: Globe,
};

const EQUIPMENT_ICONS: Record<string, React.ElementType> = {
  camera: Camera,
  audio: Mic,
  lighting: Lightbulb,
  smartphone: Smartphone,
  computer: Laptop,
  accessory: Package,
  other: Wrench,
};

const MAX_ITEMS = 6;
const MAX_VIDEO_SECONDS = 90;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface PortfolioItem {
  id: string;
  photo_url: string;
  order_index: number;
  media_type?: "image" | "video" | string | null;
  duration_seconds?: number | null;
}

const formatDuration = (s: number) => {
  const sec = Math.max(0, Math.round(s));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};

const readVideoMetadata = (file: File): Promise<{ duration: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve({ duration });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler o vídeo"));
    };
  });

const PerfilPublicoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<PortfolioItem[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading">("idle");
  const [compressPct, setCompressPct] = useState(0);
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [pricing, setPricing] = useState<{ hourly_rate: number | null; daily_rate: number | null } | null>(null);
  const [equipments, setEquipments] = useState<Array<{ id: string; name: string; category: string | null; description: string | null }>>([]);

  const socialFields = [
    "instagram", "tiktok", "youtube", "linkedin", "behance",
    "dribbble", "figma", "github", "vimeo", "twitter", "pinterest", "website",
  ];

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, photosRes, reviewsRes, catsRes, pricingRes, equipRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("portfolio_photos").select("*").eq("profile_id", user.id).order("order_index"),
        supabase.from("reviews").select("rating").eq("professional_id", user.id),
        supabase.from("professional_categories").select("category_id, categories(name)").eq("profile_id", user.id),
        supabase.from("professional_pricing").select("hourly_rate, daily_rate").eq("profile_id", user.id).maybeSingle(),
        supabase.from("professional_equipments").select("id, name, category, description").eq("profile_id", user.id).order("order_index"),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (photosRes.data) setPhotos(photosRes.data as PortfolioItem[]);
      if (pricingRes.data) setPricing(pricingRes.data);
      if (equipRes.data) setEquipments(equipRes.data as any);

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
    if (photos.length >= MAX_ITEMS) {
      toast.error(`Máximo de ${MAX_ITEMS} arquivos atingido`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|qt)$/i.test(file.name);
    const isImage = file.type.startsWith("image/");

    if (isVideo) {
      if (file.size > MAX_VIDEO_BYTES) {
        toast.error("Vídeo muito grande (máx. 300MB)");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    } else if (isImage) {
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Imagem muito grande (máx. 5MB)");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    } else {
      toast.error("Tipo de arquivo não suportado");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadStage("uploading");
    setCompressPct(0);

    let durationSeconds: number | null = null;
    let fileToUpload: File = file;

    if (isVideo) {
      try {
        const meta = await readVideoMetadata(file);
        if (!isFinite(meta.duration) || meta.duration <= 0) {
          throw new Error("Duração inválida");
        }
        if (meta.duration > MAX_VIDEO_SECONDS + 0.5) {
          toast.error(`Vídeo deve ter no máximo ${MAX_VIDEO_SECONDS} segundos`);
          setUploading(false);
          setUploadStage("idle");
          if (fileRef.current) fileRef.current.value = "";
          return;
        }
        durationSeconds = Math.round(meta.duration * 10) / 10;
      } catch {
        toast.error("Não foi possível ler o vídeo");
        setUploading(false);
        setUploadStage("idle");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

    }

    const ext = isVideo
      ? (file.name.split(".").pop() || "mp4").toLowerCase()
      : (file.name.split(".").pop() || "jpg");
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("portfolio")
      .upload(path, fileToUpload, { contentType: fileToUpload.type, cacheControl: "3600" });
    if (uploadErr) {
      toast.error("Erro ao enviar arquivo");
      setUploading(false);
      setUploadStage("idle");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);

    const { data: inserted, error: insertErr } = await supabase
      .from("portfolio_photos")
      .insert({
        profile_id: user.id,
        photo_url: urlData.publicUrl,
        file_name: file.name,
        order_index: photos.length,
        media_type: isVideo ? "video" : "image",
        duration_seconds: durationSeconds,
      } as any)
      .select()
      .single();

    if (insertErr) {
      toast.error("Erro ao salvar arquivo");
    } else if (inserted) {
      setPhotos((prev) => [...prev, inserted as PortfolioItem]);
      toast.success(isVideo ? "Vídeo adicionado!" : "Foto adicionada!");
    }
    setUploading(false);
    setUploadStage("idle");
    setCompressPct(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (item: PortfolioItem) => {
    const pathMatch = item.photo_url.match(/portfolio\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from("portfolio").remove([pathMatch[1]]);
    }
    await supabase.from("portfolio_photos").delete().eq("id", item.id);
    setPhotos((prev) => prev.filter((p) => p.id !== item.id));
    toast.success("Removido");
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
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,.mov,.mp4"
        className="hidden"
        onChange={handleUpload}
      />

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
            {profile?.full_name || "Profissional"}
          </h1>

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
        <div className="mt-6 mx-6 grid grid-cols-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] py-4 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center">
            <p className="text-[20px] font-bold text-white leading-none">{photos.length}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/30">publicações</p>
          </div>
          <div className="flex flex-col items-center justify-center border-x border-white/10">
            <p className="text-[20px] font-bold text-white leading-none">{reviewCount}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/30">avaliações</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-[20px] font-bold text-white leading-none">
              {pricing ? `R$${pricing.hourly_rate || 0}` : "—"}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/30">/hora</p>
          </div>
        </div>
      </div>

      {/* Content area */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative z-10 flex-1 mt-6 px-6 pb-10"
      >
        {profile?.bio && (
          <div className="mb-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
            <p className="text-[13px] leading-relaxed text-white/60">{profile.bio}</p>
          </div>
        )}

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

        {equipments.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={16} className="text-white/30" />
              <span className="text-[13px] font-semibold text-white/70">Equipamentos</span>
              <span className="text-[11px] text-white/25 font-medium">({equipments.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {equipments.map((eq) => {
                const Icon = EQUIPMENT_ICONS[eq.category || "other"] || Wrench;
                return (
                  <div
                    key={eq.id}
                    title={eq.description || eq.name}
                    className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-white/70"
                  >
                    <Icon size={13} className="text-[#6B9BFF]" />
                    {eq.name}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Portfolio grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Grid3X3 size={16} className="text-white/30" />
              <span className="text-[13px] font-semibold text-white/70">Portfólio</span>
            </div>
            <span className="text-[11px] text-white/25 font-medium">{photos.length}/{MAX_ITEMS}</span>
          </div>

          <div className="grid grid-cols-3 gap-[3px]">
            {photos.map((item, idx) => {
              const isVideo = item.media_type === "video";
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-black"
                >
                  {isVideo ? (
                    <video
                      src={item.photo_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover cursor-pointer transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                      onClick={() => setLightbox({ url: item.photo_url, type: "video" })}
                    />
                  ) : (
                    <img
                      src={item.photo_url}
                      alt=""
                      className="h-full w-full object-cover cursor-pointer transition-all duration-300 group-hover:scale-110 group-hover:brightness-75"
                      onClick={() => setLightbox({ url: item.photo_url, type: "image" })}
                    />
                  )}

                  {isVideo && (
                    <>
                      <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        onClick={() => setLightbox({ url: item.photo_url, type: "video" })}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                          <Play size={16} className="text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      {item.duration_seconds ? (
                        <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {formatDuration(item.duration_seconds)}
                        </span>
                      ) : null}
                    </>
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                    className="absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/80 text-white opacity-100 transition-all hover:bg-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              );
            })}

            {/* Add slot */}
            {photos.length < MAX_ITEMS && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed border-white/10 bg-white/[0.03] transition-all hover:border-[#276EF1]/40 hover:bg-[#276EF1]/10"
              >
                {uploading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
                    <span className="px-1 text-center text-[9px] font-medium leading-tight text-white/60">
                      Enviando...
                    </span>
                  </>
                ) : (
                  <Plus size={22} className="text-white/20" />
                )}
              </button>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
            Fotos (até 5MB) e vídeos até 1min30s (máx. 150MB) — limite de {MAX_ITEMS} arquivos
          </p>
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black p-0"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-12 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
              onClick={() => setLightbox(null)}
            >
              <X size={20} />
            </button>
            {lightbox.type === "video" ? (
              <motion.video
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}
                src={lightbox.url}
                controls
                autoPlay
                loop
                playsInline
                {...({ "webkit-playsinline": "true" } as any)}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[92vh] max-w-full"
              />
            ) : (
              <motion.img
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}
                src={lightbox.url}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[92vh] max-w-full object-contain"
                alt=""
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerfilPublicoPage;
