import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function ContaEmExclusaoPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    // Aguarda o auth carregar antes de decidir qualquer redirect — evita loop login↔dashboard.
    if (authLoading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    supabase.from("profiles")
      .select("deletion_scheduled_for, deletion_requested_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.deletion_requested_at) {
          navigate("/dashboard", { replace: true });
          return;
        }
        if (data.deletion_scheduled_for) setScheduledFor(new Date(data.deletion_scheduled_for));
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

  const daysLeft = scheduledFor
    ? Math.max(0, Math.ceil((scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const reactivate = async () => {
    setReactivating(true);
    try {
      const { error } = await supabase.rpc("cancel_account_deletion");
      if (error) throw error;
      toast.success("Conta reativada com sucesso!");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error("Erro ao reativar conta");
      setReactivating(false);
    }
  };

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black px-6 pb-10 pt-20">
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "rgba(245,158,11,0.15)" }}>
          <AlertTriangle size={36} color="#F59E0B" />
        </div>

        <h1 className="mt-6 text-center text-[24px] font-bold text-white">
          Sua conta está em<br />processo de exclusão
        </h1>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-[13px] text-white/60">Tempo restante</p>
          <p className="mt-1 text-[48px] font-bold text-white">{daysLeft ?? "—"}</p>
          <p className="text-[14px] text-white/70">dia{daysLeft === 1 ? "" : "s"} até a exclusão definitiva</p>
        </div>

        <p className="mt-5 text-center text-[14px] leading-relaxed text-white/70">
          Você ainda pode reativar sua conta e retomar de onde parou.
          Após a data acima, todos os seus dados serão excluídos permanentemente.
        </p>

        <div className="mt-8 space-y-3">
          <button
            onClick={reactivate}
            disabled={reactivating}
            className="h-[54px] w-full rounded-xl text-[15px] font-bold text-white disabled:opacity-50"
            style={{ background: "#276EF1" }}
          >
            {reactivating ? "Reativando..." : "Reativar minha conta"}
          </button>
          <button
            onClick={logout}
            className="h-[52px] w-full rounded-xl border border-white/15 text-[15px] font-semibold text-white/80"
          >
            Sair
          </button>
        </div>
      </motion.div>
    </div>
  );
}
