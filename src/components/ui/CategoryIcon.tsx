import {
  Camera,
  Smartphone,
  Clapperboard,
  Megaphone,
  Sparkles,
  Palette,
  PenLine,
  Mic,
  Mic2,
  Ticket,
  Lightbulb,
  SlidersHorizontal,
  Package,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapeamento centralizado: slug da categoria -> ícone Lucide.
 * Use este componente em qualquer lugar que precise renderizar a categoria
 * de forma consistente entre o app do Profissional e o app do Cliente.
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  fotografo: Camera,
  "videomaker-mobile": Smartphone,
  filmmaker: Clapperboard,
  "social-media": Megaphone,
  storymaker: Sparkles,
  designer: Palette,
  roteirista: PenLine,
  entrevistador: Mic,
  "mestre-de-cerimonia": Mic2,
  "recepcionista-eventos": Ticket,
  "operador-de-luz": Lightbulb,
  "operador-de-som": SlidersHorizontal,
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
