
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('suporte','cliente','oportunidade','contrato','sistema')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  action_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_all_own"
  ON public.notifications FOR ALL
  USING (auth.uid() = profile_id);

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.notifications (profile_id, type, title, body, action_url)
SELECT
  id,
  'suporte',
  'Bem-vindo à Freelaki! 👋',
  'Sua conta foi criada com sucesso. Envie seus documentos para começar a receber oportunidades.',
  '/documentos'
FROM public.profiles
WHERE user_type = 'professional'
ON CONFLICT DO NOTHING;
