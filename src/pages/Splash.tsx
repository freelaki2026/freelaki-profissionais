import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      navigate(session ? "/dashboard" : "/login", { replace: true });
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-foreground animate-fade-in">
      {/* Logo */}
      <div className="flex flex-col items-center">
        <span className="text-[32px] mb-2 text-primary">⚡</span>
        <h1 className="text-[38px] font-bold text-background tracking-[-1px] leading-none">
          freelaki
        </h1>
        <span className="mt-1 text-sm font-light tracking-[4px] text-muted-foreground">
          profissionais
        </span>
      </div>

      {/* Loading dots */}
      <div className="fixed bottom-12 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-primary"
            style={{
              animation: "pulse-dot 0.9s ease-in-out infinite",
              animationDelay: `${i * 300}ms`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default Splash;
