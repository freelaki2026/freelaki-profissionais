import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LS_KEY = "freelaki:tour_completed";

export function useAppTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || checked) return;
    let cancelled = false;

    const run = async () => {
      // Fast path: localStorage evita piscar do tour entre navegações.
      if (typeof window !== "undefined" && localStorage.getItem(`${LS_KEY}:${user.id}`) === "1") {
        setChecked(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("tour_completed_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.tour_completed_at) {
        localStorage.setItem(`${LS_KEY}:${user.id}`, "1");
      } else {
        // Pequeno delay para o dashboard renderizar os alvos antes do spotlight.
        setTimeout(() => {
          if (!cancelled) {
            setStepIndex(0);
            setOpen(true);
          }
        }, 600);
      }
      setChecked(true);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user, checked]);

  const finish = useCallback(
    async (reason: "completed" | "skipped" = "completed") => {
      setOpen(false);
      if (!user) return;
      localStorage.setItem(`${LS_KEY}:${user.id}`, "1");
      await supabase
        .from("profiles")
        .update({ tour_completed_at: new Date().toISOString() })
        .eq("id", user.id);
    },
    [user]
  );

  const next = useCallback(() => setStepIndex((i) => i + 1), []);
  const prev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  return { open, stepIndex, setStepIndex, next, prev, finish };
}
