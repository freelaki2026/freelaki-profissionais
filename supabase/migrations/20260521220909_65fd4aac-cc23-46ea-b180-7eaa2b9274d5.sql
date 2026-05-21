CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove previous schedule if it exists (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('purge-deleted-accounts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-deleted-accounts',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://chkeoqugdcciojzmuczr.supabase.co/functions/v1/purge-account',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa2VvcXVnZGNjaW9qem11Y3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE1MzYsImV4cCI6MjA5MDYxNzUzNn0.HRmiCD3MGeODnNh0To6PEKig2Za6pWUL-pZKzmuwAxA'
    ),
    body := '{}'::jsonb
  );
  $$
);