
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id  UUID REFERENCES public.opportunities(id),
  last_message    TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_pro      INT DEFAULT 0,
  unread_client   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, client_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT,
  file_url        TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_own"
  ON public.conversations FOR ALL
  USING (auth.uid() = professional_id OR auth.uid() = client_id);

CREATE POLICY "msg_own"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (professional_id = auth.uid() OR client_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message = NEW.body,
    last_message_at = NEW.created_at,
    unread_pro = CASE
      WHEN NEW.sender_id != professional_id THEN unread_pro + 1
      ELSE unread_pro
    END,
    unread_client = CASE
      WHEN NEW.sender_id != client_id THEN unread_client + 1
      ELSE unread_client
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();
