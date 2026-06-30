DO $$
DECLARE
  pro1 uuid := '44444444-4444-4444-4444-444444444401';
  pro2 uuid := '44444444-4444-4444-4444-444444444402';
  pro3 uuid := '44444444-4444-4444-4444-444444444403';
  pro4 uuid := '44444444-4444-4444-4444-444444444404';
  pro5 uuid := '44444444-4444-4444-4444-444444444405';
  cli1 uuid := '11111111-1111-1111-1111-111111111111';
  cli2 uuid := '22222222-2222-2222-2222-222222222222';
  cli3 uuid := '33333333-3333-3333-3333-333333333333';
BEGIN
  SET LOCAL session_replication_role = 'replica';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
   (pro1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','fake.beatriz@demo.local','x',now(),now(),now(),'{"provider":"email"}','{}',false,'','','',''),
   (pro2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','fake.rodrigo@demo.local','x',now(),now(),now(),'{"provider":"email"}','{}',false,'','','',''),
   (pro3,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','fake.camila@demo.local','x',now(),now(),now(),'{"provider":"email"}','{}',false,'','','',''),
   (pro4,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','fake.diego@demo.local','x',now(),now(),now(),'{"provider":"email"}','{}',false,'','','',''),
   (pro5,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','fake.juliana@demo.local','x',now(),now(),now(),'{"provider":"email"}','{}',false,'','','','')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, full_name, email, user_type, avatar_url, is_approved, created_at)
  VALUES
   (pro1,'Beatriz Almeida','fake.beatriz@demo.local','professional','https://i.pravatar.cc/300?img=45',true,now()),
   (pro2,'Rodrigo Mendes','fake.rodrigo@demo.local','professional','https://i.pravatar.cc/300?img=13',true,now()),
   (pro3,'Camila Rocha','fake.camila@demo.local','professional','https://i.pravatar.cc/300?img=49',true,now()),
   (pro4,'Diego Martins','fake.diego@demo.local','professional','https://i.pravatar.cc/300?img=33',true,now()),
   (pro5,'Juliana Souza','fake.juliana@demo.local','professional','https://i.pravatar.cc/300?img=44',true,now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO opportunities (id, client_id, title, description, status, total_amount, created_at)
  VALUES
   ('cccccccc-0001-0001-0001-cccccccccc01',cli1,'Ensaio externo Vila Madalena','','completed',850,now()-interval '40 days'),
   ('cccccccc-0001-0001-0001-cccccccccc02',cli1,'Cobertura aniversário 30 anos','','completed',1200,now()-interval '70 days'),
   ('cccccccc-0001-0001-0001-cccccccccc03',cli1,'Fotos corporativas LinkedIn','','completed',600,now()-interval '110 days'),
   ('cccccccc-0001-0001-0001-cccccccccc04',cli1,'Vídeo curto institucional','','completed',1800,now()-interval '150 days'),
   ('cccccccc-0002-0002-0002-cccccccccc01',cli2,'Pré-wedding praia Guarujá','','completed',1500,now()-interval '60 days'),
   ('cccccccc-0002-0002-0002-cccccccccc02',cli2,'Ensaio noivado','','completed',900,now()-interval '90 days'),
   ('cccccccc-0003-0003-0003-cccccccccc01',cli3,'Reels mensais — Pulse','','completed',2200,now()-interval '50 days'),
   ('cccccccc-0003-0003-0003-cccccccccc02',cli3,'Vídeo case cliente','','completed',3400,now()-interval '100 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO reviews (opportunity_id, client_id, professional_id, rating, comment, created_at) VALUES
   ('cccccccc-0001-0001-0001-cccccccccc01',cli1,pro1,5,'Marina foi super atenciosa, deu todos os detalhes do briefing antes do ensaio. Comunicação ótima e pagou na data. Recomendo!',now()-interval '39 days'),
   ('cccccccc-0001-0001-0001-cccccccccc02',cli1,pro2,5,'Cliente excelente! Local organizado, equipe receptiva e feedback rápido nas prévias. Voltaria com certeza.',now()-interval '69 days'),
   ('cccccccc-0001-0001-0001-cccccccccc03',cli1,pro3,5,'Pontual, respeitosa e muito clara no que queria. Tornou o trabalho muito mais fluido.',now()-interval '109 days'),
   ('cccccccc-0001-0001-0001-cccccccccc04',cli1,pro4,4,'Trabalho tranquilo, alinhamento prévio bem feito. Apenas alguns ajustes de pauta no dia, mas nada que atrapalhasse.',now()-interval '149 days'),
   ('cccccccc-0002-0002-0002-cccccccccc01',cli2,pro1,5,'Rafael e a noiva foram super gente boa. Ambiente leve, contrato pago antes mesmo da entrega final.',now()-interval '59 days'),
   ('cccccccc-0002-0002-0002-cccccccccc02',cli2,pro5,5,'Cliente parceiro, top de linha! Indico a todos os colegas.',now()-interval '89 days'),
   ('cccccccc-0003-0003-0003-cccccccccc01',cli3,pro2,5,'Agência muito profissional, briefings escritos, deadlines respeitados, pagamento imediato.',now()-interval '49 days'),
   ('cccccccc-0003-0003-0003-cccccccccc02',cli3,pro4,5,'Trabalho recorrente com a Pulse há meses. Equipe organizada e exigente no bom sentido.',now()-interval '99 days')
  ON CONFLICT DO NOTHING;
END $$;