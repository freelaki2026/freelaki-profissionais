import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FreelakiButton from "@/components/ui/FreelakiButton";
import { ChevronLeft, Check, Zap } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  slug: string;
}

const CategoriasPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isFromProfile, setIsFromProfile] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, icon, slug")
        .eq("is_active", true)
        .order("order_index");

      if (cats) setCategories(cats);

      if (user) {
        const { data: profCats } = await supabase
          .from("professional_categories")
          .select("category_id")
          .eq("profile_id", user.id);

        if (profCats && profCats.length > 0) {
          const ids = new Set(profCats.map((pc) => pc.category_id!));
          setExistingIds(ids);
          setSelected(ids);
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirm = async () => {
    if (!user || selected.size === 0) return;
    setSaving(true);

    try {
      await supabase
        .from("professional_categories")
        .delete()
        .eq("profile_id", user.id);

      const rows = Array.from(selected).map((category_id) => ({
        profile_id: user.id,
        category_id,
      }));

      const { error } = await supabase
        .from("professional_categories")
        .insert(rows);

      if (error) throw error;

      if (isFromProfile) {
        toast({ title: "Categorias atualizadas!" });
        navigate("/perfil");
      } else {
        toast({ title: "Tudo pronto! Bem-vindo à Freelaki 🎉" });
        navigate("/dashboard");
      }
    } catch {
      toast({ title: "Erro ao salvar categorias.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="px-7 pt-14 pb-8">
        {isFromProfile && (
          <button
            onClick={() => navigate("/perfil")}
            className="mb-4 flex items-center gap-1 text-sm text-white/60"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        )}

        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
          <span className="text-lg font-bold text-white">freelaki</span>
        </div>

        <h1 className="mt-5">
          <span className="block text-4xl font-light text-white">Em que você</span>
          <span className="block text-4xl font-extrabold text-[hsl(var(--primary))]">atua?</span>
        </h1>
        <p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">
          Selecione ao menos uma categoria.
        </p>
      </div>

      {/* CARD */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-1 flex-col rounded-t-[28px] bg-white"
      >
        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-36">
          <p className="text-[11px] font-semibold tracking-[2px] text-[hsl(var(--muted-foreground))]">
            SUAS ESPECIALIDADES
          </p>

          {loading ? (
            <div className="mt-8 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-[10px]">
              {categories.map((cat) => {
                const isSelected = selected.has(cat.id);
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggle(cat.id)}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl p-2 transition-colors ${
                      isSelected
                        ? "border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]"
                        : "border border-[hsl(var(--border))] bg-white"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[hsl(var(--primary))]"
                      >
                        <Check className="h-[10px] w-[10px] text-white" />
                      </motion.div>
                    )}
                    <span className="text-[28px]">{cat.icon || "📦"}</span>
                    <span
                      className={`mt-1.5 text-center text-[11px] leading-tight ${
                        isSelected
                          ? "font-semibold text-[hsl(var(--primary))]"
                          : "font-medium text-foreground"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="fixed inset-x-0 bottom-0 border-t border-[hsl(var(--border))] bg-white px-6 py-4">
          <p className="mb-3 text-center text-xs text-[hsl(var(--muted-foreground))]">
            {selected.size} categoria{selected.size !== 1 ? "s" : ""} selecionada
            {selected.size !== 1 ? "s" : ""}
          </p>
          <FreelakiButton
            onClick={handleConfirm}
            disabled={selected.size === 0}
            loading={saving}
          >
            {isFromProfile ? "Salvar alterações" : "Confirmar →"}
          </FreelakiButton>
        </div>
      </motion.div>
    </div>
  );
};

export default CategoriasPage;
