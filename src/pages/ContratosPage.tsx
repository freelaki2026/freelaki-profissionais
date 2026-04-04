import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, FileText, X, Lock, Zap } from "lucide-react";
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
  client_signed: boolean | null;
  client_signed_at: string | null;
  status: string | null;
  contract_text: string | null;
  pdf_url: string | null;
  created_at: string | null;
  sign_token_professional: string | null;
  sign_token_client: string | null;
  updated_at: string | null;
}

interface ContractItem extends ContractRow {
  job_title: string;
  budget: number | null;
  scheduled_at: string | null;
  location_address: string | null;
  client_name: string;
  client_avatar: string | null;
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
  return { label: "Aguardando cliente", bg: "#FFF3E0", color: "#B45309" };
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
    client_signed: true,
    client_signed_at: today.toISOString(),
    status: "both_signed",
    contract_text: `CONTRATANTE: Marina Souza\n\nCONTRATADO: ${userName}\n\nSERVIÇO: Cobertura fotográfica de casamento\n\nLOCAL: Villa Real Eventos — Alphaville, SP\n\nDATA: ${todayStr}\n\nVALOR: R$ 850,00 (oitocentos e cinquenta reais)\n\nO CONTRATADO se compromete a realizar cobertura fotográfica completa do evento, entregando as imagens editadas em até 30 dias após o evento.\n\nO pagamento será realizado pela plataforma Freelaki após confirmação da conclusão do serviço.\n\nASSINATURAS DIGITAIS:\n\n✓ Contratante: Marina Souza\n  Assinado em: ${todayStr} às 14:32\n\n✓ Contratado: ${userName}\n  Assinado em: ${todayStr} às 15:10`,
    pdf_url: null,
    created_at: today.toISOString(),
    sign_token_professional: null,
    sign_token_client: null,
    updated_at: today.toISOString(),
    job_title: "Cobertura de Casamento - Villa Real",
    budget: 850,
    scheduled_at: today.toISOString(),
    location_address: "Villa Real Eventos — Alphaville, SP",
    client_name: "Marina Souza",
    client_avatar: null,
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

  // Fetch user name
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
      oppIds.length > 0 ? supabase.from("opportunities").select("id, title, budget, scheduled_at, location_address, category_id").in("id", oppIds) : { data: [] },
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
        scheduled_at: opp.scheduled_at,
        location_address: opp.location_address,
        client_name: client.full_name || "Cliente",
        client_avatar: client.avatar_url,
        category_name: cat.name || "",
        category_icon: cat.icon || "",
      };
    });

    setContracts(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  // Build filtered list with mock injection
  const mockContract = buildMockContract(userName);

  const filtered = (() => {
    const real = contracts.filter((c) => {
      if (activeTab === "assinar") return c.client_signed && !c.professional_signed;
      if (activeTab === "assinados") return c.status === "both_signed";
      return true;
    });
    // Inject mock in "assinados" and "todos" tabs
    if (activeTab === "assinados" || activeTab === "todos") {
      return [...real, mockContract];
    }
    return real;
  })();

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const formatBudget = (v: number | null) => {
    if (v == null) return "—";
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const handleSign = async (contract: ContractItem) => {
    setSigning(true);
    const { error } = await supabase
      .from("contracts")
      .update({
        professional_signed: true,
        professional_signed_at: new Date().toISOString(),
        status: "both_signed",
      })
      .eq("id", contract.id);

    if (error) {
      toast.error("Erro ao assinar contrato.");
    } else {
      toast("Contrato assinado! 🎉", { style: { background: "#000", color: "#fff", border: "none" } });
      setSelectedContract(null);
      setShowSignModal(false);
      fetchContracts();
    }
    setSigning(false);
  };

  const needsSign = (c: ContractItem) => c.client_signed && !c.professional_signed;
  const canDownload = (c: ContractItem) => c.status === "both_signed" && c.pdf_url;

  const isMockSelected = selectedContract?.isMock;

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
        <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#2E7D32" }}>💰 {formatBudget(c.budget)}</span>
                    {c.scheduled_at && <span style={{ fontSize: 13, color: "#767676" }}>📅 {formatDate(c.scheduled_at)}</span>}
                  </div>

                  {!c.isMock && (needsSign(c) || canDownload(c)) && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #F7F7F7", paddingTop: 12 }}>
                      {needsSign(c) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedContract(c); setShowSignModal(true); }}
                          className="w-full"
                          style={{ background: "#276EF1", color: "#FFF", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 14 }}
                        >
                          Assinar contrato →
                        </button>
                      )}
                      {canDownload(c) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(c.pdf_url!, "_blank"); }}
                          className="w-full"
                          style={{ background: "#F7F7F7", color: "#000", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 14 }}
                        >
                          Baixar PDF
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Sheet */}
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

                if (c.isMock) {
                  // Mock contract preview
                  return (
                    <>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      <h2 style={{ fontWeight: 700, fontSize: 20, color: "#000", marginTop: 8 }}>{c.job_title}</h2>

                      <div className="mt-3 space-y-1">
                        <p style={{ fontSize: 13, color: "#767676" }}>👤 {c.client_name}</p>
                        <p style={{ fontSize: 13, color: "#2E7D32", fontWeight: 600 }}>💰 {formatBudget(c.budget)}</p>
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
                      <div className="mt-2">
                        {(c.contract_text || "").split("\n").map((line, i) => (
                          <p key={i} style={{ fontSize: 13, color: "#767676", lineHeight: 1.8 }}>
                            {line || "\u00A0"}
                          </p>
                        ))}
                      </div>

                      {/* Footer */}
                      <p className="text-center" style={{ fontSize: 11, color: "#767676", marginTop: 16 }}>
                        Este contrato foi gerado e assinado digitalmente{"\n"}
                        pela plataforma Freelaki. Código: FLK-2025-0001
                      </p>

                      {/* Read-only warning */}
                      <div className="flex items-center gap-2" style={{ background: "#F7F7F7", borderRadius: 12, padding: 12, marginTop: 16 }}>
                        <Lock size={14} color="#767676" className="shrink-0" />
                        <span style={{ fontSize: 12, color: "#767676" }}>
                          Contrato somente para visualização. Não é possível editar.
                        </span>
                      </div>

                      {/* Download PDF button */}
                      <div style={{ marginTop: 16 }}>
                        <FreelakiButton
                          variant="secondary"
                          onClick={() => toast("Em breve disponível!", { style: { background: "#000", color: "#fff" } })}
                          className="w-full"
                        >
                          Baixar PDF
                        </FreelakiButton>
                      </div>
                    </>
                  );
                }

                // Real contract
                return (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <h2 style={{ fontWeight: 700, fontSize: 20, color: "#000", marginTop: 8 }}>{c.job_title}</h2>

                    <div className="mt-3 space-y-1">
                      <p style={{ fontSize: 13, color: "#767676" }}>👤 {c.client_name}</p>
                      <p style={{ fontSize: 13, color: "#2E7D32", fontWeight: 600 }}>💰 {formatBudget(c.budget)}</p>
                      {c.scheduled_at && <p style={{ fontSize: 13, color: "#767676" }}>📅 {formatDate(c.scheduled_at)}</p>}
                      {c.location_address && <p style={{ fontSize: 13, color: "#767676" }}>📍 {c.location_address}</p>}
                    </div>

                    <div style={{ height: 1, background: "#E5E5E5", margin: "16px 0" }} />

                    <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600 }}>CONTRATO</p>

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

                    {needsSign(c) && (
                      <div style={{ marginTop: 20 }}>
                        <FreelakiButton onClick={() => setShowSignModal(true)}>
                          Assinar contrato →
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

      {/* Sign Confirmation Modal */}
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 left-0 right-0 mx-6"
              style={{ top: "50%", transform: "translateY(-50%)", background: "#FFF", borderRadius: 24, padding: 28 }}
            >
              <div className="text-center">
                <span style={{ fontSize: 32 }}>✍️</span>
                <h3 style={{ fontWeight: 700, fontSize: 20, color: "#000", marginTop: 8 }}>Confirmar assinatura?</h3>
                <p style={{ fontSize: 14, color: "#767676", marginTop: 8 }}>
                  Ao assinar, você concorda com todos os termos do contrato.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <FreelakiButton loading={signing} onClick={() => handleSign(selectedContract)}>
                  Confirmar assinatura
                </FreelakiButton>
                <FreelakiButton variant="secondary" onClick={() => setShowSignModal(false)}>
                  Cancelar
                </FreelakiButton>
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
