import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, FileSignature, Check, X, Loader2, Clock, ChevronDown, ChevronUp, Camera, AlertTriangle, Image as ImageIcon, Trash2 } from "lucide-react";

interface AddendumItem {
  type: "hour" | "service";
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  /** When type === "service", references the professional_extras row used */
  extra_id?: string;
  unit?: string;
}

interface Addendum {
  id: string;
  contract_id: string;
  proposed_by: string;
  proposed_by_role: string;
  proposed_at: string;
  reason: string | null;
  items: AddendumItem[];
  total_amount: number;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "paid";
  responded_at: string | null;
  rejection_reason: string | null;
  addendum_text: string | null;
  merged_with_original: boolean | null;
}

interface ProfessionalExtra {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
}

interface Props {
  contractId: string;
  /** Hide entirely if contract is closed */
  contractStatus: string | null;
  /** current user's role in this contract */
  userRole: "client" | "professional";
  /** Professional id — used to load their hourly rate and registered extras */
  professionalId: string | null;
  /** opportunity_id used by parent to refresh totals */
  onChange?: () => void;
}

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fetchClientIp = async (): Promise<string | null> => {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j.ip || null;
  } catch {
    return null;
  }
};

export default function ContractAddendums({ contractId, contractStatus, userRole, professionalId, onChange }: Props) {
  const [items, setItems] = useState<Addendum[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const closed = contractStatus === "completed" || contractStatus === "cancelled";

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("contract_addendums" as any)
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setItems((data || []) as unknown as Addendum[]);
    }
    setLoading(false);
  }, [contractId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`addendums-${contractId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contract_addendums", filter: `contract_id=eq.${contractId}` },
        () => fetchItems()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractId, fetchItems]);

  const respond = async (addendumId: string, action: "accept" | "reject", reason?: string) => {
    setRespondingId(addendumId);
    try {
      const ip = await fetchClientIp();
      const { data, error } = await supabase.rpc("respond_contract_addendum" as any, {
        p_addendum_id: addendumId,
        p_action: action,
        p_ip: ip,
        p_user_agent: navigator.userAgent,
        p_rejection_reason: reason || null,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) throw new Error(res?.error || "Erro ao responder");
      toast.success(action === "accept" ? "Aditivo aprovado!" : "Aditivo recusado.");
      setRejectModal(null);
      setRejectReason("");
      onChange?.();
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Erro ao responder.");
    } finally {
      setRespondingId(null);
    }
  };

  const cancel = async (addendumId: string) => {
    if (!confirm("Cancelar esta proposta de aditivo?")) return;
    setRespondingId(addendumId);
    try {
      const { data, error } = await supabase.rpc("cancel_contract_addendum" as any, {
        p_addendum_id: addendumId,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) throw new Error(res?.error || "Erro ao cancelar");
      toast.success("Proposta cancelada.");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar.");
    } finally {
      setRespondingId(null);
    }
  };

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  const totalAccepted = items
    .filter((i) => i.status === "accepted" || i.status === "paid")
    .reduce((sum, i) => sum + Number(i.total_amount), 0);

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[16px] font-semibold text-black flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-[#276EF1]" />
            Aditivos do contrato
          </h3>
          {totalAccepted > 0 && (
            <p className="text-[12px] text-black/60 mt-0.5">
              Aditivos aprovados: <span className="font-semibold text-black">{formatBRL(totalAccepted)}</span>
            </p>
          )}
        </div>
        {!closed && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-[13px] font-semibold text-[#276EF1] hover:opacity-80"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-black/40" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-black/50 text-center py-3">
          Nenhum aditivo. Use para incluir horas extras ou serviços extras.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const isMine = a.proposed_by === currentUserId;
            const expanded = expandedId === a.id;
            const statusBadge =
              a.status === "pending" ? { label: "Aguardando", color: "bg-amber-100 text-amber-800" } :
              a.status === "accepted" ? { label: "Aprovado", color: "bg-green-100 text-green-800" } :
              a.status === "paid" ? { label: "Pago", color: "bg-green-100 text-green-800" } :
              a.status === "rejected" ? { label: "Recusado", color: "bg-red-100 text-red-800" } :
              { label: "Cancelado", color: "bg-gray-100 text-gray-700" };

            return (
              <div key={a.id} className="border border-[#E5E5E5] rounded-[10px] p-3">
                <button
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                      <span className="text-[14px] font-semibold text-black">
                        {formatBRL(Number(a.total_amount))}
                      </span>
                    </div>
                    <p className="text-[12px] text-black/60 mt-1 truncate">
                      {a.reason || `${a.items.length} item(ns)`} · proposto pelo {a.proposed_by_role === "client" ? "cliente" : "profissional"}
                    </p>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-black/40" /> : <ChevronDown className="w-4 h-4 text-black/40" />}
                </button>

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-[#E5E5E5] space-y-2">
                    <div>
                      <p className="text-[11px] font-semibold text-black/60 uppercase mb-1">Itens</p>
                      {a.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[13px] text-black">
                          <span className="flex-1 mr-2">
                            {it.description}
                            <span className="text-black/40 ml-1">
                              ({it.quantity} × {formatBRL(Number(it.unit_price))})
                            </span>
                          </span>
                          <span className="font-medium">{formatBRL(Number(it.subtotal))}</span>
                        </div>
                      ))}
                    </div>

                    {a.reason && (
                      <div>
                        <p className="text-[11px] font-semibold text-black/60 uppercase mb-1">Motivo</p>
                        <p className="text-[13px] text-black">{a.reason}</p>
                      </div>
                    )}

                    {a.status === "rejected" && a.rejection_reason && (
                      <div>
                        <p className="text-[11px] font-semibold text-red-700 uppercase mb-1">Motivo da recusa</p>
                        <p className="text-[13px] text-black">{a.rejection_reason}</p>
                      </div>
                    )}

                    {a.status === "accepted" && (
                      <p className="text-[12px] text-black/60">
                        {a.merged_with_original
                          ? "✓ Será somado à cobrança original ao pagar."
                          : "✓ Cobrança extra será gerada para este aditivo."}
                      </p>
                    )}

                    {/* Ações */}
                    {a.status === "pending" && !isMine && (
                      <div className="flex gap-2 pt-2">
                        <button
                          disabled={respondingId === a.id}
                          onClick={() => setRejectModal({ id: a.id })}
                          className="flex-1 h-10 rounded-[8px] border border-[#E5E5E5] text-[13px] font-semibold text-black hover:bg-black/5 disabled:opacity-50"
                        >
                          Recusar
                        </button>
                        <button
                          disabled={respondingId === a.id}
                          onClick={() => respond(a.id, "accept")}
                          className="flex-1 h-10 rounded-[8px] bg-[#276EF1] text-white text-[13px] font-semibold hover:bg-[#1f5ed4] disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {respondingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Aprovar e assinar
                        </button>
                      </div>
                    )}

                    {a.status === "pending" && isMine && (
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <p className="text-[12px] text-black/60 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Aguardando outra parte
                        </p>
                        <button
                          disabled={respondingId === a.id}
                          onClick={() => cancel(a.id)}
                          className="text-[12px] font-semibold text-red-600 hover:opacity-80 disabled:opacity-50"
                        >
                          Cancelar proposta
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateAddendumModal
          contractId={contractId}
          professionalId={professionalId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchItems();
            onChange?.();
          }}
        />
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[16px] w-full max-w-sm p-5">
            <h3 className="text-[18px] font-semibold text-black mb-2">Recusar aditivo</h3>
            <p className="text-[13px] text-black/60 mb-3">
              Explique brevemente o motivo (opcional, mas recomendado).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Motivo da recusa..."
              className="w-full p-3 text-[14px] border border-[#E5E5E5] rounded-[8px] resize-none focus:outline-none focus:border-black"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 h-12 rounded-[8px] border border-[#E5E5E5] font-semibold text-black"
              >
                Cancelar
              </button>
              <button
                onClick={() => respond(rejectModal.id, "reject", rejectReason)}
                disabled={respondingId === rejectModal.id}
                className="flex-1 h-12 rounded-[8px] bg-red-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {respondingId === rejectModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Recusar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CREATE MODAL — uses ONLY the professional's registered rates
// ============================================================
function CreateAddendumModal({
  contractId,
  professionalId,
  onClose,
  onCreated,
}: {
  contractId: string;
  professionalId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loadingPro, setLoadingPro] = useState(true);

  // Professional's registered data
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [extras, setExtras] = useState<ProfessionalExtra[]>([]);

  // Selections — quantity per extra, plus extra hours qty
  const [extraHours, setExtraHours] = useState<number>(0);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!professionalId) {
        setLoadingPro(false);
        return;
      }
      const [pricingRes, extrasRes] = await Promise.all([
        supabase.from("professional_pricing").select("hourly_rate").eq("profile_id", professionalId).maybeSingle(),
        supabase
          .from("professional_extras")
          .select("id, name, description, price, unit")
          .eq("profile_id", professionalId)
          .eq("is_active", true)
          .order("order_index", { ascending: true }),
      ]);
      if (cancelled) return;
      setHourlyRate(Number(pricingRes.data?.hourly_rate || 0));
      setExtras((extrasRes.data || []) as ProfessionalExtra[]);
      setLoadingPro(false);
    })();
    return () => { cancelled = true; };
  }, [professionalId]);

  const incExtra = (id: string, delta: number) => {
    setSelectedExtras((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      const out = { ...prev };
      if (next === 0) delete out[id];
      else out[id] = next;
      return out;
    });
  };

  // Build items array
  const builtItems: AddendumItem[] = [];
  if (extraHours > 0 && hourlyRate > 0) {
    builtItems.push({
      type: "hour",
      description: `${extraHours}h extra(s) — hora trabalhada do profissional`,
      quantity: extraHours,
      unit_price: hourlyRate,
      subtotal: +(extraHours * hourlyRate).toFixed(2),
      unit: "hora",
    });
  }
  for (const ex of extras) {
    const qty = selectedExtras[ex.id] || 0;
    if (qty > 0) {
      builtItems.push({
        type: "service",
        description: ex.name,
        quantity: qty,
        unit_price: Number(ex.price),
        subtotal: +(qty * Number(ex.price)).toFixed(2),
        extra_id: ex.id,
        unit: ex.unit || "unidade",
      });
    }
  }
  const total = builtItems.reduce((s, i) => s + i.subtotal, 0);

  const submit = async () => {
    if (builtItems.length === 0) return toast.error("Selecione horas extras ou ao menos um serviço.");
    if (total < 5) return toast.error("Valor total mínimo: R$ 5,00.");
    if (!accepted) return toast.error("Confirme que aceita os termos do aditivo.");

    setSubmitting(true);
    try {
      const ip = await fetchClientIp();
      const { data, error } = await supabase.rpc("propose_contract_addendum" as any, {
        p_contract_id: contractId,
        p_items: builtItems as any,
        p_reason: reason.trim() || null,
        p_ip: ip,
        p_user_agent: navigator.userAgent,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) {
        const errMap: Record<string, string> = {
          contract_not_found: "Contrato não encontrado.",
          unauthorized: "Você não tem permissão.",
          contract_closed: "Contrato já encerrado.",
          no_items: "Adicione ao menos um item.",
          below_minimum: "Valor mínimo: R$ 5,00.",
        };
        throw new Error(errMap[res?.error] || res?.error || "Erro ao propor aditivo");
      }
      toast.success("Aditivo enviado! Aguarde a aprovação da outra parte.");
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao propor aditivo.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasNothingAvailable = !loadingPro && hourlyRate <= 0 && extras.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-[16px] rounded-t-[20px] max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-[#E5E5E5]">
          <h3 className="text-[18px] font-semibold text-black">Propor aditivo</h3>
          <p className="text-[13px] text-black/60 mt-1">
            Inclua horas extras ou serviços extras já cadastrados em "Meus Serviços". Os valores são fixos conforme seu portfólio.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loadingPro ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-black/40" />
            </div>
          ) : hasNothingAvailable ? (
            <div className="text-center py-6 text-[13px] text-black/60">
              Você ainda não cadastrou valor por hora nem serviços extras. Cadastre em "Meus Serviços" para poder propor aditivos.
            </div>
          ) : (
            <>
              {/* Horas extras */}
              {hourlyRate > 0 && (
                <div className="border border-[#E5E5E5] rounded-[10px] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[14px] font-semibold text-black">Horas extras</p>
                      <p className="text-[12px] text-black/60">{formatBRL(hourlyRate)} / hora</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExtraHours((h) => Math.max(0, +(h - 0.5).toFixed(1)))}
                        className="w-8 h-8 rounded-full border border-[#E5E5E5] text-[16px] font-bold text-black hover:bg-black/5"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-[15px] font-semibold text-black">
                        {extraHours}h
                      </span>
                      <button
                        onClick={() => setExtraHours((h) => +(h + 0.5).toFixed(1))}
                        className="w-8 h-8 rounded-full border border-[#E5E5E5] text-[16px] font-bold text-black hover:bg-black/5"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {extraHours > 0 && (
                    <p className="text-right text-[12px] text-black/60">
                      Subtotal: <span className="font-semibold text-black">{formatBRL(extraHours * hourlyRate)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Serviços extras */}
              {extras.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-black/60 uppercase mb-2">Seus serviços extras</p>
                  <div className="space-y-2">
                    {extras.map((ex) => {
                      const qty = selectedExtras[ex.id] || 0;
                      return (
                        <div key={ex.id} className="border border-[#E5E5E5] rounded-[10px] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-semibold text-black">{ex.name}</p>
                              {ex.description && (
                                <p className="text-[12px] text-black/60 mt-0.5">{ex.description}</p>
                              )}
                              <p className="text-[12px] text-black/60 mt-0.5">
                                {formatBRL(Number(ex.price))} / {ex.unit || "unidade"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => incExtra(ex.id, -1)}
                                className="w-8 h-8 rounded-full border border-[#E5E5E5] text-[16px] font-bold text-black hover:bg-black/5"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-[15px] font-semibold text-black">
                                {qty}
                              </span>
                              <button
                                onClick={() => incExtra(ex.id, 1)}
                                className="w-8 h-8 rounded-full border border-[#E5E5E5] text-[16px] font-bold text-black hover:bg-black/5"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {qty > 0 && (
                            <p className="text-right text-[12px] text-black/60 mt-1">
                              Subtotal: <span className="font-semibold text-black">{formatBRL(qty * Number(ex.price))}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-black/60 uppercase">
                  Motivo / observações (opcional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Ex: cliente solicitou cobertura adicional após o término."
                  className="w-full p-3 text-[14px] border border-[#E5E5E5] rounded-[8px] resize-none focus:outline-none focus:border-black"
                />
              </div>

              <div className="bg-black/5 rounded-[10px] p-3">
                <div className="flex justify-between text-[14px]">
                  <span className="text-black/70">Valor total do aditivo</span>
                  <span className="font-bold text-black">{formatBRL(total)}</span>
                </div>
                <p className="text-[11px] text-black/50 mt-1">
                  Se o pagamento original ainda não foi feito, este valor será somado. Caso contrário, será cobrado em separado.
                </p>
              </div>

              <label className="flex items-start gap-2 text-[12px] text-black/70">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Li e concordo com os termos deste <strong>aditivo contratual</strong>. Esta aceitação tem validade jurídica
                  (Art. 107 CC; MP 2.200-2/2001) e ficará registrada com data, hora, IP e dispositivo.
                </span>
              </label>
            </>
          )}
        </div>

        <div className="p-5 border-t border-[#E5E5E5] flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-12 rounded-[8px] border border-[#E5E5E5] font-semibold text-black"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || loadingPro || hasNothingAvailable || builtItems.length === 0}
            className="flex-1 h-12 rounded-[8px] bg-[#276EF1] text-white font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
            Enviar para aprovação
          </button>
        </div>
      </div>
    </div>
  );
}
