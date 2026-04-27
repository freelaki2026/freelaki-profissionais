import { useLocation, useNavigate } from "react-router-dom";
import { Home, ScrollText, MessageCircle, Menu as MenuIcon } from "lucide-react";
import { prefetchRoute } from "@/lib/routePrefetch";
import { haptics } from "@/lib/haptics";

const NAV_ITEMS = [
  { label: "Home",      icon: Home,          path: "/dashboard" },
  { label: "Contratos", icon: ScrollText,    path: "/contratos" },
  { label: "Mensagens", icon: MessageCircle, path: "/mensagens" },
  { label: "Menu",      icon: MenuIcon,      path: "/menu" },
];

export function FloatingNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-10 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
      <nav className="flex items-center gap-1 bg-[#111111] rounded-full px-2 py-2 shadow-2xl pointer-events-auto">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
          // Prefetch agressivo: começa a baixar o chunk antes do clique completar.
          const prefetch = () => prefetchRoute(path);
          return (
            <button
              key={path}
              type="button"
              onMouseEnter={prefetch}
              onTouchStart={prefetch}
              onFocus={prefetch}
              onClick={() => {
                if (!isActive) haptics.selection();
                navigate(path);
              }}
              className={[
                "flex items-center rounded-full h-10 transition-all duration-300 ease-in-out outline-none active:scale-95",
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
