## Compressão de vídeo client-side (qualidade preservada, pronto pra iOS + Android)

### Como funciona

Usar **`@ffmpeg/ffmpeg` (WebAssembly)** rodando no navegador e dentro do WebView do Capacitor — funciona igual em iPhone e Android sem plugin nativo.

**Regra inteligente:**
- Vídeo entra com até **300MB**.
- Se já for MP4 e ≤ 30MB → sobe direto, sem reprocessar (qualidade 100% original).
- Caso contrário → recomprime para **MP4 H.264 720p, ~2.5 Mbps + AAC 128kbps**, com `+faststart` (começa a tocar antes de baixar tudo). Resultado típico de 90s: **~20–30MB**, qualidade indistinguível a olho nu (padrão Instagram/WhatsApp).
- Duração máxima: **90s**.

### Arquivos

**1. Novo: `src/lib/videoCompression.ts`**
Wrapper isolado com `compressVideo(file, { onProgress })` e `prewarmVideoCompressor()`. Mantém uma instância singleton do ffmpeg pra não recarregar o `.wasm` (~30MB) a cada upload — primeira vez baixa, próximas são instantâneas.

Comando ffmpeg:
```
-vf scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease
-c:v libx264 -preset veryfast -crf 23 -maxrate 2800k -bufsize 5600k
-pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart
```

**2. Editar: `src/pages/PerfilPublicoPage.tsx`**
- Limites: `MAX_VIDEO_BYTES = 300MB`, `MAX_VIDEO_SECONDS = 90`.
- Novo fluxo de upload de vídeo:
  1. Validar tamanho/tipo/duração.
  2. Chamar `compressVideo(file, { onProgress: setProgress })`.
  3. UI mostra "Otimizando vídeo… 42%" no slot enquanto processa.
  4. Sobe o arquivo final pro Supabase.
- Botão de upload desabilitado durante compressão.
- Fallback: se ffmpeg falhar (raro, ex.: codec exótico), mostra erro "Não foi possível processar este vídeo. Tente outro formato."
- `prewarmVideoCompressor()` chamado uma vez ao montar a página (download do wasm em background, sem travar a UI).

**3. Lightbox estilo Instagram (mesma página):**
- Fundo `bg-black` 100% opaco.
- `<video controls autoPlay playsInline webkit-playsinline loop>` (loop opcional, igual IG Reels).
- Tap fora fecha; tap no vídeo NÃO fecha (já está com `stopPropagation`).
- Funciona dentro do WebView Capacitor sem plugin (atributos `playsInline` + `webkit-playsinline` resolvem o autoplay inline no iOS).

### Pronto pra Capacitor (iOS + Android)

- `ffmpeg.wasm` carregado de `unpkg.com` via `toBlobURL` — funciona no WebView dos dois sistemas.
- Nenhuma permissão nativa adicional necessária além das já configuradas (`NSPhotoLibraryUsageDescription` etc.).
- Se quiser performance maior no futuro, basta trocar a implementação de `compressVideo` por `@capacitor-community/video-editor` (plugin nativo) — a assinatura permanece igual e nenhum outro arquivo precisa mudar.

### Trade-offs honestos

| Aspecto | Realidade |
|---|---|
| Download inicial | ~30MB de wasm na 1ª vez (cacheado depois) |
| Tempo de compressão (90s, 1080p) | ~20–40s no iPhone moderno, ~40–80s no Android médio |
| Qualidade | 720p H.264 a 2.5Mbps — visualmente igual ao original em tela de celular |
| Tamanho final típico | 15–30MB para vídeo de 90s |
| Risco no upload Supabase | Zero (todos ficam abaixo dos 50MB do limite padrão) |

### Dependências a instalar

```
bun add @ffmpeg/ffmpeg @ffmpeg/util
```
