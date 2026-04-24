/**
 * Helper para captura de imagem nativa via Capacitor Camera.
 *
 * - Em runtime nativo (iOS/Android): abre seletor "Câmera | Galeria" e dispara
 *   automaticamente o prompt de permissão do sistema operacional na primeira vez.
 * - Em runtime web: retorna `null` para que o caller use o fallback `<input type="file">`.
 *
 * Imports dinâmicos para que o bundle web NÃO carregue o módulo.
 */
export async function pickNativeImage(): Promise<File | null> {
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  if (!w.Capacitor?.isNativePlatform?.()) return null;

  try {
    const { Camera, CameraResultType, CameraSource } = await import(
      /* @vite-ignore */ "@capacitor/camera"
    );

    // Solicita permissões explicitamente (dispara o popup do iOS).
    const perms = await Camera.checkPermissions();
    if (perms.camera !== "granted" || perms.photos !== "granted") {
      await Camera.requestPermissions({ permissions: ["camera", "photos"] });
    }

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt, // mostra "Câmera | Galeria | Cancelar"
      promptLabelHeader: "Selecionar foto",
      promptLabelPhoto: "Da galeria",
      promptLabelPicture: "Tirar foto",
    });

    if (!photo.webPath) return null;

    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    const ext = photo.format || "jpg";
    return new File([blob], `upload-${Date.now()}.${ext}`, {
      type: blob.type || `image/${ext}`,
    });
  } catch (err) {
    // Usuário cancelou ou plugin indisponível — caller decide o que fazer.
    console.warn("[nativeCamera] cancelado/erro:", err);
    return null;
  }
}

/** True se o app está rodando dentro do Capacitor (iOS/Android nativo). */
export function isNativePlatform(): boolean {
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  return !!w.Capacitor?.isNativePlatform?.();
}
