-- ============================================================
-- Waitlist applications (pré-cadastro)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.waitlist_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  portfolio_url TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  invite_code TEXT UNIQUE,
  code_used_at TIMESTAMPTZ,
  code_expires_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist_applications(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist_applications(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_invite_code ON public.waitlist_applications(invite_code);

ALTER TABLE public.waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler/atualizar (RPCs públicas cuidam do resto)
CREATE POLICY "waitlist_admin_all"
ON public.waitlist_applications
FOR ALL
USING (((auth.jwt() -> 'app_metadata') ->> 'user_type') = 'admin')
WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'user_type') = 'admin');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.waitlist_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_updated_at ON public.waitlist_applications;
CREATE TRIGGER trg_waitlist_updated_at
BEFORE UPDATE ON public.waitlist_applications
FOR EACH ROW EXECUTE FUNCTION public.waitlist_set_updated_at();

-- ============================================================
-- RPC: submit_waitlist_application (pública, sem auth)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_waitlist_application(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_city TEXT,
  p_state TEXT,
  p_category_id UUID,
  p_portfolio_url TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_existing public.waitlist_applications%ROWTYPE;
  v_new_id UUID;
  v_admin RECORD;
BEGIN
  -- Validações básicas
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_name');
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN json_build_object('success', false, 'error', 'invalid_email');
  END IF;
  IF p_phone IS NULL OR length(regexp_replace(p_phone, '\D', '', 'g')) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_phone');
  END IF;

  -- Já existe?
  SELECT * INTO v_existing FROM public.waitlist_applications WHERE email = v_email;
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status = 'approved' THEN
      RETURN json_build_object('success', false, 'error', 'already_approved');
    ELSIF v_existing.status = 'pending' THEN
      RETURN json_build_object('success', false, 'error', 'already_pending');
    ELSE
      RETURN json_build_object('success', false, 'error', 'already_rejected');
    END IF;
  END IF;

  -- Já existe profile com esse email?
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = v_email) THEN
    RETURN json_build_object('success', false, 'error', 'already_registered');
  END IF;

  INSERT INTO public.waitlist_applications (
    full_name, email, phone, city, state, category_id, portfolio_url, message
  ) VALUES (
    trim(p_full_name), v_email, trim(p_phone), trim(p_city), trim(p_state),
    p_category_id, NULLIF(trim(p_portfolio_url), ''), NULLIF(trim(p_message), '')
  ) RETURNING id INTO v_new_id;

  -- Notifica todos os admins
  FOR v_admin IN SELECT id FROM public.profiles WHERE user_type = 'admin' LOOP
    INSERT INTO public.notifications (profile_id, type, title, body, action_url)
    VALUES (
      v_admin.id,
      'sistema',
      '🆕 Nova candidatura no Freelaki',
      trim(p_full_name) || ' quer entrar como profissional.',
      '/waitlist/' || v_new_id::text
    );
  END LOOP;

  RETURN json_build_object('success', true, 'id', v_new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_waitlist_application(TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT) TO anon, authenticated;

-- ============================================================
-- RPC: validate_invite_code (pública)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_invite_code(
  p_code TEXT,
  p_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_app public.waitlist_applications%ROWTYPE;
  v_email TEXT := lower(trim(p_email));
  v_code TEXT := upper(trim(p_code));
BEGIN
  SELECT * INTO v_app FROM public.waitlist_applications
  WHERE invite_code = v_code AND status = 'approved';

  IF v_app.id IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'code_not_found');
  END IF;
  IF v_app.code_used_at IS NOT NULL THEN
    RETURN json_build_object('valid', false, 'error', 'code_already_used');
  END IF;
  IF v_app.code_expires_at IS NOT NULL AND v_app.code_expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'code_expired');
  END IF;
  IF v_app.email <> v_email THEN
    RETURN json_build_object('valid', false, 'error', 'email_mismatch');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'application_id', v_app.id,
    'email', v_app.email,
    'full_name', v_app.full_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT,TEXT) TO anon, authenticated;

-- ============================================================
-- RPC: consume_invite_code (chamada após cadastro concluído)
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_invite_code(
  p_code TEXT,
  p_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_app public.waitlist_applications%ROWTYPE;
  v_email TEXT := lower(trim(p_email));
  v_code TEXT := upper(trim(p_code));
BEGIN
  SELECT * INTO v_app FROM public.waitlist_applications
  WHERE invite_code = v_code AND status = 'approved' AND email = v_email;

  IF v_app.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid');
  END IF;
  IF v_app.code_used_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_used');
  END IF;
  IF v_app.code_expires_at IS NOT NULL AND v_app.code_expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'expired');
  END IF;

  UPDATE public.waitlist_applications
  SET code_used_at = now()
  WHERE id = v_app.id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_invite_code(TEXT,TEXT) TO anon, authenticated;

-- ============================================================
-- RPC: approve_waitlist_application (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_waitlist_application(
  p_application_id UUID,
  p_expiry_days INT DEFAULT 30
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_app public.waitlist_applications%ROWTYPE;
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_app FROM public.waitlist_applications WHERE id = p_application_id;
  IF v_app.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;
  IF v_app.status = 'approved' AND v_app.invite_code IS NOT NULL THEN
    RETURN json_build_object('success', true, 'invite_code', v_app.invite_code, 'already_approved', true);
  END IF;

  -- Gerar código único FRLK-XXXXXX
  LOOP
    v_code := 'FRLK-' || upper(substring(encode(extensions.gen_random_bytes(4), 'hex') from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.waitlist_applications WHERE invite_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RETURN json_build_object('success', false, 'error', 'code_generation_failed');
    END IF;
  END LOOP;

  UPDATE public.waitlist_applications SET
    status = 'approved',
    invite_code = v_code,
    code_expires_at = now() + (p_expiry_days || ' days')::interval,
    approved_by = auth.uid(),
    approved_at = now(),
    rejected_reason = NULL,
    rejected_at = NULL
  WHERE id = p_application_id;

  RETURN json_build_object('success', true, 'invite_code', v_code, 'expires_at', (now() + (p_expiry_days || ' days')::interval));
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_waitlist_application(UUID,INT) TO authenticated;

-- ============================================================
-- RPC: reject_waitlist_application (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_waitlist_application(
  p_application_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.waitlist_applications SET
    status = 'rejected',
    rejected_reason = p_reason,
    rejected_at = now(),
    invite_code = NULL,
    code_expires_at = NULL
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_waitlist_application(UUID,TEXT) TO authenticated;