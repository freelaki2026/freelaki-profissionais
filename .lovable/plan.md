## Plano

Bucket e RLS no Supabase estão corretos:
- `portfolio`: 150MB, `video/mp4`, `video/quicktime`, `video/webm`, `video/x-m4v` permitidos, public
- Policy `portfolio_upload` aceita `auth.uid()/...`

O upload falha mas o código exibe um toast genérico ("Erro ao enviar arquivo") e descarta `uploadErr.message`. Sem essa mensagem é impossível saber se é mime, RLS, tamanho ou rede.

## Mudança

Em `src/pages/PerfilPublicoPage.tsx` (`handleUpload`):

1. Logar `uploadErr` completo no `console.error` (mensagem + name + statusCode).
2. Trocar o toast genérico por `toast.error(\`Erro: ${uploadErr.message}\`)` (mensagem real do Supabase Storage, ex.: "mime type X is not supported" / "Payload too large" / "new row violates row-level security policy").
3. Mesmo tratamento no `insertErr` do `portfolio_photos`.

## Próximo passo

Você tenta subir o mesmo `.mp4` de novo e me manda a mensagem que aparecer no toast (ou no console). Com isso aplico a correção pontual (ajustar mime permitido, fallback de contentType, política, etc.) sem ficar chutando.

Sem mudanças de schema/migration nesta etapa.