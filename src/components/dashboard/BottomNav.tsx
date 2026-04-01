import { useNavigate, useLocation } from "react-router-dom";
import { Home, Briefcase, FileText, Menu, type LucideIcon } from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  action?: () => void;
}

interface BottomNavProps {
  onScrollToOpportunities?: () => void;
  onOpenDrawer?: () => void;
}

const BottomNav = ({ onScrollToOpportunities, onOpenDrawer }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = [
    { icon: Home, label: "Início", path: "/dashboard" },
    { icon: Briefcase, label: "Oportunidades", path: "/dashboard", action: onScrollToOpportunities },
    { icon: FileText, label: "Contratos", path: "/contratos" },
    { icon: Menu, label: "Menu", path: "/dashboard", action: onOpenDrawer },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-[hsl(var(--border))] bg-white">
      {items.map((item, i) => {
        const active = i === 0 && location.pathname === "/dashboard";
        const Icon = item.icon;
        const color = active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
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
            <Icon size={22} color={color} />
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
