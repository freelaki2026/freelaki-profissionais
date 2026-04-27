import {
  Video,
  Clapperboard,
  Sparkles,
  Megaphone,
  Smartphone,
  Palette,
  Scissors,
  Wand2,
  Package,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapeamento centralizado: slug da categoria -> ícone Lucide.
 *
 * Use este componente em qualquer lugar que precise renderizar a categoria
 * de forma consistente entre o app do Profissional e o app do Cliente.
 *
 * Os 8 slugs abaixo refletem exatamente as categorias ativas na tabela
 * `categories` do Supabase. Se uma categoria desconhecida chegar (ex.: dado
 * legado), o componente renderiza o ícone fallback `Package`, evitando crashes.
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  videomaker: Video,
  filmmaker: Clapperboard,
  storymaker: Sparkles,
  "social-media": Megaphone,
  "videomaker-mobile": Smartphone,
  designer: Palette,
  "editor-de-video": Scissors,
  "editor-de-video-ia": Wand2,
};

interface CategoryIconProps {
  slug?: string | null;
  /** Fallback: se não houver slug, tenta inferir pelo nome (lowercase, sem acentos) */
  name?: string | null;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

export function getCategoryIcon(slug?: string | null, name?: string | null): LucideIcon {
  if (slug && CATEGORY_ICON_MAP[slug]) return CATEGORY_ICON_MAP[slug];
  if (name) {
    const key = normalize(name);
    if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key];
    // Heurística simples para variantes textuais comuns
    if (key.includes("ia") && key.includes("editor")) return Wand2;
    if (key.includes("editor")) return Scissors;
  }
  return Package;
}

export const CategoryIcon = ({
  slug,
  name,
  size = 24,
  className,
  strokeWidth = 2,
}: CategoryIconProps) => {
  const Icon = getCategoryIcon(slug, name);
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
};

export default CategoryIcon;
