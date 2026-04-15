
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'auto-confirm-completion-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://chkeoqugdcciojzmuczr.supabase.co/functions/v1/auto-confirm-completion',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa2VvcXVnZGNjaW9qem11Y3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE1MzYsImV4cCI6MjA5MDYxNzUzNn0.HRmiCD3MGeODnNh0To6PEKig2Za6pWUL-pZKzmuwAxA"}'::jsonb,
      body := concat('{"time": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);
