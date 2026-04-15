-- Revert withdrawn earnings back to available
UPDATE public.earnings
SET status = 'available', withdrawn_at = NULL
WHERE id = '163cd60f-b4b3-4f36-8180-eb0f5297b307';

-- Delete the test withdrawal
DELETE FROM public.withdrawals
WHERE id = '0863dc2f-4ab2-40b7-b6d9-898d58cce5cc';