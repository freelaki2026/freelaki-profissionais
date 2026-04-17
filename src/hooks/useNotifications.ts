import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  profile_id: string | null;
  type: string;
  title: string;
  body: string;
  is_read: boolean | null;
  action_url: string | null;
  created_at: string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime com BATCHING (200ms): agrupa múltiplas notificações que chegam
  // juntas em um único setState — evita 5+ re-renders em cascata.
  const pendingRef = useRef<Notification[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const flush = () => {
      const batch = pendingRef.current;
      pendingRef.current = [];
      flushTimerRef.current = null;
      if (batch.length === 0) return;
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        const fresh = batch.filter((n) => !seen.has(n.id));
        if (fresh.length === 0) return prev;
        return [...fresh, ...prev];
      });
      navigator.vibrate?.(200);
    };

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${user.id}` },
        (payload) => {
          pendingRef.current.push(payload.new as Notification);
          if (!flushTimerRef.current) {
            flushTimerRef.current = setTimeout(flush, 200);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .eq("profile_id", user.id);

    if (error) {
      console.error("Erro ao marcar notificações:", error);
    }
  }, [user]);

  const addLocal = useCallback((notif: Omit<Notification, "id">) => {
    const local: Notification = { ...notif, id: `local-${Date.now()}` };
    setNotifications((prev) => [local, ...prev]);
  }, []);

  const insertNotification = useCallback(async (data: { type: string; title: string; body: string; action_url?: string }) => {
    if (!user) return;
    await supabase.from("notifications").insert({
      profile_id: user.id,
      type: data.type,
      title: data.title,
      body: data.body,
      action_url: data.action_url || null,
    } as any);
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, addLocal, insertNotification };
}
