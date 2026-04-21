import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  /** Duração da animação em ms */
  duration?: number;
  /** Casas decimais (default 2) */
  decimals?: number;
  /** Prefixo (ex: "R$ ") */
  prefix?: string;
  /** Suffix opcional */
  suffix?: string;
  className?: string;
}

/**
 * Counter animado com easing (numbers rolling).
 * Usado pra saldos, ganhos, totais — gera o "wow factor"
 * de fintechs (Nubank, Inter) quando o valor muda.
 */
export const AnimatedCounter = ({
  value,
  duration = 900,
  decimals = 2,
  prefix = "",
  suffix = "",
  className,
}: Props) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — sensação confortável, sem overshoot
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted = display
    .toFixed(decimals)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
