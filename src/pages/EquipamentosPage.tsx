import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Plus, Trash2, Wrench, X, Camera, Mic, Lightbulb,
  Smartphone, Laptop, Package, Zap,
} from "lucide-react";
import { toast } from "sonner";
import FreelakiButton from "@/components/ui/FreelakiButton";
import BottomNav from "@/components/dashboard/BottomNav";

const MAX_EQUIPMENTS = 10;

const CATEGORIES = [
  { value: "camera", label: "Câmera", icon: Camera },
  { value: "audio", label: "Áudio", icon: Mic },
  { value: "lighting", label: "Iluminação", icon: Lightbulb },
  { value: "smartphone", label: "Smartphone", icon: Smartphone },
  { value: "computer", label: "Computador", icon: Laptop },
  { value: "accessory", label: "Acessório", icon: Package },
  { value: "other", label: "Outro", icon: Wrench },
];

const getCategoryMeta = (value: string | null) => {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
};

interface Equipment {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  order_index: number;
}

const EquipamentosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("camera");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_equipments")
      .select("*")
      .eq("profile_id", user.id)
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        if (data) setItems(data as Equipment[]);
        setLoading(false);
      });
  }, [user]);

  const resetForm = () => {
    setName("");
    setCategory("camera");
    setDescription("");
  };

  const openForm = () => {
    if (items.length >= MAX_EQUIPMENTS) {
      toast.error(`Máximo de ${MAX_EQUIPMENTS} equipamentos atingido`);
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Informe o nome do equipamento");
      return;
    }
    if (trimmed.length > 80) {
      toast.error("Nome deve ter no máximo 80 caracteres");
      return;
    }
    if (description.length > 200) {
      toast.error("Descrição deve ter no máximo 200 caracteres");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("professional_equipments")
      .insert({
        profile_id: user.id,
        name: trimmed,
        category,
        description: description.trim() || null,
        order_index: items.length,
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar equipamento");
      return;
    }
    if (data) {
      setItems((prev) => [...prev, data as Equipment]);
      toast.success("Equipamento adicionado!");
      setShowForm(false);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("professional_equipments").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Removido");
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Header */}
      <div className="flex items-center px-6 pb-5" style={{ paddingTop: 52 }}>
        <button onClick={() => navigate(-1)} className="z-10">
          <ArrowLeft size={24} color="#FFFFFF" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-white -ml-6">Meus Equipamentos</h1>
        <div className="w-6" />
      </div>

      {/* Body */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 rounded-t-3xl bg-[#F7F7F7] pb-24"
      >
        <div className="px-6 pt-6">
          {/* Hero info */}
          <div className="rounded-2xl bg-white border border-[#E8E8E8] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#276EF1]/10">
                <Wrench size={20} color="#276EF1" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-foreground">Mostre suas ferramentas</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#767676]">
                  Cadastre os equipamentos que você usa nos seus serviços. Isso aparece no seu perfil público
                  e ajuda o cliente a confiar mais no seu trabalho.
                </p>
              </div>
            </div>
          </div>

          {/* Counter */}
          <div className="mt-5 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">
              {items.length} {items.length === 1 ? "equipamento" : "equipamentos"}
            </span>
            <span className="text-[12px] text-[#767676]">{items.length}/{MAX_EQUIPMENTS}</span>
          </div>

          {/* List */}
          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="py-6 text-center text-[13px] text-[#767676]">Carregando...</p>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#E0E0E0] bg-white p-8 text-center">
                <Wrench size={28} className="mx-auto text-[#C4C4C4]" />
                <p className="mt-3 text-[14px] font-medium text-foreground">Nenhum equipamento ainda</p>
                <p className="mt-1 text-[12px] text-[#767676]">
                  Toque em "Adicionar" para cadastrar seu primeiro
                </p>
              </div>
            ) : (
              items.map((item) => {
                const meta = getCategoryMeta(item.category);
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-2xl bg-white border border-[#E8E8E8] p-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#276EF1]/10">
                      <Icon size={20} color="#276EF1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[14px] font-semibold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-[#767676]">
                        {meta.label}
                        {item.description ? ` · ${item.description}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#E53935] hover:bg-red-50"
                      aria-label="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Add button */}
          {items.length < MAX_EQUIPMENTS && (
            <button
              onClick={openForm}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#276EF1]/40 bg-[#276EF1]/5 py-3.5 text-[14px] font-semibold text-[#276EF1]"
            >
              <Plus size={18} />
              Adicionar equipamento
            </button>
          )}
        </div>
      </motion.div>

      <BottomNav />

      {/* Form Bottom Sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setShowForm(false)}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.56)" }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col"
              style={{ background: "#FFF", borderRadius: "24px 24px 0 0", padding: "20px 24px 28px", maxHeight: "88vh" }}
            >
              <div className="mx-auto" style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2, marginBottom: 18 }} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-[#276EF1]" />
                  <p className="text-[18px] font-bold text-foreground">Novo equipamento</p>
                </div>
                <button onClick={() => !saving && setShowForm(false)}>
                  <X size={20} className="text-foreground/40" />
                </button>
              </div>

              <div className="mt-5 overflow-y-auto">
                {/* Name */}
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#767676]">
                  Nome do equipamento *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: iPhone 17 Pro, Sony A7 IV"
                  maxLength={80}
                  className="mt-2 h-[52px] w-full rounded-xl border border-[#E0E0E0] bg-white px-4 text-[15px] text-foreground placeholder:text-[#B0B0B0] focus:border-[#276EF1] focus:outline-none"
                />
                <p className="mt-1 text-right text-[11px] text-[#B0B0B0]">{name.length}/80</p>

                {/* Category */}
                <label className="mt-3 block text-[12px] font-semibold uppercase tracking-wider text-[#767676]">
                  Categoria
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() => setCategory(c.value)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 transition-all ${
                          active
                            ? "border-[#276EF1] bg-[#276EF1]/10"
                            : "border-[#E0E0E0] bg-white"
                        }`}
                      >
                        <Icon size={18} color={active ? "#276EF1" : "#767676"} />
                        <span className={`text-[11px] font-medium ${active ? "text-[#276EF1]" : "text-[#767676]"}`}>
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Description */}
                <label className="mt-4 block text-[12px] font-semibold uppercase tracking-wider text-[#767676]">
                  Descrição (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: 24MP, lente 50mm f/1.8"
                  maxLength={200}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-[14px] text-foreground placeholder:text-[#B0B0B0] focus:border-[#276EF1] focus:outline-none resize-none"
                />
                <p className="mt-1 text-right text-[11px] text-[#B0B0B0]">{description.length}/200</p>
              </div>

              <div className="mt-4">
                <FreelakiButton onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
                  {saving ? "Salvando..." : "Adicionar"}
                </FreelakiButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EquipamentosPage;
