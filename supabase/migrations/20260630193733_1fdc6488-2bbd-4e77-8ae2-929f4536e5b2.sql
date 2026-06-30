
DO $$
DECLARE
  v_pro UUID := '28f18879-b916-4639-ae74-48635a2f35b1';
  v_cli1 UUID := '11111111-1111-1111-1111-111111111111';
  v_cli2 UUID := '22222222-2222-2222-2222-222222222222';
  v_cli3 UUID := '33333333-3333-3333-3333-333333333333';
  v_cat_film UUID := 'bfebb7ac-29d3-445a-883e-1ddcefc2eb7b';
  v_cat_video UUID := '6bee467c-2343-4352-8d73-c7b585793eb6';
  v_cat_foto UUID := 'd29c1803-e67f-4894-844d-5eac9bb462d8';
  v_op_completed UUID := 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa';
  v_op_inprog UUID    := 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa';
  v_op_awaitsig UUID  := 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa';
  v_op_accepted UUID  := 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa';
  v_op_open UUID      := 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa';
  v_ct_completed UUID := 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb';
  v_ct_inprog UUID    := 'bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb';
  v_ct_signed UUID    := 'bbbbbbbb-0003-0003-0003-bbbbbbbbbbbb';
  v_conv1 UUID := 'cccccccc-0001-0001-0001-cccccccccccc';
  v_conv2 UUID := 'cccccccc-0002-0002-0002-cccccccccccc';
  v_conv3 UUID := 'cccccccc-0003-0003-0003-cccccccccccc';
BEGIN

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new
) VALUES
  (v_cli1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'marina.silveira+demo@freelaki.com', crypt('demo-pass-2026', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Marina Silveira"}'::jsonb,
   NOW() - INTERVAL '90 days', NOW(), '', '', '', ''),
  (v_cli2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rafael.mendes+demo@freelaki.com', crypt('demo-pass-2026', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Rafael Mendes"}'::jsonb,
   NOW() - INTERVAL '60 days', NOW(), '', '', '', ''),
  (v_cli3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'agencia.pulse+demo@freelaki.com', crypt('demo-pass-2026', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Agência Pulse"}'::jsonb,
   NOW() - INTERVAL '30 days', NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

SET LOCAL session_replication_role = 'replica';

INSERT INTO public.profiles (id, email, full_name, user_type, is_approved, approval_status, phone, bio, avatar_url, created_at)
VALUES
  (v_cli1, 'marina.silveira+demo@freelaki.com', 'Marina Silveira', 'client', true, 'approved',
   '+5511988770011', 'Produtora de eventos corporativos.',
   'https://i.pravatar.cc/300?img=47', NOW() - INTERVAL '90 days'),
  (v_cli2, 'rafael.mendes+demo@freelaki.com', 'Rafael Mendes', 'client', true, 'approved',
   '+5511988770022', 'Casamentos e ensaios.',
   'https://i.pravatar.cc/300?img=12', NOW() - INTERVAL '60 days'),
  (v_cli3, 'agencia.pulse+demo@freelaki.com', 'Agência Pulse', 'client', true, 'approved',
   '+5511988770033', 'Agência de marketing — demandas recorrentes.',
   'https://i.pravatar.cc/300?img=68', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  user_type = EXCLUDED.user_type,
  is_approved = EXCLUDED.is_approved,
  approval_status = EXCLUDED.approval_status,
  phone = EXCLUDED.phone,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url;

INSERT INTO public.opportunities (
  id, client_id, accepted_by, category_id, title, description,
  location_address, location_lat, location_lng, is_remote,
  budget, subtotal, platform_fee, total_amount,
  status, accepted_at, scheduled_at, duration_hours, created_at
) VALUES
  (v_op_completed, v_cli1, v_pro, v_cat_film,
   'Cobertura de evento corporativo — Hotel Pullman',
   'Filmagem de abertura, depoimentos com 5 executivos e bastidores. Teaser em 24h.',
   'Hotel Pullman Vila Olímpia, São Paulo - SP', -23.5947, -46.6873, false,
   1800, 1800, 90, 1890, 'completed',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '12 days', 6, NOW() - INTERVAL '16 days'),
  (v_op_inprog, v_cli2, v_pro, v_cat_foto,
   'Ensaio fotográfico — pré-wedding em Ibirapuera',
   'Ensaio de 2h, edição básica de 30 fotos e galeria online.',
   'Parque Ibirapuera, São Paulo - SP', -23.5872, -46.6577, false,
   1200, 1200, 60, 1260, 'in_progress',
   NOW() - INTERVAL '3 days', NOW() + INTERVAL '1 day', 2, NOW() - INTERVAL '5 days'),
  (v_op_awaitsig, v_cli3, v_pro, v_cat_video,
   'Vídeo institucional — Agência Pulse',
   'Produção de vídeo de 90s para campanha digital. Roteiro, captação e edição.',
   'Av. Paulista, 1374 - São Paulo, SP', -23.5613, -46.6562, false,
   2500, 2500, 125, 2625, 'awaiting_signatures',
   NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', 8, NOW() - INTERVAL '2 days'),
  (v_op_accepted, v_cli1, v_pro, v_cat_foto,
   'Fotos de produto — linha skincare',
   'Sessão em estúdio, 20 fotos finais tratadas.',
   'Estúdio Pinheiros - São Paulo, SP', -23.5614, -46.6928, false,
   900, 900, 45, 945, 'accepted',
   NOW() - INTERVAL '6 hours', NOW() + INTERVAL '3 days', 4, NOW() - INTERVAL '8 hours'),
  (v_op_open, v_cli2, NULL, v_cat_film,
   'Aftermovie de casamento — Sítio Santa Inês',
   'Cerimônia + festa, aftermovie 3-4 min em 30 dias.',
   'Sítio Santa Inês, Cotia - SP', -23.6042, -46.9182, false,
   3800, 3800, 190, 3990, 'open',
   NULL, NOW() + INTERVAL '21 days', 10, NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contracts (
  id, opportunity_id, client_id, professional_id, contract_text,
  client_signed, client_signed_at, professional_signed, professional_signed_at,
  status, contract_version, contract_hash,
  work_started_at, work_finished_at, completion_requested_at, completion_confirmed_at, completed_at,
  asaas_payment_status, payment_method, created_at
) VALUES
  (v_ct_completed, v_op_completed, v_cli1, v_pro,
   'CONTRATO DE PRESTAÇÃO DE SERVIÇOS — Cobertura Hotel Pullman [assinado]',
   true, NOW() - INTERVAL '14 days', true, NOW() - INTERVAL '14 days' + INTERVAL '15 minutes',
   'completed', '1.0', encode(extensions.digest('demo-1','sha256'),'hex'),
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days' + INTERVAL '6 hours',
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days' + INTERVAL '2 hours',
   NOW() - INTERVAL '11 days' + INTERVAL '2 hours',
   'RECEIVED', 'PIX', NOW() - INTERVAL '15 days'),
  (v_ct_inprog, v_op_inprog, v_cli2, v_pro,
   'CONTRATO — Pré-wedding Ibirapuera [assinado]',
   true, NOW() - INTERVAL '3 days', true, NOW() - INTERVAL '3 days' + INTERVAL '10 minutes',
   'in_progress', '1.0', encode(extensions.digest('demo-2','sha256'),'hex'),
   NOW() - INTERVAL '6 hours', NULL, NULL, NULL, NULL,
   'CONFIRMED', 'PIX', NOW() - INTERVAL '4 days'),
  (v_ct_signed, v_op_awaitsig, v_cli3, v_pro,
   'CONTRATO — Vídeo institucional Pulse [aguardando profissional]',
   true, NOW() - INTERVAL '20 hours', false, NULL,
   'client_signed', '1.0', encode(extensions.digest('demo-3','sha256'),'hex'),
   NULL, NULL, NULL, NULL, NULL,
   'PENDING', NULL, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.conversations (id, professional_id, client_id, opportunity_id, last_message, last_message_at, unread_pro, unread_client, created_at)
VALUES
  (v_conv1, v_pro, v_cli1, v_op_completed,
   'Show, obrigada! Recebi o link, ficou perfeito 🙌', NOW() - INTERVAL '10 days', 0, 0,
   NOW() - INTERVAL '14 days'),
  (v_conv2, v_pro, v_cli2, v_op_inprog,
   'Combinado! Te encontro amanhã 14h na entrada do parque.', NOW() - INTERVAL '40 minutes', 2, 0,
   NOW() - INTERVAL '3 days'),
  (v_conv3, v_pro, v_cli3, v_op_awaitsig,
   'Acabei de assinar do meu lado. Só falta você 👍', NOW() - INTERVAL '18 hours', 0, 1,
   NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (conversation_id, sender_id, body, is_read, created_at) VALUES
  (v_conv1, v_cli1, 'Oi Thiago! Você cobre nosso evento dia 18? Hotel Pullman, 18h às 23h.', true, NOW() - INTERVAL '14 days'),
  (v_conv1, v_pro,  'Oi Marina, consigo! Já aceitei pela plataforma.', true, NOW() - INTERVAL '14 days' + INTERVAL '5 minutes'),
  (v_conv1, v_cli1, 'Perfeito! Já assinei o contrato.', true, NOW() - INTERVAL '14 days' + INTERVAL '12 minutes'),
  (v_conv1, v_pro,  'Assinei também. Nos vemos no dia 👊', true, NOW() - INTERVAL '14 days' + INTERVAL '16 minutes'),
  (v_conv1, v_pro,  'Teaser pronto! Link: freelaki.com/entrega/teaser-pullman', true, NOW() - INTERVAL '11 days' + INTERVAL '20 hours'),
  (v_conv1, v_cli1, 'Show, obrigada! Recebi o link, ficou perfeito 🙌', true, NOW() - INTERVAL '10 days'),
  (v_conv2, v_cli2, 'Thiago, bora fechar o pré-wedding pra sábado?', true, NOW() - INTERVAL '3 days'),
  (v_conv2, v_pro,  'Opa Rafael, fechado! Ibirapuera 14h tá bom?', true, NOW() - INTERVAL '3 days' + INTERVAL '8 minutes'),
  (v_conv2, v_cli2, 'Ótimo! Assinei o contrato.', true, NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),
  (v_conv2, v_pro,  'Assinei também ✅', true, NOW() - INTERVAL '3 days' + INTERVAL '20 minutes'),
  (v_conv2, v_cli2, 'Levo o vestido extra ou só o combinado?', false, NOW() - INTERVAL '2 hours'),
  (v_conv2, v_cli2, 'Combinado! Te encontro amanhã 14h na entrada do parque.', false, NOW() - INTERVAL '40 minutes'),
  (v_conv3, v_cli3, 'Oi Thiago, mandamos o briefing. Topa?', true, NOW() - INTERVAL '1 day'),
  (v_conv3, v_pro,  'Topo sim! Aguardo a geração do contrato.', true, NOW() - INTERVAL '1 day' + INTERVAL '6 minutes'),
  (v_conv3, v_pro,  'Acabei de assinar do meu lado. Só falta você 👍', true, NOW() - INTERVAL '18 hours');

INSERT INTO public.earnings (profile_id, contract_id, opportunity_id, gross_amount, platform_fee, net_amount, status, available_at, withdrawn_at, description, created_at, transfer_status)
VALUES
  (v_pro, v_ct_completed, v_op_completed, 1800, 90, 1710, 'available',
   NOW() - INTERVAL '10 days', NULL, 'Cobertura Hotel Pullman', NOW() - INTERVAL '11 days', 'AVAILABLE'),
  (v_pro, v_ct_inprog, v_op_inprog, 1200, 60, 1140, 'reserved',
   NULL, NULL, 'Pré-wedding Ibirapuera (em andamento)', NOW() - INTERVAL '3 days', 'PENDING'),
  (v_pro, NULL, NULL, 950, 47.50, 902.50, 'withdrawn',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '20 days',
   'Cobertura aniversário 50 anos', NOW() - INTERVAL '45 days', 'COMPLETED');

INSERT INTO public.withdrawals (profile_id, amount, status, processed_at, created_at, asaas_status, pix_key, pix_key_type)
VALUES
  (v_pro, 902.50, 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days',
   'CONFIRMED', '***.***.***-19', 'CPF');

INSERT INTO public.notifications (profile_id, type, title, body, action_url, is_read, created_at)
VALUES
  (v_pro, 'contrato', '✅ Pagamento confirmado',
   'R$ 1.710,00 liberados na sua carteira pelo evento Hotel Pullman.',
   '/ganhos', true, NOW() - INTERVAL '10 days'),
  (v_pro, 'oportunidade', '🎯 Nova oportunidade combina com você',
   'Aftermovie de casamento em Cotia/SP — R$ 3.800,00',
   '/oportunidade/' || v_op_open::text, false, NOW() - INTERVAL '12 hours'),
  (v_pro, 'contrato', '✍️ Assine o contrato!',
   'O cliente já assinou. Assine para iniciar o vídeo institucional.',
   '/contratos', false, NOW() - INTERVAL '18 hours');

SET LOCAL session_replication_role = 'origin';

END $$;
