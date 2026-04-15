
-- Insert missing earning for the completed contract
INSERT INTO public.earnings (
  profile_id, contract_id, opportunity_id,
  gross_amount, platform_fee, net_amount,
  status, created_at
)
SELECT
  c.professional_id,
  c.id,
  c.opportunity_id,
  o.budget,
  o.platform_fee,
  o.budget - o.platform_fee,
  'available',
  now()
FROM public.contracts c
JOIN public.opportunities o ON o.id = c.opportunity_id
WHERE c.status = 'completed'
AND NOT EXISTS (SELECT 1 FROM public.earnings e WHERE e.contract_id = c.id)
ON CONFLICT (contract_id) DO NOTHING;

-- Recreate trigger function to ensure it works
CREATE OR REPLACE FUNCTION public.handle_contract_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO earnings (
      profile_id, contract_id, opportunity_id,
      gross_amount, platform_fee, net_amount,
      status, created_at
    )
    SELECT
      NEW.professional_id,
      NEW.id,
      NEW.opportunity_id,
      o.budget,
      o.platform_fee,
      o.budget - o.platform_fee,
      'available',
      now()
    FROM opportunities o
    WHERE o.id = NEW.opportunity_id
    ON CONFLICT (contract_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger is properly attached
DROP TRIGGER IF EXISTS on_contract_completed ON public.contracts;
CREATE TRIGGER on_contract_completed
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_contract_completed();
