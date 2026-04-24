-- Bloco 1: Desativar categorias que não fazem mais parte do app
-- Mantém apenas: Fotógrafo, Videomaker Mobile, Filmmaker, Social Media, Storymaker, Designer
UPDATE public.categories
SET is_active = false
WHERE LOWER(slug) IN (
  'roteirista',
  'entrevistador',
  'mestre-de-cerimonia',
  'mestre-de-cerimônia',
  'recepcionista-de-eventos',
  'recepcionista',
  'operador-de-luz',
  'operador-de-som'
)
OR LOWER(name) IN (
  'roteirista',
  'entrevistador',
  'mestre de cerimônia',
  'mestre de cerimonia',
  'recepcionista de eventos',
  'recepcionista',
  'operador de luz',
  'operador de som'
);

-- Garantir que as 6 categorias permitidas estão ativas
UPDATE public.categories
SET is_active = true
WHERE LOWER(name) IN (
  'fotógrafo', 'fotografo',
  'videomaker mobile',
  'filmmaker',
  'social media',
  'storymaker',
  'designer'
);