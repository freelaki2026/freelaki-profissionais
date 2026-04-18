CREATE POLICY "reviews_insert_professional"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = professional_id
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.opportunity_id = reviews.opportunity_id
      AND c.professional_id = auth.uid()
      AND c.client_id = reviews.client_id
      AND c.status = 'completed'
  )
);