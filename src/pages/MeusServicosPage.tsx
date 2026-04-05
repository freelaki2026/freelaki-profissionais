import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Info, PencilLine, Trash2, LayoutGrid, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AnimatePresence, motion } from "framer-motion";
import BottomNav from "@/components/dashboard/BottomNav";

interface PricingData {
  id?: string;
  hourly_rate: number;
  daily_rate: number;
}

interface ExtraService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  is_active: boolean | null;
  order_index: number | null;
}

const UNIT_OPTIONS = [
  { value: "unidade", label: "unidade" },
  { value: "vídeo", label: "vídeo" },
  { value: "pack", label: "pack" },
  { value: "carrossel", label: "carrossel" },
  { value: "hora", label: "hora" },
  { value: "diária", label: "diária" },
  { value: "evento", label: "evento" },
];

const MeusServicosPage = () => {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingData>({ hourly_rate: 0, daily_rate: 0 });
  const [extras, setExtras] = useState<ExtraService[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPricing, setSavingPricing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ExtraService | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalDesc, setModalDesc] = useState("");
  const [modalPrice, setModalPrice] = useState("");
  const [modalUnit, setModalUnit] = useState("unidade");
  const [modalActive, setModalActive] = useState(true);
  const [savingModal, setSavingModal] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { navigate("/login"); return; }
    setUserId(session.user.id);

    const [pricingRes, extrasRes] = await Promise.all([
      supabase.from("professional_pricing").select("*").eq("profile_id", session.user.id).maybeSingle(),
      supabase.from("professional_extras").select("*").eq("profile_id", session.user.id).order("order_index"),
    ]);

    if (pricingRes.data) {
      setPricing({
        id: pricingRes.data.id,
        hourly_rate: pricingRes.data.hourly_rate || 0,
        daily_rate: pricingRes.data.daily_rate || 0,
      });
    }
    if (extrasRes.data) setExtras(extrasRes.data as ExtraService[]);
    setLoading(false);
  };

  const savePricing = async () => {
    if (!userId) return;
    setSavingPricing(true);
    const { error } = await supabase.from("professional_pricing").upsert({
      profile_id: userId,
      hourly_rate: pricing.hourly_rate,
      daily_rate: pricing.daily_rate,
    }, { onConflict: "profile_id" });
    setSavingPricing(false);
    if (error) { toast.error("Erro ao salvar valores"); return; }
    toast.success("Valores salvos! ✓");
  };

  const toggleActive = async (extra: ExtraService) => {
    const newVal = !extra.is_active;
    await supabase.from("professional_extras").update({ is_active: newVal }).eq("id", extra.id);
    setExtras(prev => prev.map(e => e.id === extra.id ? { ...e, is_active: newVal } : e));
  };

  const openAddModal = () => {
    setEditingExtra(null);
    setModalName(""); setModalDesc(""); setModalPrice(""); setModalUnit("unidade"); setModalActive(true);
    setModalOpen(true);
  };

  const openEditModal = (extra: ExtraService) => {
    setEditingExtra(extra);
    setModalName(extra.name);
    setModalDesc(extra.description || "");
    setModalPrice(String(extra.price));
    setModalUnit(extra.unit || "unidade");
    setModalActive(extra.is_active ?? true);
    setModalOpen(true);
  };

  const saveModal = async () => {
    if (!userId || !modalName.trim() || !modalPrice.trim()) {
      toast.error("Preencha nome e preço"); return;
    }
    setSavingModal(true);
    const payload = {
      profile_id: userId,
      name: modalName.trim(),
      description: modalDesc.trim() || null,
      price: parseFloat(modalPrice),
      unit: modalUnit,
      is_active: modalActive,
    };

    if (editingExtra) {
      const { error } = await supabase.from("professional_extras").update(payload).eq("id", editingExtra.id);
      if (error) { toast.error("Erro ao atualizar"); setSavingModal(false); return; }
    } else {
      const { error } = await supabase.from("professional_extras").insert({
        ...payload,
        order_index: extras.length + 1,
      });
      if (error) { toast.error("Erro ao adicionar"); setSavingModal(false); return; }
    }
    setSavingModal(false);
    setModalOpen(false);
    toast.success("Serviço salvo! ✓");
    loadData();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from("professional_extras").delete().eq("id", deleteId);
    setExtras(prev => prev.filter(e => e.id !== deleteId));
    setDeleteId(null);
    toast.success("Serviço removido");
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#276EF1] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#000000]">
      {/* Header */}
      <div style={{ padding: "52px 24px 24px", background: "#000000" }} className="relative">
        <button onClick={() => navigate(-1)} className="absolute left-4" style={{ top: 52 }}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <p style={{ fontWeight: 600, fontSize: 17, color: "#FFFFFF", textAlign: "center" }}>Meus Serviços</p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, background: "#F7F7F7", borderRadius: "24px 24px 0 0", padding: "20px 16px 100px", overflowY: "auto" }}>
        {/* Pricing Section */}
        <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600 }}>MINHA HORA DE TRABALHO</p>
        <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 20, marginTop: 10 }}>
          <div style={{ background: "rgba(39,110,241,0.06)", borderRadius: 10, padding: "10px 12px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Info size={14} color="#276EF1" style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#276EF1", lineHeight: 1.4 }}>Este é o valor que os clientes verão ao contratar você por hora.</span>
          </div>

          {/* Hourly */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#000" }}>Valor por hora</span>
            <span style={{ fontWeight: 500, fontSize: 14, color: "#767676" }}>R$</span>
            <input
              type="number"
              value={pricing.hourly_rate || ""}
              onChange={e => setPricing(p => ({ ...p, hourly_rate: parseFloat(e.target.value) || 0 }))}
              placeholder="0,00"
              style={{ width: 120, border: "1px solid #E5E5E5", borderRadius: 10, height: 44, padding: "0 12px", fontWeight: 700, fontSize: 18, color: "#000", textAlign: "right", outline: "none" }}
            />
          </div>

          {/* Daily */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#000" }}>Valor por dia (8h)</span>
            <span style={{ fontWeight: 500, fontSize: 14, color: "#767676" }}>R$</span>
            <input
              type="number"
              value={pricing.daily_rate || ""}
              onChange={e => setPricing(p => ({ ...p, daily_rate: parseFloat(e.target.value) || 0 }))}
              placeholder="0,00"
              style={{ width: 120, border: "1px solid #E5E5E5", borderRadius: 10, height: 44, padding: "0 12px", fontWeight: 700, fontSize: 18, color: "#000", textAlign: "right", outline: "none" }}
            />
          </div>

          <p style={{ fontSize: 11, color: "#767676", marginTop: 8 }}>💡 Sugestão: diária = hora × 6 (desconto de 2h)</p>

          <button
            onClick={savePricing}
            disabled={savingPricing}
            style={{ width: "100%", height: 44, borderRadius: 12, background: "#276EF1", color: "#FFF", fontWeight: 600, fontSize: 14, marginTop: 16, border: "none", cursor: "pointer", opacity: savingPricing ? 0.7 : 1 }}
          >
            {savingPricing ? "Salvando..." : "Salvar valores"}
          </button>
        </div>

        {/* Extras Section */}
        <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600, marginTop: 24 }}>MEU CATÁLOGO</p>
        <p style={{ fontSize: 12, color: "#767676", marginTop: 4 }}>Configure os serviços que você oferece e seus preços.</p>

        <button
          onClick={openAddModal}
          style={{ width: "100%", height: 44, borderRadius: 12, background: "#000", color: "#FFF", fontWeight: 600, fontSize: 14, marginTop: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Plus size={16} /> Adicionar serviço
        </button>

        {extras.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
            <LayoutGrid size={48} color="#E5E5E5" />
            <p style={{ fontWeight: 600, fontSize: 15, color: "#767676", marginTop: 16 }}>Nenhum serviço cadastrado</p>
            <p style={{ fontSize: 13, color: "#767676", textAlign: "center", marginTop: 8 }}>Adicione os serviços que você oferece para que os clientes possam contratar.</p>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            {extras.map(extra => (
              <div
                key={extra.id}
                style={{
                  background: "#FFF", borderRadius: 16, padding: 16, marginBottom: 10,
                  border: "1px solid #E5E5E5", opacity: extra.is_active ? 1 : 0.6,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <Switch
                    checked={extra.is_active ?? true}
                    onCheckedChange={() => toggleActive(extra)}
                    className="mt-0.5"
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#000" }}>{extra.name}</p>
                    {extra.description && (
                      <p style={{ fontSize: 12, color: "#767676", marginTop: 2 }}>{extra.description}</p>
                    )}
                  </div>
                  <button onClick={() => openEditModal(extra)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <PencilLine size={18} color="#767676" />
                  </button>
                  <button onClick={() => setDeleteId(extra.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={18} color="#E53935" />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: "#276EF1" }}>R$ {formatCurrency(extra.price)}/{extra.unit || "unidade"}</span>
                  <span style={{ background: "#F7F7F7", color: "#767676", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 500 }}>{extra.unit || "unidade"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.56)" }}
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50"
              style={{ background: "#FFF", borderRadius: "24px 24px 0 0", padding: 24, maxHeight: "85vh", overflowY: "auto" }}
            >
              <div style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2, margin: "0 auto 20px" }} />
              <p style={{ fontWeight: 700, fontSize: 18, color: "#000" }}>{editingExtra ? "Editar serviço" : "Novo serviço"}</p>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#767676" }}>Nome do serviço *</label>
                <input
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                  placeholder="Ex: SameDay editado com legenda"
                  style={{ width: "100%", height: 44, border: "1px solid #E5E5E5", borderRadius: 10, padding: "0 12px", fontSize: 14, marginTop: 6, outline: "none" }}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#767676" }}>Descrição</label>
                <textarea
                  value={modalDesc}
                  onChange={e => setModalDesc(e.target.value)}
                  placeholder="Descreva brevemente o que inclui..."
                  style={{ width: "100%", minHeight: 70, border: "1px solid #E5E5E5", borderRadius: 10, padding: 12, fontSize: 14, marginTop: 6, outline: "none", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#767676" }}>Preço (R$) *</label>
                  <input
                    type="number"
                    value={modalPrice}
                    onChange={e => setModalPrice(e.target.value)}
                    placeholder="0,00"
                    style={{ width: "100%", height: 44, border: "1px solid #E5E5E5", borderRadius: 10, padding: "0 12px", fontSize: 14, marginTop: 6, outline: "none" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#767676" }}>Unidade</label>
                  <select
                    value={modalUnit}
                    onChange={e => setModalUnit(e.target.value)}
                    style={{ width: "100%", height: 44, border: "1px solid #E5E5E5", borderRadius: 10, padding: "0 12px", fontSize: 14, marginTop: 6, outline: "none", background: "#FFF" }}
                  >
                    {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                <Switch checked={modalActive} onCheckedChange={setModalActive} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Ativo (visível para clientes)</span>
              </div>

              <button
                onClick={saveModal}
                disabled={savingModal}
                style={{ width: "100%", height: 48, borderRadius: 12, background: "#276EF1", color: "#FFF", fontWeight: 600, fontSize: 15, marginTop: 20, border: "none", cursor: "pointer", opacity: savingModal ? 0.7 : 1 }}
              >
                {savingModal ? "Salvando..." : "Salvar serviço"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.56)" }}
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50"
              style={{ background: "#FFF", borderRadius: "24px 24px 0 0", padding: 24 }}
            >
              <div style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2, margin: "0 auto 20px" }} />
              <p style={{ fontWeight: 700, fontSize: 18, color: "#000", textAlign: "center" }}>Remover serviço?</p>
              <p style={{ fontSize: 13, color: "#767676", textAlign: "center", marginTop: 8 }}>Esta ação não pode ser desfeita.</p>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button
                  onClick={() => setDeleteId(null)}
                  style={{ flex: 1, height: 48, borderRadius: 12, background: "#F7F7F7", color: "#000", fontWeight: 600, fontSize: 14, border: "1px solid #E5E5E5", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  style={{ flex: 1, height: 48, borderRadius: 12, background: "#E53935", color: "#FFF", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}
                >
                  Sim, remover
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default MeusServicosPage;
