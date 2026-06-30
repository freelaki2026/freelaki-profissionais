CREATE POLICY "profiles_select_counterparty" ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE (c.client_id = profiles.id AND c.professional_id = auth.uid())
       OR (c.professional_id = profiles.id AND c.client_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE (o.client_id = profiles.id AND o.accepted_by = auth.uid())
       OR (o.accepted_by = profiles.id AND o.client_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE (r.client_id = profiles.id AND r.professional_id = auth.uid())
       OR (r.professional_id = profiles.id AND r.client_id = auth.uid())
  )
);