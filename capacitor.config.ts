import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuração nativa Freelaki Profissionais.
 *
 * COMO FUNCIONA O server.url:
 * - Durante desenvolvimento (hot-reload): mantenha a variável CAP_SERVER_URL no .env
 *   ou descomente o bloco abaixo manualmente.
 * - Para BUILD DE PRODUÇÃO (App Store / Play Store):
 *   rode `CAP_PRODUCTION=true npm run build && npx cap sync ios`
 *   ou simplesmente NÃO defina CAP_SERVER_URL — o app rodará 100% offline com o bundle local.
 */
const isProduction = process.env.CAP_PRODUCTION === "true";
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "app.freelaki.profissionais",
  appName: "Freelaki Profissionais",
  webDir: "dist",
  // ⚠️ server só é incluído em DESENVOLVIMENTO. Em produção fica de fora automaticamente.
  ...(!isProduction && devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: true,
        },
      }
    : {}),
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
