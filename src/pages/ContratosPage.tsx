import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, FileText, Lock, Zap, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import FreelakiButton from "@/components/ui/FreelakiButton";
import BottomNav from "@/components/dashboard/BottomNav";

type TabKey = "assinar" | "assinados" | "todos";

interface ContractRow {
  id: string;
  opportunity_id: string | null;
  client_id: string | null;
  professional_id: string | null;
  professional_signed: boolean | null;
  professional_signed_at: string | null;
  professional_ip: string | null;
  client_signed: boolean | null;
  client_signed_at: string | null;
  status: string | null;
  contract_text: string | null;
  contract_hash: string | null;
  pdf_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ContractItem extends ContractRow {
  job_title: string;
  budget: number | null;
  total_amount: number | null;
  scheduled_at: string | null;
  location_address: string | null;
  client_name: string;
  client_avatar: string | null;
  pro_name: string;
  category_name: string;
  category_icon: string | null;
  isMock?: boolean;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: "assinar", label: "Assinar" },
  { key: "assinados", label: "Assinados" },
  { key: "todos", label: "Todos" },
];

const emptyTexts: Record<TabKey, string> = {
  assinar: "Contratos pendentes de assinatura aparecerão aqui.",
  assinados: "Seus contratos assinados aparecerão aqui.",
  todos: "Você ainda não tem contratos.",
};

const statusBadge = (status: string | null, clientSigned: boolean | null, profSigned: boolean | null) => {
  if (status === "cancelled") return { label: "Cancelado", bg: "#F7F7F7", color: "#767676" };
  if (status === "both_signed") return { label: "Assinado ✓", bg: "#E8F5E9", color: "#2E7D32" };
  if (clientSigned && !profSigned) return { label: "Assine agora ✍️", bg: "#E3F2FD", color: "#1565C0" };
  if (profSigned && !clientSigned) return { label: "Aguardando cliente", bg: "#FFF3E0", color: "#B45309" };
  return { label: "Pendente", bg: "#FFF3E0", color: "#B45309" };
};

const buildMockContract = (userName: string): ContractItem => {
  const today = new Date();
  const todayStr = format(today, "dd/MM/yyyy");
  return {
    id: "mock-signed-1",
    opportunity_id: null,
    client_id: null,
    professional_id: null,
    professional_signed: true,
    professional_signed_at: today.toISOString(),
    professional_ip: "189.40.xxx.xxx",
    client_signed: true,
    client_signed_at: today.toISOString(),
    status: "both_signed",
    contract_text: `CONTRATANTE: Marina Souza\n\nCONTRATADO: ${userName}\n\nSERVIÇO: Cobertura fotográfica de casamento\n\nLOCAL: Villa Real Eventos — Alphaville, SP\n\nDATA: ${todayStr}\n\nVALOR: R$ 850,00\n\nO CONTRATADO se compromete a realizar cobertura fotográfica completa do evento.`,
    contract_hash: "a3f8c29d1b4e7f0612345678abcdef90",
    pdf_url: null,
    created_at: today.toISOString(),
    updated_at: today.toISOString(),
    job_title: "Cobertura de Casamento - Villa Real",
    budget: 850,
    total_amount: 909.5,
    scheduled_at: today.toISOString(),
    location_address: "Villa Real Eventos — Alphaville, SP",
    client_name: "Marina Souza",
    client_avatar: null,
    pro_name: userName,
    category_name: "Fotógrafo",
    category_icon: "📷",
    isMock: true,
  };
};

const ContratosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("assinar");
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [userName, setUserName] = useState("Profissional");

  // Sign modal state
  const [signName, setSignName] = useState("");
  const [signChecked, setSignChecked] = useState(false);
  const [signNameError, setSignNameError] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => {
      if (data?.full_name) setUserName(data.full_name);
    });
  }, [user]);

  const fetchContracts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: rawContracts, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !rawContracts) {
      setContracts([]);
      setLoading(false);
      return;
    }

    const oppIds = [...new Set(rawContracts.map((c) => c.opportunity_id).filter(Boolean))] as string[];
    const clientIds = [...new Set(rawContracts.map((c) => c.client_id).filter(Boolean))] as string[];

    const [oppRes, clientRes] = await Promise.all([
      oppIds.length > 0 ? supabase.from("opportunities").select("id, title, budget, total_amount, scheduled_at, location_address, category_id").in("id", oppIds) : { data: [] },
      clientIds.length > 0 ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", clientIds) : { data: [] },
    ]);

    const opps = (oppRes.data || []) as any[];
    const clients = (clientRes.data || []) as any[];

    const catIds = [...new Set(opps.map((o) => o.category_id).filter(Boolean))];
    const catRes = catIds.length > 0 ? await supabase.from("categories").select("id, name, icon").in("id", catIds) : { data: [] };
    const cats = (catRes.data || []) as any[];

    const oppMap = Object.fromEntries(opps.map((o) => [o.id, o]));
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
    const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));

    const enriched: ContractItem[] = rawContracts.map((ct) => {
      const opp = oppMap[ct.opportunity_id || ""] || {};
      const client = clientMap[ct.client_id || ""] || {};
      const cat = catMap[opp.category_id || ""] || {};
      return {
        ...ct,
        job_title: opp.title || "Serviço",
        budget: opp.budget,
        total_amount: opp.total_amount,
        scheduled_at: opp.scheduled_at,
        location_address: opp.location_address,
        client_name: client.full_name || "Cliente",
        client_avatar: client.avatar_url,
        pro_name: userName,
        category_name: cat.name || "",
        category_icon: cat.icon || "",
      };
    });

    setContracts(enriched);
    setLoading(false);
  }, [user, userName]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const mockContract = buildMockContract(userName);

  const filtered = (() => {
    const real = contracts.filter((c) => {
      if (activeTab === "assinar") return !c.professional_signed && c.status !== "both_signed" && c.status !== "cancelled";
      if (activeTab === "assinados") return c.status === "both_signed";
      return true;
    });
    if (activeTab === "assinados" || activeTab === "todos") {
      return [...real, mockContract];
    }
    return real;
  })();

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatBudget = (v: number | null) => {
    if (v == null) return "—";
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const openSignModal = (contract: ContractItem) => {
    setSelectedContract(contract);
    setShowSignModal(true);
    setSignName("");
    setSignChecked(false);
    setSignNameError("");
  };

  const validateSignName = (name: string) => {
    if (!name.trim()) {
      setSignNameError("");
      return false;
    }
    if (name.trim().toLowerCase() !== userName.trim().toLowerCase()) {
      setSignNameError("Nome não confere com o cadastro.");
      return false;
    }
    setSignNameError("");
    return true;
  };

  const isSignValid = signName.trim().toLowerCase() === userName.trim().toLowerCase() && signChecked;

  const handleSign = async (contract: ContractItem) => {
    if (!isSignValid) return;
    setSigning(true);

    try {
      // Get IP
      const ip = await fetch("https://api.ipify.org?format=json")
        .then((r) => r.json())
        .then((d) => d.ip)
        .catch(() => "unknown");

      const { data, error } = await supabase.rpc("sign_contract", {
        p_contract_id: contract.id,
        p_signer_type: "professional",
        p_ip_address: ip,
        p_user_agent: navigator.userAgent,
      });

      const result = typeof data === "string" ? JSON.parse(data) : data;

      if (error || !result?.success) {
        toast.error(result?.error === "unauthorized" ? "Você não tem permissão." : "Erro ao assinar contrato.");
        setSigning(false);
        return;
      }

      toast.success("✅ Contrato assinado com sucesso!");
      if (result.status === "both_signed") {
        setTimeout(() => toast.success("🎉 Contrato assinado! Aguarde o cliente confirmar o início."), 800);
      }

      setShowSignModal(false);
      setSelectedContract(null);
      fetchContracts();
    } catch {
      toast.error("Erro ao assinar contrato.");
    }
    setSigning(false);
  };

  const needsSign = (c: ContractItem) => !c.professional_signed && c.status !== "both_signed" && c.status !== "cancelled";

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#000" }}>
      {/* Header */}
      <div style={{ padding: "52px 24px 24px" }} className="relative flex items-center">
        <button onClick={() => navigate(-1)} className="z-10">
          <ArrowLeft size={24} color="#FFF" />
        </button>
        <span className="absolute inset-x-0 text-center" style={{ fontWeight: 600, fontSize: 17, color: "#FFF" }}>
          Contratos
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col" style={{ background: "#F7F7F7", borderRadius: "24px 24px 0 0" }}>
        {/* Tabs */}
        <div className="flex" style={{ background: "#FFF", padding: "0 20px", borderBottom: "1px solid #E5E5E5" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex-1 flex items-center justify-center relative"
              style={{ height: 48, fontSize: 14, fontWeight: activeTab === t.key ? 600 : 500, color: activeTab === t.key ? "#276EF1" : "#767676" }}
            >
              {t.label}
              {activeTab === t.key && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: 2, background: "#276EF1", borderRadius: 1 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pb-24" style={{ padding: 16 }}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl" style={{ height: 140, background: "#E5E5E5" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FileText size={32} color="#276EF1" />
              <p style={{ fontWeight: 600, fontSize: 15, color: "#000", marginTop: 12 }}>Nenhum contrato aqui</p>
              <p style={{ fontSize: 13, color: "#767676", marginTop: 4, textAlign: "center", padding: "0 20px" }}>
                {emptyTexts[activeTab]}
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const badge = statusBadge(c.status, c.client_signed, c.professional_signed);
              return (
                <motion.div
                  key={c.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedContract(c)}
                  className="mb-3 cursor-pointer"
                  style={{ background: "#FFF", borderRadius: 16, padding: 16, border: "1px solid #E5E5E5" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {c.category_icon && <span style={{ fontSize: 14 }}>{c.category_icon}</span>}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#276EF1" }}>{c.category_name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "#000", marginTop: 8 }}>{c.job_title}</p>
                  <p style={{ fontSize: 13, color: "#767676", marginTop: 4 }}>{c.client_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#2E7D32" }}>💰 {formatBudget(c.total_amount || c.budget)}</span>
                    {c.scheduled_at && <span style={{ fontSize: 13, color: "#767676" }}>📅 {formatDate(c.scheduled_at)}</span>}
                  </div>

                  {/* Signed receipt inline */}
                  {c.professional_signed && !c.isMock && (
                    <div style={{ marginTop: 10, background: "#F0FFF4", borderRadius: 10, padding: 10 }}>
                      <p style={{ fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>
                        ✓ Assinado digitalmente por {c.pro_name || userName}
                      </p>
                      {c.professional_signed_at && (
                        <p style={{ fontSize: 11, color: "#767676", marginTop: 2 }}>📅 {formatDateTime(c.professional_signed_at)}</p>
                      )}
                      {c.professional_ip && (
                        <p style={{ fontSize: 11, color: "#767676", marginTop: 1 }}>🔒 IP: {(c.professional_ip || "").slice(0, 10)}...</p>
                      )}
                      {c.contract_hash && (
                        <p style={{ fontSize: 11, color: "#767676", marginTop: 1 }}>#️⃣ Hash: {c.contract_hash.slice(0, 16)}...</p>
                      )}
                    </div>
                  )}

                  {!c.isMock && needsSign(c) && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #F7F7F7", paddingTop: 12 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openSignModal(c); }}
                        className="w-full"
                        style={{ background: "#276EF1", color: "#FFF", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 14 }}
                      >
                        Assinar contrato →
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Sheet - Contract Detail */}
      <AnimatePresence>
        {selectedContract && !showSignModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContract(null)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.56)" }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
              style={{ background: "#FFF", borderRadius: "24px 24px 0 0", padding: 24, maxHeight: "85vh" }}
            >
              <div className="flex justify-center mb-5">
                <div style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2 }} />
              </div>

              {(() => {
                const c = selectedContract;
                const badge = statusBadge(c.status, c.client_signed, c.professional_signed);

                return (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <h2 style={{ fontWeight: 700, fontSize: 20, color: "#000", marginTop: 8 }}>{c.job_title}</h2>

                    <div className="mt-3 space-y-1">
                      <p style={{ fontSize: 13, color: "#767676" }}>👤 {c.client_name}</p>
                      <p style={{ fontSize: 13, color: "#2E7D32", fontWeight: 600 }}>💰 {formatBudget(c.total_amount || c.budget)}</p>
                      {c.scheduled_at && <p style={{ fontSize: 13, color: "#767676" }}>📅 {formatDate(c.scheduled_at)}</p>}
                      {c.location_address && <p style={{ fontSize: 13, color: "#767676" }}>📍 {c.location_address}</p>}
                    </div>

                    <div style={{ height: 1, background: "#E5E5E5", margin: "16px 0" }} />

                    {/* Contract header */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap size={16} fill="#000" color="#000" />
                        <span style={{ fontWeight: 800, fontSize: 18, color: "#000" }}>FREELAKI</span>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: "#767676", marginTop: 2 }}>
                        CONTRATO DE PRESTAÇÃO DE SERVIÇOS
                      </p>
                      <div style={{ height: 1, background: "#E5E5E5", margin: "12px 0" }} />
                    </div>

                    {/* Contract body */}
                    {c.contract_text ? (
                      <div className="mt-2">
                        {c.contract_text.split("\n").map((line, i) => (
                          <p key={i} style={{ fontSize: 13, color: "#767676", lineHeight: 1.8 }}>
                            {line || "\u00A0"}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: "#767676", marginTop: 8 }}>Texto do contrato não disponível.</p>
                    )}

                    {/* Signed receipt */}
                    {c.professional_signed && (
                      <div style={{ marginTop: 16, background: "#F0FFF4", borderRadius: 12, padding: 14 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle size={16} color="#2E7D32" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#2E7D32" }}>Assinado digitalmente</span>
                        </div>
                        <p style={{ fontSize: 11, color: "#767676" }}>✓ Assinado por {c.pro_name || userName}</p>
                        {c.professional_signed_at && (
                          <p style={{ fontSize: 11, color: "#767676", marginTop: 2 }}>📅 {formatDateTime(c.professional_signed_at)}</p>
                        )}
                        {c.professional_ip && (
                          <p style={{ fontSize: 11, color: "#767676", marginTop: 1 }}>🔒 IP registrado: {(c.professional_ip || "").slice(0, 10)}...</p>
                        )}
                        {c.contract_hash && (
                          <p style={{ fontSize: 11, color: "#767676", marginTop: 1 }}>#️⃣ Hash: {c.contract_hash.slice(0, 16)}...</p>
                        )}
                      </div>
                    )}

                    {/* Read-only notice for signed/mock */}
                    {(c.isMock || c.status === "both_signed") && (
                      <div className="flex items-center gap-2" style={{ background: "#F7F7F7", borderRadius: 12, padding: 12, marginTop: 16 }}>
                        <Lock size={14} color="#767676" className="shrink-0" />
                        <span style={{ fontSize: 12, color: "#767676" }}>
                          Contrato somente para visualização. Não é possível editar.
                        </span>
                      </div>
                    )}

                    {/* Sign button */}
                    {!c.isMock && needsSign(c) && (
                      <div style={{ marginTop: 20 }}>
                        <FreelakiButton onClick={() => openSignModal(c)}>
                          Assinar contrato →
                        </FreelakiButton>
                      </div>
                    )}

                    {/* Download PDF */}
                    {c.pdf_url && (
                      <div style={{ marginTop: 12 }}>
                        <FreelakiButton variant="secondary" onClick={() => window.open(c.pdf_url!, "_blank")}>
                          Baixar PDF
                        </FreelakiButton>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sign Modal */}
      <AnimatePresence>
        {showSignModal && selectedContract && !selectedContract.isMock && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignModal(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.56)" }}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed z-50 left-0 right-0 bottom-0 overflow-y-auto"
              style={{ background: "#FFF", borderRadius: "24px 24px 0 0", padding: 24, maxHeight: "90vh" }}
            >
              <div className="flex justify-center mb-4">
                <div style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2 }} />
              </div>

              <div className="text-center">
                <span style={{ fontSize: 32 }}>✍️</span>
                <h3 style={{ fontWeight: 700, fontSize: 20, color: "#000", marginTop: 8 }}>
                  Assinar contrato digitalmente
                </h3>
              </div>

              {/* Summary */}
              <div style={{ background: "#F7F7F7", borderRadius: 12, padding: 14, marginTop: 20 }}>
                <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600, marginBottom: 8 }}>RESUMO</p>
                <div className="space-y-1">
                  <p style={{ fontSize: 13, color: "#000" }}>
                    <span style={{ color: "#767676" }}>Serviço: </span>{selectedContract.job_title}
                  </p>
                  {selectedContract.scheduled_at && (
                    <p style={{ fontSize: 13, color: "#000" }}>
                      <span style={{ color: "#767676" }}>Data: </span>{formatDateTime(selectedContract.scheduled_at)}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: "#000" }}>
                    <span style={{ color: "#767676" }}>Valor total: </span>
                    <span style={{ fontWeight: 600, color: "#2E7D32" }}>{formatBudget(selectedContract.total_amount || selectedContract.budget)}</span>
                  </p>
                  <p style={{ fontSize: 13, color: "#000" }}>
                    <span style={{ color: "#767676" }}>Contratante: </span>{selectedContract.client_name}
                  </p>
                  <p style={{ fontSize: 13, color: "#000" }}>
                    <span style={{ color: "#767676" }}>Contratado: </span>{userName}
                  </p>
                </div>
              </div>

              {/* Name input */}
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#000", display: "block", marginBottom: 8 }}>
                  Digite seu nome completo exatamente como cadastrado:
                </label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={signName}
                  onChange={(e) => {
                    setSignName(e.target.value);
                    validateSignName(e.target.value);
                  }}
                  style={{
                    width: "100%",
                    height: 48,
                    borderRadius: 12,
                    border: `1.5px solid ${signNameError ? "#E53935" : "#E5E5E5"}`,
                    padding: "0 14px",
                    fontSize: 15,
                    color: "#000",
                    background: "#FFF",
                    outline: "none",
                  }}
                />
                {signNameError && (
                  <p style={{ fontSize: 12, color: "#E53935", marginTop: 4 }}>{signNameError}</p>
                )}
              </div>

              {/* Checkbox */}
              <div style={{ marginTop: 16 }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signChecked}
                    onChange={(e) => setSignChecked(e.target.checked)}
                    style={{ marginTop: 3, width: 18, height: 18, accentColor: "#276EF1" }}
                  />
                  <span style={{ fontSize: 13, color: "#767676", lineHeight: 1.5 }}>
                    Declaro que li e concordo com todos os termos deste contrato, estando ciente de que esta assinatura digital possui validade jurídica.
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  disabled={!isSignValid || signing}
                  onClick={() => handleSign(selectedContract)}
                  className="w-full flex items-center justify-center"
                  style={{
                    height: 52,
                    borderRadius: 14,
                    background: isSignValid ? "#276EF1" : "#E5E5E5",
                    color: isSignValid ? "#FFF" : "#767676",
                    fontWeight: 700,
                    fontSize: 15,
                    opacity: signing ? 0.7 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {signing ? "Assinando..." : "Confirmar assinatura →"}
                </button>
                <button
                  onClick={() => setShowSignModal(false)}
                  className="w-full"
                  style={{
                    height: 48,
                    borderRadius: 12,
                    background: "#F7F7F7",
                    color: "#000",
                    fontWeight: 600,
                    fontSize: 14,
                    border: "1px solid #E5E5E5",
                  }}
                >
                  Cancelar
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

export default ContratosPage;
