-- Tabela leve para datas indisponíveis do profissional (dia inteiro)
CREATE TABLE public.professional_unavailable_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  unavailable_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (profile_id, unavailable_date)
);

-- Índices p/ leitura rápida (consulta por profissional + range de datas)
CREATE INDEX idx_pud_profile_date
  ON public.professional_unavailable_dates (profile_id, unavailable_date);

-- RLS
ALTER TABLE public.professional_unavailable_dates ENABLE ROW LEVEL SECURITY;

-- Profissional gerencia os próprios bloqueios
CREATE POLICY "pud_own_all"
ON public.professional_unavailable_dates
FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Qualquer usuário autenticado pode ler (clientes precisam ver a agenda do profissional)
CREATE POLICY "pud_read_authenticated"
ON public.professional_unavailable_dates
FOR SELECT
TO authenticated
USING (true);

-- Admin acesso total
CREATE POLICY "pud_admin_all"
ON public.professional_unavailable_dates
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));