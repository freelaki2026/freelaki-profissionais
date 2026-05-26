
## Problema

Os uploads de vídeo falham com HTTP 413 `Payload too large` mesmo com arquivos abaixo de 150MB. Confirmado nos logs de rede:

```
POST /storage/v1/object/portfolio/.../*.mp4
→ 400 {"statusCode":"413","error":"Payload too large",
       "message":"The object exceeded the maximum allowed size"}
```

O bucket `portfolio` está usando o limite padrão do Supabase (50MB) porque a migration anterior que definia `file_size_limit = 150MB` não chegou a ser aplicada.

## Correção

Rodar **uma única migration** que ajusta o bucket `portfolio`:

```sql
UPDATE storage.buckets
SET file_size_limit = 157286400,  -- 150 MB
    allowed_mime_types = ARRAY[
      'image/jpeg','image/jpg','image/png','image/webp','image/heic',
      'video/mp4','video/quicktime','video/webm'
    ]
WHERE id = 'portfolio';
```

- `file_size_limit = 157286400` bytes = 150MB, casando com o `MAX_VIDEO_BYTES` do `PerfilPublicoPage.tsx`.
- `allowed_mime_types` garante que tanto fotos (jpg/png/webp/heic) quanto vídeos (mp4/mov/webm gravados no iPhone/Android) passem.

## Validação

1. Após aplicar a migration, refazer o upload de um vídeo (~50-100MB) no `/perfil-publico`.
2. Confirmar HTTP 200 no POST para `/storage/v1/object/portfolio/...`.
3. Verificar que o item aparece na grade e em `portfolio_photos`.

## Sem mudanças de código

Nenhum arquivo do app precisa ser editado — o frontend já está correto (compressão removida, validação de 150MB / 90s mantida). É só ajustar o bucket.
