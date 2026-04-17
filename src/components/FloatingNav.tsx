import { useLocation, useNavigate } from "react-router-dom";
import { Home, Zap, FileText, User, Menu } from "lucide-react";

const NAV_ITEMS = [
  { label: "Início",    icon: Home,     path: "/dashboard" },
  { label: "Oport.",    icon: Zap,      path: "/oportunidades" },
  { label: "Contratos", icon: FileText, path: "/contratos" },
  { label: "Menu",      icon: Menu,     path: "/menu" },
  { label: "Perfil",    icon: User,     path: "/perfil" },
];

export function FloatingNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
      <nav className="flex items-center gap-1 bg-[#111111] rounded-full px-2 py-2 shadow-2xl pointer-events-auto">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={[
                "flex items-center rounded-full h-10 transition-all duration-300 ease-in-out outline-none",
                isActive
                  ? "bg-white text-black px-4 gap-2 font-medium"
                  : "text-zinc-500 hover:text-zinc-300 w-10 justify-center",
              ].join(" ")}
            >
              <Icon size={16} strokeWidth={1.6} />
              {isActive && (
                <span className="text-[13px] whitespace-nowrap">{label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default FloatingNav;
