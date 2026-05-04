## Objetivo

Permitir que o profissional faça upload de vídeos `.mp4` (máx. 1 minuto, máx. ~50MB) na grade do portfólio em `/perfil-publico`, somando junto com as fotos um total máximo de 6 itens.

## Mudanças no Banco (Supabase)

Migration na tabela `portfolio_photos` (mantendo o nome para não quebrar o resto do app):

```sql
ALTER TABLE portfolio_photos
  ADD COLUMN media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN duration_seconds numeric;
-- valores possíveis: 'image' | 'video'
```

Bucket de storage `portfolio` já existe e é público — vamos reaproveitá-lo (vídeos vão para o mesmo bucket, sob o mesmo prefixo `{user_id}/`). Sem alteração de RLS necessária (políticas já cobrem o `profile_id`).

## Mudanças no Frontend

**Arquivo:** `src/pages/PerfilPublicoPage.tsx`

1. **Input de upload**: trocar `accept="image/*"` por `accept="image/*,video/mp4"`.
2. **Validações no `handleUpload`**:
   - Detectar tipo pelo `file.type` (`image/*` vs `video/mp4`).
   - Vídeo: rejeitar se não for `video/mp4`, se for >50MB, ou se a duração (lida via `<video>` oculto + `loadedmetadata`) for >60s.
   - Foto: manter limite de 5MB.
   - Manter o limite combinado de 6 (`MAX_ITEMS = 6`).
3. **Insert**: incluir `media_type` e (para vídeos) `duration_seconds`.
4. **Renderização da grade**:
   - Para `media_type === 'video'`: usar `<video src={...} muted playsInline preload="metadata">` com ícone de play sobreposto e badge de duração (ex.: "0:42").
   - Clique no vídeo abre o lightbox em modo player (`<video controls autoPlay>`).
   - Foto continua igual.
5. **Contador**: "X/6" considera fotos + vídeos.
6. **Texto vazio**: atualizar para "Adicione fotos e vídeos dos seus trabalhos…".
7. **Lightbox**: detectar tipo (estado `{ url, type }`) e renderizar `<img>` ou `<video controls>`.

## Observações Técnicas

- Validação de duração é client-side (cria `URL.createObjectURL`, carrega metadados, verifica `video.duration`). Sem dependência extra.
- Mantemos `portfolio_photos` (sem renomear) para evitar refatorar `PerfilPage`, queries e tipos gerados do Supabase.
- Bucket `portfolio` já é público → URL retornada via `getPublicUrl` funciona para vídeo igual à imagem.
- Sem mudanças em `PerfilPage.tsx` (essa página não exibe a grade do portfólio).
