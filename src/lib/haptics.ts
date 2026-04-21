/**
 * Haptic feedback unificado.
 * Usa Capacitor Haptics quando disponível (iOS nativo) e cai pra
 * navigator.vibrate no web. Sempre seguro: nunca quebra se a API faltar.
 */
type Style = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

const PATTERNS: Record<Style, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 35,
  selection: 8,
  success: [12, 30, 40],
  warning: [25, 30, 25],
  error: [40, 60, 40, 60, 80],
};

/**
 * Detecta plugin do Capacitor de forma lazy — não força import.
 */
const tryCapacitor = async (style: Style) => {
  try {
    const w = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    if (!w.Capacitor?.isNativePlatform?.()) return false;
    const mod = await import(/* @vite-ignore */ "@capacitor/haptics").catch(
      () => null,
    );
    if (!mod) return false;
    const { Haptics, ImpactStyle, NotificationType } = mod as any;
    if (style === "success" || style === "warning" || style === "error") {
      await Haptics.notification({
        type:
          style === "success"
            ? NotificationType.Success
            : style === "warning"
              ? NotificationType.Warning
              : NotificationType.Error,
      });
    } else if (style === "selection") {
      await Haptics.selectionStart();
      await Haptics.selectionEnd();
    } else {
      await Haptics.impact({
        style:
          style === "heavy"
            ? ImpactStyle.Heavy
            : style === "medium"
              ? ImpactStyle.Medium
              : ImpactStyle.Light,
      });
    }
    return true;
  } catch {
    return false;
  }
};

export const haptics = {
  trigger(style: Style = "light") {
    if (typeof window === "undefined") return;
    // Best-effort Capacitor; sem await pra não bloquear o handler de tap.
    void tryCapacitor(style).then((ok) => {
      if (ok) return;
      try {
        navigator.vibrate?.(PATTERNS[style]);
      } catch {
        /* ignore */
      }
    });
  },
  light: () => haptics.trigger("light"),
  medium: () => haptics.trigger("medium"),
  heavy: () => haptics.trigger("heavy"),
  selection: () => haptics.trigger("selection"),
  success: () => haptics.trigger("success"),
  warning: () => haptics.trigger("warning"),
  error: () => haptics.trigger("error"),
};

export default haptics;
