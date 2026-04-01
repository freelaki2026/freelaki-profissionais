import { useNavigate, useLocation } from "react-router-dom";

interface NavItem {
  icon: string;
  label: string;
  path: string;
  action?: () => void;
}

interface BottomNavProps {
  onScrollToOpportunities?: () => void;
}

const BottomNav = ({ onScrollToOpportunities }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = [
    { icon: "🏠", label: "Início", path: "/dashboard" },
    { icon: "💼", label: "Oportunidades", path: "/dashboard", action: onScrollToOpportunities },
    { icon: "📋", label: "Contratos", path: "/contratos" },
    { icon: "👤", label: "Perfil", path: "/perfil" },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-[hsl(var(--border))] bg-white">
      {items.map((item, i) => {
        const active = i === 0 && location.pathname === "/dashboard";
        return (
          <button
            key={i}
            onClick={() => {
              if (item.action) { item.action(); return; }
              navigate(item.path);
            }}
            className="relative flex flex-col items-center gap-0.5 pt-1"
          >
            {active && (
              <div className="absolute -top-px h-0.5 w-8 rounded-full bg-[hsl(var(--primary))]" />
            )}
            <span className="text-[22px]">{item.icon}</span>
            <span
              className={`text-[10px] font-medium ${
                active ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
