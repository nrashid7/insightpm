-- Paste this in Supabase Dashboard → SQL Editor → Run
-- Syncs BusinessVoice n8n webhooks (Railway production)

DO $$
DECLARE
  wf RECORD;
BEGIN
  FOR wf IN SELECT * FROM (VALUES
    ('Call Completed Router', 'https://n8n-production-08c9.up.railway.app/webhook/call-completed', '{"type":"router","dispatch_target":true}'::jsonb, 'call-completed'),
    ('SMS Follow-Up', 'https://n8n-production-08c9.up.railway.app/webhook/sms-follow-up', '{"type":"sms"}'::jsonb, 'sms-follow-up'),
    ('HubSpot Sync', 'https://n8n-production-08c9.up.railway.app/webhook/hubspot-sync', '{"type":"crm","provider":"hubspot"}'::jsonb, 'hubspot-sync'),
    ('GoHighLevel Sync', 'https://n8n-production-08c9.up.railway.app/webhook/ghl-sync', '{"type":"crm","provider":"gohighlevel"}'::jsonb, 'ghl-sync'),
    ('Google Sheets Log', 'https://n8n-production-08c9.up.railway.app/webhook/sheets-log', '{"type":"crm","provider":"google_sheets"}'::jsonb, 'sheets-log')
  ) AS t(name, webhook_url, config, slug)
  LOOP
    IF EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.name = wf.name AND workflows.business_id IS NULL
    ) THEN
      UPDATE workflows SET
        webhook_url = wf.webhook_url,
        n8n_workflow_id = wf.slug,
        is_active = true,
        config = wf.config
      WHERE workflows.name = wf.name AND workflows.business_id IS NULL;
    ELSE
      INSERT INTO workflows (name, webhook_url, n8n_workflow_id, is_active, config, business_id)
      VALUES (wf.name, wf.webhook_url, wf.slug, true, wf.config, NULL);
    END IF;
  END LOOP;
END $$;

SELECT name, webhook_url, is_active, config->>'type' AS type
FROM workflows
WHERE business_id IS NULL
ORDER BY name;
