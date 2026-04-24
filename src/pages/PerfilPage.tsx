import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Lock,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { OnboardingChecklistFull } from "@/components/dashboard/OnboardingChecklistBanner";

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  email: string;
  avatar_url: string | null;
  approval_status: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  linkedin: string | null;
  behance: string | null;
  dribbble: string | null;
  figma: string | null;
  github: string | null;
  vimeo: string | null;
  twitter: string | null;
  pinterest: string | null;
  website: string | null;
}

interface CategoryChip {
  name: string;
  icon: string | null;
}

type SocialKey = "instagram" | "tiktok" | "youtube" | "linkedin" | "behance" | "dribbble" | "figma" | "github" | "vimeo" | "twitter" | "pinterest" | "website";

const SOCIAL_NETWORKS: {
  key: SocialKey;
  label: string;
  gradient?: string;
  bg: string;
  placeholder: string;
  hint: string;
  icon: string;
}[] = [
  { key: "instagram", label: "Instagram", gradient: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", bg: "", placeholder: "@freelaki", hint: "Ex: @freelaki ou freelaki", icon: "📸" },
  { key: "tiktok", label: "TikTok", bg: "#000000", placeholder: "@freelaki", hint: "Ex: @freelaki", icon: "🎵" },
  { key: "youtube", label: "YouTube", bg: "#FF0000", placeholder: "FreelakiOficial", hint: "Ex: FreelakiOficial ou URL do canal", icon: "▶" },
  { key: "linkedin", label: "LinkedIn", bg: "#0077B5", placeholder: "thiago-kenned", hint: "Ex: thiago-kenned ou URL do perfil", icon: "in" },
  { key: "behance", label: "Behance", bg: "#1769FF", placeholder: "seuportfolio", hint: "Ex: seuportfolio ou URL do Behance", icon: "Bē" },
  { key: "dribbble", label: "Dribbble", bg: "#EA4C89", placeholder: "seuuser", hint: "Ex: seuuser ou URL do Dribbble", icon: "🏀" },
  { key: "figma", label: "Figma", bg: "#A259FF", placeholder: "@seuuser", hint: "Ex: @seuuser ou URL do portfólio Figma", icon: "◆" },
  { key: "github", label: "GitHub", bg: "#24292E", placeholder: "seuuser", hint: "Ex: seuuser ou URL do GitHub", icon: "🐙" },
  { key: "vimeo", label: "Vimeo", bg: "#1AB7EA", placeholder: "seucanal", hint: "Ex: seucanal ou URL do Vimeo", icon: "▷" },
  { key: "twitter", label: "X (Twitter)", bg: "#000000", placeholder: "@seuuser", hint: "Ex: @seuuser", icon: "𝕏" },
  { key: "pinterest", label: "Pinterest", bg: "#E60023", placeholder: "seuuser", hint: "Ex: seuuser ou URL do Pinterest", icon: "📌" },
  { key: "website", label: "Website", bg: "#333333", placeholder: "www.seusite.com", hint: "Ex: www.seusite.com.br ou URL completa", icon: "🌐" },
];

const SocialCircle = ({ network, size = 32 }: { network: typeof SOCIAL_NETWORKS[number]; size?: number }) => (
  <div
    style={{
      width: size, height: size, borderRadius: "50%",
      background: network.gradient || network.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontFamily: "Inter", fontWeight: 700,
      fontSize: size * 0.35, flexShrink: 0, lineHeight: 1,
    }}
  >
    {network.icon}
  </div>
);

const phoneMask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const PerfilPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [categories, setCategories] = useState<CategoryChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Social media
  const [socials, setSocials] = useState<Record<SocialKey, string>>({
    instagram: "", tiktok: "", youtube: "", linkedin: "",
    behance: "", dribbble: "", figma: "", github: "",
    vimeo: "", twitter: "", pinterest: "", website: "",
  });
  const [showSelectSheet, setShowSelectSheet] = useState(false);
  const [showInputSheet, setShowInputSheet] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<SocialKey | null>(null);
  const [inputValue, setInputValue] = useState("");

  const addedSocials = SOCIAL_NETWORKS.filter((n) => socials[n.key].trim() !== "");
  const availableSocials = SOCIAL_NETWORKS.filter((n) => socials[n.key].trim() === "");

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: prof }, { data: cats }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone, bio, email, avatar_url, approval_status, instagram, tiktok, youtube, linkedin, behance, dribbble, figma, github, vimeo, twitter, pinterest, website")
        .eq("id", user.id)
        .single(),
      supabase
        .from("professional_categories")
        .select("category_id, categories(name, icon)")
        .eq("profile_id", user.id),
    ]);

    if (prof) {
      const p = prof as any;
      setProfile(p);
      setFullName(p.full_name || "");
      setPhone(p.phone ? phoneMask(p.phone) : "");
      setBio(p.bio || "");
      setAvatarPreview(p.avatar_url);
      setSocials({
        instagram: p.instagram || "", tiktok: p.tiktok || "",
        youtube: p.youtube || "", linkedin: p.linkedin || "",
        behance: p.behance || "", dribbble: p.dribbble || "",
        figma: p.figma || "", github: p.github || "",
        vimeo: p.vimeo || "", twitter: p.twitter || "",
        pinterest: p.pinterest || "", website: p.website || "",
      });
    }

    if (cats) {
      setCategories(
        (cats as any[]).map((c) => ({
          name: c.categories?.name || "Geral",
          icon: c.categories?.icon || "📦",
        }))
      );
    }

    setLoading(false);
    setIsDirty(false);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handlePhoneChange = (val: string) => {
    setPhone(phoneMask(val));
    setIsDirty(true);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validações de obrigatoriedade
    const trimmedName = fullName.trim();
    const nameParts = trimmedName.split(/\s+/).filter((p) => p.length >= 2);
    if (nameParts.length < 2) {
      toast.error("Informe seu nome e sobrenome (mínimo 2 letras cada).");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 11) {
      toast.error("Telefone inválido. Use DDD + 9 dígitos. Ex: (11) 99999-9999");
      return;
    }

    setSaving(true);

    let newAvatarUrl = profile?.avatar_url || null;

    if (avatarFile) {
      const path = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        phone: phone.replace(/\D/g, "") || null,
        bio: bio.trim() || null,
        avatar_url: newAvatarUrl,
        instagram: socials.instagram.trim() || null,
        tiktok: socials.tiktok.trim() || null,
        youtube: socials.youtube.trim() || null,
        linkedin: socials.linkedin.trim() || null,
        behance: socials.behance.trim() || null,
        dribbble: socials.dribbble.trim() || null,
        figma: socials.figma.trim() || null,
        github: socials.github.trim() || null,
        vimeo: socials.vimeo.trim() || null,
        twitter: socials.twitter.trim() || null,
        pinterest: socials.pinterest.trim() || null,
        website: socials.website.trim() || null,
      } as any)
      .eq("id", user.id);

    if (!error) {
      toast("Perfil atualizado! ✓", {
        style: { background: "#000", color: "#fff" },
      });
      setIsDirty(false);
      setAvatarFile(null);
    } else {
      toast.error("Erro ao salvar perfil.");
    }
    setSaving(false);
  };

  const removeSocial = (key: SocialKey) => {
    setSocials((prev) => ({ ...prev, [key]: "" }));
    setIsDirty(true);
  };

  const openInputForNetwork = (key: SocialKey) => {
    setEditingNetwork(key);
    setInputValue(socials[key] || "");
    setShowSelectSheet(false);
    setTimeout(() => setShowInputSheet(true), 200);
  };

  const saveSocialInput = () => {
    if (!editingNetwork) return;
    setSocials((prev) => ({ ...prev, [editingNetwork]: inputValue.trim() }));
    setIsDirty(true);
    setShowInputSheet(false);
    setEditingNetwork(null);
    setInputValue("");
  };

  const statusConfig: Record<
    string,
    {
      icon: React.ReactNode;
      title: string;
      color: string;
      sub: string;
      action?: { label: string; to: string };
    }
  > = {
    approved: {
      icon: <CheckCircle className="h-5 w-5 text-[#2E7D32]" />,
      title: "Conta aprovada",
      color: "#2E7D32",
      sub: "Você pode receber oportunidades.",
    },
    pending: {
      icon: <Clock className="h-5 w-5 text-[#B45309]" />,
      title: "Em análise",
      color: "#B45309",
      sub: "Análise em até 3 dias úteis.",
    },
    incomplete: {
      icon: <AlertCircle className="h-5 w-5 text-[#E65100]" />,
      title: "Complete seu cadastro",
      color: "#E65100",
      sub: "Envie seus documentos para ativar a conta.",
      action: { label: "Enviar documentos →", to: "/documentos" },
    },
    rejected: {
      icon: <XCircle className="h-5 w-5 text-[#C62828]" />,
      title: "Documento rejeitado",
      color: "#C62828",
      sub: "Verifique e reenvie o documento.",
      action: { label: "Ver documentos →", to: "/documentos" },
    },
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <div className="px-6" style={{ paddingTop: 52, paddingBottom: 24 }}>
          <div className="mx-auto h-5 w-28 animate-pulse rounded-lg bg-white/10" />
        </div>
        <div className="flex justify-center pb-7">
          <div className="h-[88px] w-[88px] animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="flex-1 rounded-t-3xl bg-[#F7F7F7] p-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4 h-24 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  const status = statusConfig[profile?.approval_status || "incomplete"] || statusConfig.incomplete;
  const currentNetwork = editingNetwork ? SOCIAL_NETWORKS.find((n) => n.key === editingNetwork) : null;

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="relative flex items-center justify-between px-6" style={{ paddingTop: 52, paddingBottom: 24 }}>
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-white">
          Meu Perfil
        </span>
        {isDirty ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[15px] font-semibold text-[hsl(var(--primary))]"
          >
            {saving ? "..." : "Salvar"}
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* AVATAR */}
      <div className="flex justify-center pb-7">
        <div className="relative">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-[88px] w-[88px] rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[28px] font-bold text-white">
              {getInitials(fullName || profile?.full_name)}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md"
          >
            <Camera className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>
      </div>

      {/* BODY */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 rounded-t-3xl bg-[#F7F7F7] px-5 pb-12 pt-6"
        style={{ marginTop: -8 }}
      >
        {/* SOBRE VOCÊ */}
        <span className="text-[10px] font-semibold tracking-[2px] text-[hsl(var(--muted-foreground))]">
          SOBRE VOCÊ
        </span>
        <div className="mt-2.5 rounded-2xl bg-white p-4">
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">Nome completo</label>
            <input
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setIsDirty(true); }}
              className="mt-1 w-full text-sm font-semibold text-foreground outline-none placeholder:text-[hsl(var(--muted-foreground))] bg-primary-foreground"
              placeholder="Seu nome"
            />
          </div>
          <div className="my-3 h-px bg-[#F7F7F7]" />
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">Telefone</label>
            <input
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="mt-1 w-full text-sm font-semibold text-foreground outline-none placeholder:text-[hsl(var(--muted-foreground))] bg-primary-foreground"
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
          </div>
          <div className="my-3 h-px bg-[#F7F7F7]" />
          <div className="relative">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">Bio / Apresentação</label>
            <textarea
              value={bio}
              onChange={(e) => { if (e.target.value.length <= 200) { setBio(e.target.value); setIsDirty(true); } }}
              className="mt-1 w-full resize-none text-sm text-foreground outline-none placeholder:text-[hsl(var(--muted-foreground))] bg-primary-foreground"
              style={{ minHeight: 80 }}
              placeholder="Conte um pouco sobre você e sua experiência..."
            />
            <span className={`absolute bottom-1 right-0 text-[11px] ${bio.length > 180 ? "text-[#E53935]" : "text-[hsl(var(--muted-foreground))]"}`}>
              {bio.length}/200
            </span>
          </div>
        </div>

        {/* REDES SOCIAIS */}
        <span className="mt-5 block text-[10px] font-semibold tracking-[2px] text-[#767676]">
          REDES SOCIAIS
        </span>
        <p style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 12, color: "#767676", marginTop: 4 }}>
          Opcional — até 6 redes/portfólios. Aparecem no seu perfil público.
        </p>
        <div className="mt-2.5 rounded-2xl bg-white p-4">
          {addedSocials.length > 0 ? (
            addedSocials.map((network, i) => (
              <div
                key={network.key}
                className="flex items-center gap-3"
                style={{
                  padding: "10px 0",
                  borderBottom: i < addedSocials.length - 1 ? "1px solid #F7F7F7" : "none",
                }}
              >
                <SocialCircle network={network} size={32} />
                <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#000", width: 90 }}>
                  {network.label}
                </span>
                <span
                  style={{
                    fontFamily: "Inter", fontWeight: 400, fontSize: 13, color: "#767676",
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {socials[network.key]}
                </span>
                <button onClick={() => removeSocial(network.key)} className="shrink-0">
                  <Trash2 size={16} color="#E53935" />
                </button>
              </div>
            ))
          ) : (
            <p style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 13, color: "#767676", textAlign: "center", padding: "8px 0" }}>
              Nenhuma rede adicionada
            </p>
          )}

          {addedSocials.length < 6 && (
            <button
              onClick={() => setShowSelectSheet(true)}
              className="mt-3 flex w-full items-center justify-center gap-2"
              style={{
                height: 44, borderRadius: 12, background: "#F7F7F7",
                border: "1px dashed #276EF1", fontFamily: "Inter", fontWeight: 600,
                fontSize: 14, color: "#276EF1",
              }}
            >
              <Plus size={16} /> Adicionar rede social
            </button>
          )}
        </div>

        {/* ACESSO */}
        <span className="mt-5 block text-[10px] font-semibold tracking-[2px] text-[hsl(var(--muted-foreground))]">
          ACESSO
        </span>
        <div className="mt-2.5 rounded-2xl bg-white p-4">
          <label className="text-xs text-[hsl(var(--muted-foreground))]">Email</label>
          <div className="relative mt-1">
            <input
              value={profile?.email || ""}
              disabled
              className="w-full rounded-xl bg-[#F7F7F7] px-3 py-2.5 pr-10 text-sm text-[hsl(var(--muted-foreground))] outline-none"
            />
            <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          </div>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            Para alterar, entre em contato com o{" "}
            <button onClick={() => navigate("/suporte")} className="font-medium text-[hsl(var(--primary))]">
              suporte
            </button>
          </p>
        </div>

        {/* CATEGORIAS */}
        <span className="mt-5 block text-[10px] font-semibold tracking-[2px] text-[hsl(var(--muted-foreground))]">
          CATEGORIAS
        </span>
        <div className="mt-2.5 rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Especialidades</span>
            <button onClick={() => navigate("/categorias")} className="text-[13px] font-medium text-[hsl(var(--primary))]">
              Editar →
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.length > 0 ? (
              categories.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium"
                  style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}
                >
                  <span className="text-sm">{c.icon}</span>
                  {c.name}
                </span>
              ))
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Nenhuma categoria</span>
                <button onClick={() => navigate("/categorias")} className="text-[13px] font-medium text-[hsl(var(--primary))]">
                  + Adicionar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CONTA */}
        <span className="mt-5 block text-[10px] font-semibold tracking-[2px] text-[hsl(var(--muted-foreground))]">
          CONTA
        </span>
        <div className="mt-2.5 rounded-2xl bg-white p-4">
          <div className="flex items-start gap-3">
            {status.icon}
            <div>
              <p className="text-sm font-semibold" style={{ color: status.color }}>
                {status.title}
              </p>
              <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{status.sub}</p>
              {status.action && (
                <button
                  onClick={() => navigate(status.action!.to)}
                  className="mt-2 text-[13px] font-medium text-[hsl(var(--primary))]"
                >
                  {status.action.label}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* SELECT NETWORK BOTTOM SHEET */}
      <AnimatePresence>
        {showSelectSheet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowSelectSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pb-10 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E5E5E5]" />
              <h3 style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
                Qual rede social?
              </h3>
              {availableSocials.map((network) => (
                <button
                  key={network.key}
                  onClick={() => openInputForNetwork(network.key)}
                  className="flex w-full items-center gap-3"
                  style={{ padding: "14px 16px", borderBottom: "1px solid #F7F7F7" }}
                >
                  <SocialCircle network={network} size={36} />
                  <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 15, color: "#000" }}>
                    {network.label}
                  </span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INPUT BOTTOM SHEET */}
      <AnimatePresence>
        {showInputSheet && currentNetwork && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => { setShowInputSheet(false); setEditingNetwork(null); }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pb-10 pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E5E5E5]" />
              <h3 style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 18 }}>
                {currentNetwork.label}
              </h3>
              <p style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 13, color: "#767676", marginTop: 4 }}>
                {currentNetwork.hint}
              </p>
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentNetwork.placeholder}
                style={{
                  width: "100%", height: 52, borderRadius: 12, border: "1px solid #E5E5E5",
                  padding: "0 16px", fontFamily: "Inter", fontSize: 16, outline: "none",
                  marginTop: 16,
                }}
              />
              <button
                onClick={saveSocialInput}
                disabled={!inputValue.trim()}
                className="mt-4 flex w-full items-center justify-center rounded-2xl text-base font-bold text-white disabled:opacity-50"
                style={{ height: 52, background: "#276EF1" }}
              >
                Salvar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerfilPage;
