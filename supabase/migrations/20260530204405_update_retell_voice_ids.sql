UPDATE agent_templates
SET config = jsonb_set(config, '{voice,retell_voice_id}', '"retell-Willa"', true)
WHERE slug = 'zia';

UPDATE agent_templates
SET config = jsonb_set(config, '{voice,retell_voice_id}', '"cartesia-Adam"', true)
WHERE slug = 'sparky';
