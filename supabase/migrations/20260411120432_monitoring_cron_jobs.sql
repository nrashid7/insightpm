-- Enable pg_cron and pg_net extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule run-monitoring to execute every hour
-- pg_cron runs in the database context; we use pg_net to invoke the Edge Function
SELECT cron.schedule(
  'run-monitoring-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/run-monitoring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Add a data retention policy: delete feedback_items older than 90 days
-- that are not linked to a persisted analysis
SELECT cron.schedule(
  'cleanup-old-feedback',
  '0 3 * * 0',
  $$
  DELETE FROM public.feedback_items
  WHERE collected_at < NOW() - INTERVAL '90 days'
    AND analysis_id IS NULL;
  $$
);
