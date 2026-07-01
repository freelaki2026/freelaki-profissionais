UPDATE auth.users
SET encrypted_password = crypt('DemoFreelaki2026!', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '22222222-2222-2222-2222-222222222222';