import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAsaasOnboarding } from "@/hooks/useAsaasOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const EXEMPT_ROUTES = ["/termos", "/confirmar-email", "/categorias", "/conta-em-exclusao"];

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Tenta criar subconta Asaas em background — silencioso e idempotente.
  useAsaasOnboarding();
  const [checkingCategories, setCheckingCategories] = useState(true);
  const [hasCategories, setHasCategories] = useState<boolean | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setCheckingCategories(false);
      setPendingDeletion(false);
      return;
    }

    // Check deletion gate first (cheap query)
    supabase
      .from("profiles")
      .select("deletion_requested_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setPendingDeletion(!!data?.deletion_requested_at));

    // If email not confirmed, no need to check categories
    if (!user.email_confirmed_at) {
      setCheckingCategories(false);
      return;
    }

    // If on an exempt route, skip category check
    if (EXEMPT_ROUTES.includes(location.pathname)) {
      setCheckingCategories(false);
      return;
    }

    const checkCats = async () => {
      const { count } = await supabase
        .from("professional_categories")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user.id);

      setHasCategories((count ?? 0) > 0);
      setCheckingCategories(false);
    };

    checkCats();
  }, [user, location.pathname]);

  if (loading || checkingCategories) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 1. Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Account pending deletion — gate before everything else
  if (pendingDeletion && location.pathname !== "/conta-em-exclusao") {
    return <Navigate to="/conta-em-exclusao" replace />;
  }

  // 3. Email not confirmed
  if (!user.email_confirmed_at && !EXEMPT_ROUTES.includes(location.pathname)) {
    return <Navigate to="/confirmar-email" replace />;
  }

  // 4. No categories selected (email is confirmed)
  if (
    user.email_confirmed_at &&
    hasCategories === false &&
    location.pathname !== "/categorias" &&
    location.pathname !== "/termos"
  ) {
    return <Navigate to="/categorias" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
