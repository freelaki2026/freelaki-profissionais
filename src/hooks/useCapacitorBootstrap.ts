import { useEffect } from "react";

/**
 * Inicializa plugins nativos quando o app roda dentro do Capacitor.
 * - StatusBar preto (combina com o tema dark do app)
 * - Splash auto-hide assim que o React montar
 * - Botão voltar do Android: nunca fecha o app na home, sempre faz history.back
 *
 * Imports dinâmicos: o bundle web NÃO carrega esses módulos a menos que
 * o app esteja rodando no native shell.
 */
export function useCapacitorBootstrap() {
  useEffect(() => {
    const w = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    };
    if (!w.Capacitor?.isNativePlatform?.()) return;

    let backHandler: { remove: () => void } | undefined;

    (async () => {
      try {
        const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
          import(/* @vite-ignore */ "@capacitor/status-bar"),
          import(/* @vite-ignore */ "@capacitor/splash-screen"),
          import(/* @vite-ignore */ "@capacitor/app"),
        ]);

        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        if (w.Capacitor.getPlatform?.() === "android") {
          await StatusBar.setBackgroundColor({ color: "#000000" }).catch(() => {});
        }
        await SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});

        // Hardware back: navega no histórico; só sai do app se já está na raiz.
        backHandler = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else App.exitApp();
        });
      } catch {
        /* runtime nativo ausente / build web — silencioso */
      }
    })();

    return () => {
      backHandler?.remove();
    };
  }, []);
}

export default useCapacitorBootstrap;
