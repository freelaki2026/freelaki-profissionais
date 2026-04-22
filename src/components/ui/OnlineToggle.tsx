import { motion } from "framer-motion";

interface Props {
  isOnline: boolean;
  loading: boolean;
  onToggle: () => void;
}

/**
 * Toggle gigante estilo "Daily UI 015" — pílula com dot que desliza,
 * cor vermelho (offline) → verde (online), halo/glow externo pulsante
 * pra chamar atenção. Substitui o botão "Ficar Online" antigo.
 *
 * Design notes:
 *  - Track 88x44 com border-radius pill, sombra interna sutil pra dar profundidade.
 *  - Knob 36x36 branco com "donut" interno (ring colorido) que ecoa o estado.
 *  - Glow externo (box-shadow grande, soft) pulsa suavemente quando OFFLINE
 *    pra empurrar o usuário a apertar; quando ONLINE o glow vira "respiração"
 *    verde calma (status estável).
 *  - Tudo via framer-motion com spring — sensação tátil, não linear.
 */
export const OnlineToggle = ({ isOnline, loading, onToggle }: Props) => {
  const trackBg = isOnline ? "#00C853" : "#FF3B30";
  const ringColor = isOnline ? "#00C853" : "#FF3B30";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      aria-pressed={isOnline}
      aria-label={isOnline ? "Ficar offline" : "Ficar online"}
      className="relative inline-flex items-center justify-center outline-none disabled:opacity-60"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Glow externo — pulsa offline (urgência), respira online (calma) */}
      <motion.span
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 120,
          height: 70,
          background: trackBg,
          filter: "blur(22px)",
          opacity: 0.45,
        }}
        animate={
          isOnline
            ? { opacity: [0.35, 0.55, 0.35], scale: [1, 1.04, 1] }
            : { opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }
        }
        transition={{
          duration: isOnline ? 2.4 : 1.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Track */}
      <motion.span
        className="relative inline-flex items-center rounded-full"
        style={{
          width: 88,
          height: 44,
          padding: 4,
          background: trackBg,
          boxShadow:
            "inset 0 2px 4px rgba(0,0,0,0.18), 0 6px 18px rgba(0,0,0,0.35)",
        }}
        animate={{ background: trackBg }}
        transition={{ duration: 0.35 }}
      >
        {/* Knob */}
        <motion.span
          className="relative flex items-center justify-center rounded-full bg-white"
          style={{
            width: 36,
            height: 36,
            boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
          }}
          animate={{ x: isOnline ? 44 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        >
          {loading ? (
            <span
              className="inline-block rounded-full border-2 border-t-transparent animate-spin"
              style={{
                width: 16,
                height: 16,
                borderColor: ringColor,
                borderTopColor: "transparent",
              }}
            />
          ) : (
            // "Donut" interno — ring grosso + miolo da cor do estado
            <>
              <span
                className="absolute rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  border: `4px solid ${ringColor}`,
                }}
              />
              <span
                className="absolute rounded-full"
                style={{ width: 6, height: 6, background: ringColor }}
              />
            </>
          )}
        </motion.span>
      </motion.span>
    </button>
  );
};

export default OnlineToggle;
