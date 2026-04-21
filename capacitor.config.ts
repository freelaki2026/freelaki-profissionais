import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuração nativa Freelaki Profissionais.
 * - bundleId/appId casados com o projeto Lovable
 * - server.url habilita hot-reload direto do sandbox enquanto desenvolvemos
 *   (em build de loja, comente esse bloco para empacotar os assets locais)
 */
const config: CapacitorConfig = {
  appId: "app.lovable.4a55004644ab4369a35cf4f70d1ee3b1",
  appName: "freelaki-profissionais",
  webDir: "dist",
  server: {
    url: "https://4a550046-44ab-4369-a35c-f4f70d1ee3b1.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#000000",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#000000",
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
      overlaysWebView: false,
    },
  },
};

export default config;
