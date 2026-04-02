import { useState, useEffect, useCallback } from "react";
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

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          navigator.vibrate?.(200);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true } as any).eq("profile_id", user.id);
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
