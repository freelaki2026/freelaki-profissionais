import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const maskCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

const inputClass =
  "w-full h-[52px] rounded-xl border border-[#E5E5E5] bg-white px-4 text-[15px] font-medium text-foreground outline-none focus:border-[#276EF1] transition-colors";
const labelClass = "text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block";

const EnderecoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAddress = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (data) {
      setExistingId(data.id);
      setCep(data.cep ? maskCep(data.cep) : "");
      setStreet(data.street || "");
      setNumber(data.number || "");
      setComplement(data.complement || "");
      setNeighborhood(data.neighborhood || "");
      setCity(data.city || "");
      setState(data.state || "");
    }
  }, [user]);

  useEffect(() => { loadAddress(); }, [loadAddress]);

  const lookupCep = async (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast({ title: "CEP não encontrado. Preencha manualmente.", variant: "destructive" });
      } else {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
        toast({ title: "Endereço encontrado! ✓" });
      }
    } catch {
      toast({ title: "CEP não encontrado. Preencha manualmente.", variant: "destructive" });
    }
    setFetchingCep(false);
  };

  const handleCepChange = (v: string) => {
    const masked = maskCep(v);
    setCep(masked);
    if (masked.replace(/\D/g, "").length === 8) lookupCep(masked);
  };

  const isValid = street && number && neighborhood && city && state;

  const handleSave = async () => {
    if (!user || !isValid) return;
    setSaving(true);
    const payload = {
      profile_id: user.id,
      cep: cep.replace(/\D/g, ""),
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    };

    if (existingId) {
      await supabase.from("addresses").update(payload).eq("id", existingId);
    } else {
      await supabase.from("addresses").insert(payload);
    }

    toast({ title: "Endereço salvo! ✓" });
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 pt-[52px] pb-6">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <span className="text-[17px] font-semibold text-white">Endereço</span>
        <div className="w-6" />
      </div>

      {/* BODY */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 rounded-t-3xl bg-[#F7F7F7] px-4 pb-10 pt-5 overflow-y-auto"
      >
        <p className="mb-2.5 text-[10px] font-semibold tracking-[2px] text-[hsl(var(--muted-foreground))]">
          SEU ENDEREÇO
        </p>

        <div className="rounded-2xl bg-white p-5">
          {/* CEP */}
          <div className="mb-4">
            <label className={labelClass}>CEP</label>
            <div className="relative">
              <input
                className={inputClass}
                placeholder="00000-000"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
              />
              {fetchingCep && (
                <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[hsl(var(--primary))]" />
              )}
            </div>
          </div>

          {/* Rua */}
          <div className="mb-4">
            <label className={labelClass}>Rua / Logradouro</label>
            <input className={inputClass} value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>

          {/* Número + Complemento */}
          <div className="mb-4 flex gap-2">
            <div className="w-[30%]">
              <label className={labelClass}>Número</label>
              <input className={inputClass} value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Complemento (opcional)</label>
              <input className={inputClass} value={complement} onChange={(e) => setComplement(e.target.value)} />
            </div>
          </div>

          {/* Bairro */}
          <div className="mb-4">
            <label className={labelClass}>Bairro</label>
            <input className={inputClass} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </div>

          {/* Cidade */}
          <div className="mb-4">
            <label className={labelClass}>Cidade</label>
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          {/* Estado */}
          <div className="mb-0">
            <label className={labelClass}>Estado</label>
            <select
              className={inputClass + " appearance-none bg-white"}
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">Selecione</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="mt-6 flex h-[54px] w-full items-center justify-center rounded-[14px] text-base font-bold text-white transition-opacity disabled:opacity-40"
          style={{ background: "#276EF1" }}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar endereço"}
        </button>
      </motion.div>
    </div>
  );
};

export default EnderecoPage;
