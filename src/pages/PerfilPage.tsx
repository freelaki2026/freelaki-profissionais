import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Lock,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  email: string;
  avatar_url: string | null;
  approval_status: string | null;
}

interface CategoryChip {
  name: string;
  icon: string | null;
}

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

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: prof }, { data: cats }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone, bio, email, avatar_url, approval_status")
        .eq("id", user.id)
        .single(),
      supabase
        .from("professional_categories")
        .select("category_id, categories(name, icon)")
        .eq("profile_id", user.id),
    ]);

    if (prof) {
      setProfile(prof);
      setFullName(prof.full_name || "");
      setPhone(prof.phone ? phoneMask(prof.phone) : "");
      setBio(prof.bio || "");
      setAvatarPreview(prof.avatar_url);
    }

    if (cats) {
      setCategories(
        cats.map((c: any) => ({
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
    setSaving(true);

    let newAvatarUrl = profile?.avatar_url || null;

    // Upload avatar if changed
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
      })
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
          {/* Name */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">Nome completo</label>
            <input
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setIsDirty(true);
              }}
              className="mt-1 w-full text-sm font-semibold text-foreground outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              placeholder="Seu nome"
            />
          </div>
          <div className="my-3 h-px bg-[#F7F7F7]" />

          {/* Phone */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">Telefone</label>
            <input
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="mt-1 w-full text-sm font-semibold text-foreground outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
          </div>
          <div className="my-3 h-px bg-[#F7F7F7]" />

          {/* Bio */}
          <div className="relative">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">Bio / Apresentação</label>
            <textarea
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setBio(e.target.value);
                  setIsDirty(true);
                }
              }}
              className="mt-1 w-full resize-none text-sm text-foreground outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              style={{ minHeight: 80 }}
              placeholder="Conte um pouco sobre você e sua experiência..."
            />
            <span
              className={`absolute bottom-1 right-0 text-[11px] ${
                bio.length > 180 ? "text-[#E53935]" : "text-[hsl(var(--muted-foreground))]"
              }`}
            >
              {bio.length}/200
            </span>
          </div>
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
            <button
              onClick={() => navigate("/categorias")}
              className="text-[13px] font-medium text-[hsl(var(--primary))]"
            >
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
                <button
                  onClick={() => navigate("/categorias")}
                  className="text-[13px] font-medium text-[hsl(var(--primary))]"
                >
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
    </div>
  );
};

export default PerfilPage;
