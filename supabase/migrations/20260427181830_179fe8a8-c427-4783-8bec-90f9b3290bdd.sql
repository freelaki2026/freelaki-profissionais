-- Desativar Fotógrafo (mantém histórico de qualquer referência futura)
UPDATE public.categories SET is_active = false WHERE slug = 'fotografo';

-- Remover definitivamente categorias inativas sem uso
DELETE FROM public.categories
WHERE slug IN (
  'roteirista','entrevistador','mestre-de-cerimonia',
  'recepcionista-eventos','operador-de-luz','operador-de-som'
);

-- Reordenar as categorias existentes
UPDATE public.categories SET order_index = 1 WHERE slug = 'filmmaker';
UPDATE public.categories SET order_index = 2 WHERE slug = 'storymaker';
UPDATE public.categories SET order_index = 3 WHERE slug = 'social-media';
UPDATE public.categories SET order_index = 4 WHERE slug = 'videomaker-mobile';
UPDATE public.categories SET order_index = 5 WHERE slug = 'designer';

-- Inserir as 3 novas categorias (com upsert por slug)
INSERT INTO public.categories (slug, name, is_active, order_index) VALUES
  ('videomaker',          'Videomaker',             true, 0),
  ('editor-de-video',     'Editor de vídeo',        true, 6),
  ('editor-de-video-ia',  'Editor de vídeo com IA', true, 7)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      order_index = EXCLUDED.order_index;