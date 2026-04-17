
CREATE POLICY "professional_select_related_clients"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Profissional pode ver perfil de cliente com quem tem conversa
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.client_id = profiles.id
      AND conversations.professional_id = auth.uid()
  )
  OR
  -- Profissional pode ver perfil de cliente com quem tem contrato
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.client_id = profiles.id
      AND contracts.professional_id = auth.uid()
  )
  OR
  -- Profissional pode ver perfil de cliente de oportunidades aceitas / em que ele é alvo
  EXISTS (
    SELECT 1 FROM public.opportunities
    WHERE opportunities.client_id = profiles.id
      AND (
        opportunities.accepted_by = auth.uid()
        OR opportunities.target_professional_id = auth.uid()
      )
  )
);
