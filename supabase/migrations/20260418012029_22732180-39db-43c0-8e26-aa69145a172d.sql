-- Sincronizar opportunity.status com contract.status quando contrato é finalizado
CREATE OR REPLACE FUNCTION public.sync_opportunity_on_contract_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.opportunities
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.opportunity_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_on_contract_completed ON public.contracts;
CREATE TRIGGER trg_sync_opportunity_on_contract_completed
AFTER UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_opportunity_on_contract_completed();

-- Backfill: corrigir oportunidades já com contrato concluído
UPDATE public.opportunities o
SET status = 'completed', updated_at = NOW()
FROM public.contracts c
WHERE c.opportunity_id = o.id
  AND c.status = 'completed'
  AND o.status <> 'completed';