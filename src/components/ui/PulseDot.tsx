import { CSSProperties } from "react";

interface Props {
  /** Cor em HSL ou hex; default = primary do tema */
  color?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Bolinha pulsante (com halo expandindo) — pensada pra badges
 * de notificação não-lida, indicador online, novas mensagens.
 * 100% CSS (sem framer), zero overhead.
 */
export const PulseDot = ({
  color = "#276EF1",
  size = 10,
  className = "",
  style,
}: Props) => (
  <span
    className={`relative inline-flex ${className}`}
    style={{ width: size, height: size, ...style }}
    aria-hidden
  >
    <span
      className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
      style={{ background: color }}
    />
    <span
      className="relative inline-flex h-full w-full rounded-full"
      style={{ background: color }}
    />
  </span>
);

export default PulseDot;
