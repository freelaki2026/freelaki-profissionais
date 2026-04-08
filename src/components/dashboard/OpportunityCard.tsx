import { useNavigate } from "react-router-dom";

interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: string | null;
  category_name?: string;
  category_icon?: string;
}

interface OpportunityCardProps {
  opp: Opportunity;
  variant?: "available" | "accepted";
}

const statusBadges: Record<string, { text: string; bg: string; color: string; clickable?: string }> = {
  awaiting_signatures: { text: "✍️ Assinar contrato", bg: "#E3F2FD", color: "#1565C0", clickable: "/contratos" },
  accepted: { text: "✓ Confirmar início", bg: "#FFF3E0", color: "#B45309" },
  in_progress: { text: "Em andamento", bg: "#E8F5E9", color: "#2E7D32" },
};

const OpportunityCard = ({ opp, variant = "available" }: OpportunityCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="mb-2.5 rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{opp.category_icon || "📦"}</span>
        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "rgba(39,110,241,0.08)", color: "#276EF1" }}>
          {opp.category_name || "Geral"}
        </span>
        {variant === "accepted" && opp.status && statusBadges[opp.status] && (
          <span
            className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadges[opp.status].clickable ? 'cursor-pointer' : ''}`}
            style={{ background: statusBadges[opp.status].bg, color: statusBadges[opp.status].color }}
            onClick={(e) => {
              const dest = statusBadges[opp.status!].clickable;
              if (dest) { e.stopPropagation(); navigate(dest); }
            }}
          >
            {statusBadges[opp.status].text}
          </span>
        )}
      </div>

      <p className="mt-2 text-[15px] font-semibold text-foreground">{opp.title}</p>
      {opp.description && (
        <p className="mt-1 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {opp.description}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        {opp.budget != null && (
          <span className="text-[15px] font-bold" style={{ color: "#2E7D32" }}>
            💰 R$ {opp.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        )}
        <button
          onClick={() => navigate(`/oportunidade/${opp.id}`)}
          className="ml-auto flex h-8 items-center rounded-lg px-3.5 text-[13px] font-semibold text-white"
          style={{ background: "#276EF1" }}
        >
          {variant === "accepted" ? "Detalhes →" : "Ver →"}
        </button>
      </div>
    </div>
  );
};

export default OpportunityCard;
