-- Tabela de equipamentos do profissional
CREATE TABLE public.professional_equipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para buscas por profissional
CREATE INDEX idx_prof_equipments_profile ON public.professional_equipments(profile_id);

-- Habilitar RLS
ALTER TABLE public.professional_equipments ENABLE ROW LEVEL SECURITY;

-- Leitura pública (para perfil público)
CREATE POLICY "equipments_read_all"
ON public.professional_equipments
FOR SELECT
USING (true);

-- Profissional gerencia seus próprios equipamentos
CREATE POLICY "equipments_own"
ON public.professional_equipments
FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Admin acesso total
CREATE POLICY "equipments_admin_all"
ON public.professional_equipments
FOR ALL
USING (((auth.jwt() -> 'app_metadata'::text) ->> 'user_type'::text) = 'admin'::text)
WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'user_type'::text) = 'admin'::text);

-- Trigger updated_at
CREATE TRIGGER update_prof_equipments_updated_at
BEFORE UPDATE ON public.professional_equipments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();