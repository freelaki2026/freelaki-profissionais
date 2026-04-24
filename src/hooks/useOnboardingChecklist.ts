import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ChecklistItem {
  key:
    | "full_name"
    | "phone"
    | "address"
    | "category"
    | "equipment"
    | "social"
    | "documents"
    | "bank";
  label: string;
  done: boolean;
  route: string;
}

export interface OnboardingChecklist {
  loading: boolean;
  items: ChecklistItem[];
  pending: ChecklistItem[];
  isComplete: boolean;
  isApproved: boolean;
  /** Pode aceitar oportunidades / ficar online */
  canAcceptWork: boolean;
  refresh: () => void;
}

const SOCIAL_KEYS = [
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "behance",
  "dribbble",
  "figma",
  "github",
  "vimeo",
  "twitter",
  "pinterest",
  "website",
] as const;

export function useOnboardingChecklist(): OnboardingChecklist {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isApproved, setIsApproved] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [
      { data: profile },
      { data: address },
      { data: cats },
      { data: equips },
      { data: bank },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, phone, is_approved, instagram, tiktok, youtube, linkedin, behance, dribbble, figma, github, vimeo, twitter, pinterest, website"
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("addresses")
        .select("street, number, city, cep")
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase
        .from("professional_categories")
        .select("id")
        .eq("profile_id", user.id)
        .limit(1),
      supabase
        .from("professional_equipments")
        .select("id")
        .eq("profile_id", user.id)
        .limit(1),
      supabase
        .from("bank_accounts")
        .select("id")
        .eq("profile_id", user.id)
        .limit(1),
    ]);

    const p = (profile ?? {}) as any;

    // Nome completo: pelo menos 2 palavras com 2+ letras cada
    const nameParts = (p.full_name ?? "")
      .trim()
      .split(/\s+/)
      .filter((part: string) => part.length >= 2);
    const fullNameOk = nameParts.length >= 2;

    // Telefone: 11 dígitos (DDD + 9 dígitos)
    const phoneDigits = (p.phone ?? "").replace(/\D/g, "");
    const phoneOk = phoneDigits.length === 11;

    // Endereço-base: rua + número + cidade + cep
    const addressOk = !!(
      address?.street &&
      address?.number &&
      address?.city &&
      address?.cep
    );

    const categoryOk = (cats?.length ?? 0) > 0;
    const equipmentOk = (equips?.length ?? 0) > 0;
    const socialOk = SOCIAL_KEYS.some(
      (k) => typeof p[k] === "string" && p[k].trim().length > 0
    );
    const bankOk = (bank?.length ?? 0) > 0;
    const docsOk = !!p.is_approved;

    setIsApproved(!!p.is_approved);

    const list: ChecklistItem[] = [
      { key: "full_name", label: "Nome completo (nome e sobrenome)", done: fullNameOk, route: "/perfil" },
      { key: "phone", label: "Telefone com DDD", done: phoneOk, route: "/perfil" },
      { key: "address", label: "Endereço-base cadastrado", done: addressOk, route: "/endereco" },
      { key: "category", label: "Pelo menos 1 categoria", done: categoryOk, route: "/categorias" },
      { key: "equipment", label: "Pelo menos 1 equipamento", done: equipmentOk, route: "/equipamentos" },
      { key: "social", label: "Pelo menos 1 rede social ou portfólio", done: socialOk, route: "/perfil" },
      { key: "documents", label: "Documentos aprovados", done: docsOk, route: "/documentos" },
      { key: "bank", label: "Dados bancários cadastrados", done: bankOk, route: "/dados-bancarios" },
    ];

    setItems(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = items.filter((i) => !i.done);
  const isComplete = items.length > 0 && pending.length === 0;
  const canAcceptWork = isComplete && isApproved;

  return {
    loading,
    items,
    pending,
    isComplete,
    isApproved,
    canAcceptWork,
    refresh: load,
  };
}
