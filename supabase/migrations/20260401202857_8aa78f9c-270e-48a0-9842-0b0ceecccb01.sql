INSERT INTO public.opportunities 
  (client_id, category_id, title, description, location_address, budget, status, scheduled_at)
SELECT 
  (SELECT id FROM profiles LIMIT 1),
  (SELECT id FROM categories WHERE slug = 'fotografo'),
  'Cobertura de Casamento',
  'Precisamos de fotógrafo para casamento no sábado. Evento das 16h às 23h.',
  'Alphaville, Barueri - SP',
  850.00,
  'open',
  NOW() + INTERVAL '1 day';