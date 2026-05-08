## Vídeo de abertura no Splash

### Arquivo
- `Logo_Freelaki_SFX.mp4` — 593 KB, 5,04s, 1080×1920, H.264 + AAC.
- Já está leve e em ótima qualidade. **Não precisa comprimir** (compressão pioraria a marca sem ganho real).

### Hospedagem
- Criar bucket público `branding` no Supabase Storage.
- Upload do MP4 como `branding/splash-intro.mp4` (URL pública, cache do navegador cobre as próximas aberturas — ~593 KB no primeiro load).
- RLS: leitura pública, escrita só autenticada (apenas precaução; upload feito por nós).

### Comportamento (Splash)
Substituir a animação atual de `src/pages/Splash.tsx` por:

```text
[ vídeo do logo em fullscreen, fundo #0A0A0F ]
   autoPlay · muted · playsInline · webkit-playsinline
   ↓ ao terminar (onEnded ~5s)
[ tagline aparece com fadeInUp: "100% do que você ganha é seu." + "Grátis pra sempre." ]
   ↓ +900ms para leitura
→ redirect (mesma lógica atual: /, /confirmar-email, /categorias ou /dashboard)
```

- Toca **toda vez que o app abre**, para visitantes E logados (substitui o splash atual em todos os fluxos: pré-login, login, pré-cadastro, dashboard).
- Sem botão pular (vídeo curto).
- `muted` por padrão (browsers bloqueiam autoplay com som). Como o MP4 tem trilha SFX, vamos tentar tocar com som via `video.muted = false; video.play()` num try/catch — se o browser bloquear, segue mudo sem quebrar.
- Preload do próximo destino em paralelo (mantém o `import("@/pages/DashboardPage")` atual).
- Fallback: se o vídeo falhar (rede off, 404), cai direto na animação textual antiga + redirect.

### Mudanças
1. **Migration Supabase**: criar bucket `branding` público + policies (`select` público, `insert/update/delete` só autenticado).
2. **Upload do MP4**: feito via script no nosso lado (não pedir ao usuário).
3. **`src/pages/Splash.tsx`**: trocar o bloco do logo pelo `<video>` apontando para a URL pública do bucket; mostrar tagline no `onEnded`; manter resolução de rota e durações mínimas baseadas no fim do vídeo (~5s) em vez dos timers fixos atuais.
4. **`src/pages/BoasVindasPage.tsx`**: hoje, se já tem sessão, redireciona para `/splash`. Mantém — assim logados também passam pelo vídeo.
5. **Memória**: atualizar `mem://logic/splash-behavior` para refletir o novo comportamento (vídeo + tagline pós-vídeo).

### Notas técnicas
- URL final: `https://chkeoqugdcciojzmuczr.supabase.co/storage/v1/object/public/branding/splash-intro.mp4`.
- Após o primeiro acesso, o vídeo fica em cache HTTP do navegador/WebView do Capacitor — aberturas seguintes são instantâneas.
- iOS WebView exige `playsInline` + `webkit-playsinline` + `muted` para autoplay (já contemplado).