import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";

/**
 * Banner exibido no Dashboard mostrando o que ainda falta o profissional
 * preencher para começar a aceitar oportunidades. Some sozinho quando tudo
 * estiver completo + documentos aprovados.
 */
export function OnboardingChecklistBanner() {
  const navigate = useNavigate();
  const { loading, pending, isApproved, canAcceptWork } = useOnboardingChecklist();

  if (loading) return null;
  // Só mostra se profissional já está aprovado mas tem dados faltando.
  // Quando ainda não aprovado, o Dashboard já exibe os states de documentos.
  if (!isApproved) return null;
  if (canAcceptWork) return null;
  if (pending.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="mx-5 mt-4 mb-2 rounded-2xl border border-amber-500/30 p-4"
        style={{
          background:
            "linear-gradient(145deg, #2a1f0d 0%, #1a1408 60%, #0f0a04 100%)",
        }}
      >
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle size={14} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight">
              Complete seu perfil para receber jobs
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
              Faltam {pending.length} {pending.length === 1 ? "item" : "itens"}.
              Sem isso, você não pode aceitar oportunidades.
            </p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {pending.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-2.5 rounded-lg bg-black/30 hover:bg-black/50 transition-colors px-3 py-2 outline-none"
              >
                <div className="w-4 h-4 rounded-full border border-amber-500/60 flex-shrink-0" />
                <span className="text-[12px] text-zinc-200 text-left flex-1">
                  {item.label}
                </span>
                <ChevronRight size={14} className="text-zinc-500 flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Versão compacta com checklist completo (inclui itens já feitos).
 * Usado na PerfilPage como referência visual do progresso.
 */
export function OnboardingChecklistFull() {
  const navigate = useNavigate();
  const { loading, items, isComplete } = useOnboardingChecklist();

  if (loading || items.length === 0) return null;

  const done = items.filter((i) => i.done).length;
  const total = items.length;

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-foreground">
          Progresso de cadastro
        </span>
        <span
          className="text-[12px] font-bold"
          style={{ color: isComplete ? "#2E7D32" : "#B45309" }}
        >
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#F0F0F0] overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(done / total) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: isComplete ? "#2E7D32" : "#276EF1" }}
        />
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => !item.done && navigate(item.route)}
              disabled={item.done}
              className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-md hover:bg-[#F7F7F7] transition-colors text-left disabled:cursor-default outline-none"
            >
              {item.done ? (
                <CheckCircle2 size={16} className="text-[#2E7D32] flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-[1.5px] border-[#B45309] flex-shrink-0" />
              )}
              <span
                className="text-[12px] flex-1"
                style={{
                  color: item.done ? "#767676" : "#1A1A1A",
                  textDecoration: item.done ? "line-through" : "none",
                }}
              >
                {item.label}
              </span>
              {!item.done && (
                <ChevronRight size={14} className="text-[#767676] flex-shrink-0" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
