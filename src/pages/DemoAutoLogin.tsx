import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEMO_EMAIL = "demo@freelaki.com";
const DEMO_PASSWORD = "DemoFreelaki2026!";

const DemoAutoLogin = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
        if (error) { setError("Não foi possível entrar na conta demo."); return; }
      }
      navigate("/dashboard", { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      {error ? <p className="text-sm text-destructive">{error}</p> : <Loader2 className="h-8 w-8 animate-spin text-primary" />}
    </div>
  );
};

export default DemoAutoLogin;
