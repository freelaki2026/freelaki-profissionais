import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertTriangle, ChevronLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const REASONS = [
  "Não uso mais o aplicativo",
  "Encontrei outra plataforma",
  "Problemas técnicos / bugs",
  "Preocupações com privacidade",
  "Poucas oportunidades",
  "Outro motivo",
];

type Step = "survey" | "terms" | "confirm";

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("survey");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setStep("survey"); setReason(""); setFeedback("");
      setAccepted(false); setConfirmText("");
    }, 300);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("request_account_deletion", {
        p_reason: reason,
        p_feedback: feedback || null,
      });
      if (error) throw error;
      const res = data as { success: boolean; error?: string; count?: number };
      if (!res.success) {
        if (res.error === "has_active_contracts") {
          toast.error(`Você tem ${res.count} contrato(s) em andamento. Conclua-os antes de excluir sua conta.`);
        } else {
          toast.error("Não foi possível solicitar a exclusão. Tente novamente.");
        }
        setLoading(false);
        return;
      }
      toast.success("Conta agendada para exclusão em 15 dias");
      await signOut();
      navigate("/login");
    } catch (e) {
      toast.error("Erro ao solicitar exclusão");
      setLoading(false);
    }
  };

  return (
    <>
      <span className="mt-5 block text-[10px] font-semibold tracking-[2px] text-[#E53935]">
        ZONA DE PERIGO
      </span>
      <button
        onClick={() => setOpen(true)}
        className="mt-2.5 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left transition active:scale-[0.99]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEE]">
          <Trash2 size={18} color="#E53935" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#E53935]">Excluir minha conta</p>
          <p className="mt-0.5 text-xs text-[#767676]">Período de carência de 15 dias antes da exclusão definitiva</p>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={reset}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-10 pt-3"
              onClick={(e) => e.stopPropagation()}
              style={{ scrollbarWidth: "none" }}
            >
              <div className="sticky top-0 -mx-5 -mt-3 mb-3 flex items-center justify-between bg-white px-5 pt-3 pb-2">
                {step !== "survey" ? (
                  <button onClick={() => setStep(step === "confirm" ? "terms" : "survey")}>
                    <ChevronLeft size={22} />
                  </button>
                ) : <div className="w-6" />}
                <span className="text-[13px] font-semibold text-[#767676]">
                  Passo {step === "survey" ? "1" : step === "terms" ? "2" : "3"} de 3
                </span>
                <button onClick={reset}><X size={22} /></button>
              </div>

              {step === "survey" && (
                <div>
                  <h3 className="text-[20px] font-bold">Antes de você ir…</h3>
                  <p className="mt-1 text-[13px] text-[#767676]">
                    Nos ajude a melhorar contando o motivo da sua saída.
                  </p>
                  <div className="mt-4 space-y-2">
                    {REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-[14px]"
                        style={{
                          borderColor: reason === r ? "#276EF1" : "#E5E5E5",
                          background: reason === r ? "rgba(39,110,241,0.06)" : "#fff",
                        }}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border"
                          style={{ borderColor: reason === r ? "#276EF1" : "#C4C4C4" }}>
                          {reason === r && <span className="h-2.5 w-2.5 rounded-full bg-[#276EF1]" />}
                        </span>
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value.slice(0, 200))}
                    placeholder="Quer compartilhar mais detalhes? (opcional)"
                    rows={3}
                    className="mt-4 w-full rounded-xl border border-[#E5E5E5] bg-white p-3 text-[14px] text-[#1a1a1a] placeholder:text-[#9a9a9a] outline-none focus:border-[#276EF1]"
                    style={{ background: "#FFFFFF", color: "#1a1a1a" }}
                  />
                  <p className="mt-1 text-right text-[11px] text-[#767676]">{feedback.length}/200</p>

                  <button
                    onClick={() => setStep("terms")}
                    disabled={!reason}
                    className="mt-3 h-[52px] w-full rounded-xl font-bold text-white disabled:opacity-50"
                    style={{ background: "#E53935" }}
                  >
                    Continuar
                  </button>
                </div>
              )}

              {step === "terms" && (
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={22} color="#E53935" />
                    <h3 className="text-[20px] font-bold">Termos de exclusão</h3>
                  </div>
                  <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-xl bg-[#F7F7F7] p-4 text-[13px] leading-relaxed text-[#333]"
                    style={{ scrollbarWidth: "none" }}>
                    <p className="font-bold">Termos de Exclusão de Conta — Freelaki Profissionais</p>
                    <p className="mt-2">Ao solicitar a exclusão da sua conta, você declara estar ciente de que:</p>
                    <ol className="mt-2 list-decimal space-y-2 pl-5">
                      <li>Sua conta será <b>desativada imediatamente</b> e ficará inacessível durante o período de carência de <b>15 dias corridos</b>.</li>
                      <li>Durante esse período, você poderá <b>reativar sua conta</b> a qualquer momento fazendo login novamente.</li>
                      <li>Após <b>15 dias</b>, todos os seus dados pessoais, perfil, portfólio, mensagens, avaliações e histórico serão <b>excluídos definitivamente</b> dos nossos servidores e não poderão ser recuperados.</li>
                      <li>Dados fiscais e financeiros (contratos concluídos, pagamentos, notas fiscais) serão <b>mantidos pelo prazo legal de 5 anos</b> conforme exigência da Receita Federal, mesmo após a exclusão da conta.</li>
                      <li>Você não poderá solicitar exclusão se tiver <b>contratos em andamento</b> (aceitos, em execução ou aguardando assinatura). Conclua-os antes.</li>
                      <li>Saques pendentes serão processados normalmente para a chave PIX cadastrada antes da exclusão definitiva.</li>
                    </ol>
                    <p className="mt-3 text-[12px] text-[#767676]">
                      Esta ação está em conformidade com a <b>LGPD (Lei 13.709/18), Art. 18</b>.
                    </p>
                  </div>
                  <label className="mt-4 flex items-start gap-3 text-[14px]">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      className="mt-1 h-5 w-5 accent-[#E53935]"
                    />
                    Li e aceito os termos de exclusão de conta acima.
                  </label>
                  <button
                    onClick={() => setStep("confirm")}
                    disabled={!accepted}
                    className="mt-4 h-[52px] w-full rounded-xl font-bold text-white disabled:opacity-50"
                    style={{ background: "#E53935" }}
                  >
                    Continuar
                  </button>
                </div>
              )}

              {step === "confirm" && (
                <div>
                  <h3 className="text-[20px] font-bold text-[#E53935]">Última confirmação</h3>
                  <p className="mt-2 text-[14px] text-[#333]">
                    Para confirmar, digite <b>EXCLUIR</b> no campo abaixo.
                  </p>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="Digite EXCLUIR"
                    className="mt-4 h-[52px] w-full rounded-xl border border-[#E5E5E5] px-4 text-[16px] font-bold tracking-widest outline-none focus:border-[#E53935]"
                  />
                  <button
                    onClick={submit}
                    disabled={confirmText !== "EXCLUIR" || loading}
                    className="mt-4 h-[54px] w-full rounded-xl font-bold text-white disabled:opacity-50"
                    style={{ background: "#E53935" }}
                  >
                    {loading ? "Processando..." : "Excluir minha conta"}
                  </button>
                  <button
                    onClick={reset}
                    className="mt-2 h-[52px] w-full rounded-xl border border-[#E5E5E5] font-semibold text-[#333]"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
