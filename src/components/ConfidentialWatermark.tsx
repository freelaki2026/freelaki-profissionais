/**
 * Marca d'água discreta sobreposta em todas as telas do app.
 * Objetivo: desencorajar prints/vazamentos durante demos para investidores.
 * - Fixa, cobre a viewport inteira
 * - Diagonal, repetida em grade
 * - pointer-events: none (não interfere em cliques)
 * - opacidade baixa para não atrapalhar leitura
 */
const ConfidentialWatermark = () => {
  const text = "CONFIDENCIAL · FREELAKI";
  // Grade 3x8 = 24 repetições cobrindo qualquer viewport
  const rows = 10;
  const cols = 4;
  const items = Array.from({ length: rows * cols });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2147483000] overflow-hidden select-none"
      style={{ userSelect: "none" }}
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {items.map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{
              transform: "rotate(-30deg)",
              color: "rgba(0,0,0,0.07)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "2px",
              whiteSpace: "nowrap",
              fontFamily: "Inter, system-ui, sans-serif",
              mixBlendMode: "multiply",
            }}
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfidentialWatermark;
