/**
 * Compressao de video client-side via ffmpeg.wasm.
 *
 * - Roda no browser e dentro do WebView do Capacitor (iOS/Android) sem plugin nativo.
 * - Mantem qualidade alta (720p H.264 ~2.5Mbps + AAC 128k), padrao Instagram.
 * - Se o video de entrada ja e leve (<= 30MB e mp4), pula compressao e devolve original.
 *
 * Para migrar futuramente para plugin nativo (@capacitor-community/video-editor),
 * basta substituir compressVideo mantendo a mesma assinatura.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const SKIP_COMPRESSION_BYTES = 30 * 1024 * 1024; // 30MB
const FFMPEG_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadingPromise;
  } catch (e) {
    loadingPromise = null;
    throw e;
  }
}

export interface CompressOptions {
  onProgress?: (percent: number) => void;
  force?: boolean;
}

export interface CompressResult {
  file: File;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}

export async function compressVideo(
  input: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const { onProgress, force = false } = options;

  if (!force && input.size <= SKIP_COMPRESSION_BYTES && input.type === "video/mp4") {
    onProgress?.(100);
    return {
      file: input,
      compressed: false,
      originalSize: input.size,
      finalSize: input.size,
    };
  }

  const ffmpeg = await getFFmpeg();

  const ext = (input.name.split(".").pop() || "mov").toLowerCase().replace(/[^a-z0-9]/g, "");
  const inputName = `in_${Date.now()}.${ext || "mov"}`;
  const outputName = `out_${Date.now()}.mp4`;

  const progressHandler = ({ progress }: { progress: number }) => {
    const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
    onProgress?.(pct);
  };
  ffmpeg.on("progress", progressHandler);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(input));

    await ffmpeg.exec([
      "-i", inputName,
      "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-maxrate", "2800k",
      "-bufsize", "5600k",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data as Uint8Array], { type: "video/mp4" });
    const file = new File([blob], `compressed_${Date.now()}.mp4`, { type: "video/mp4" });

    try { await ffmpeg.deleteFile(inputName); } catch { /* noop */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* noop */ }

    return {
      file,
      compressed: true,
      originalSize: input.size,
      finalSize: file.size,
    };
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
}

export function prewarmVideoCompressor(): void {
  void getFFmpeg().catch(() => { /* silencioso */ });
}
