
-- Fix existing earnings: professional receives full budget
UPDATE public.earnings e
SET 
  net_amount = e.gross_amount,
  platform_fee = 0
WHERE e.platform_fee != 0 OR e.net_amount != e.gross_amount;

-- Recreate trigger function: professional gets 100% of budget
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
      0,
      o.budget,
      'available',
      now()
    FROM opportunities o
    WHERE o.id = NEW.opportunity_id
    ON CONFLICT (contract_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
