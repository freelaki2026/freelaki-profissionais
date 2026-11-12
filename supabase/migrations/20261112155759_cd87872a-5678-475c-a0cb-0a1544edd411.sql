DO $$
DECLARE v UUID := '99999999-0000-0000-0000-000000000001'; c UUID;
BEGIN
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
VALUES (v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','demo@freelaki.com',crypt('DemoFreelaki2026!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Profissional Demo"}'::jsonb,NOW(),NOW(),'','','','')
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
VALUES (gen_random_uuid(), v, v::text, jsonb_build_object('sub',v::text,'email','demo@freelaki.com','email_verified',true),'email',NOW(),NOW(),NOW())
ON CONFLICT DO NOTHING;
SET LOCAL session_replication_role = 'replica';
INSERT INTO public.profiles (id,email,full_name,user_type,is_approved,approval_status,tour_completed_at)
VALUES (v,'demo@freelaki.com','Profissional Demo','professional',true,'approved',NOW())
ON CONFLICT (id) DO UPDATE SET full_name=EXCLUDED.full_name, deletion_requested_at=NULL;
SELECT id INTO c FROM public.categories LIMIT 1;
IF c IS NOT NULL THEN
  INSERT INTO public.professional_categories (profile_id, category_id) VALUES (v,c) ON CONFLICT DO NOTHING;
END IF;
END $$;