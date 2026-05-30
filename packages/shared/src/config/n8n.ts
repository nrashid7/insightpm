/** BusinessVoice AI — n8n Railway production instance */
export const N8N_BASE_URL = "https://n8n-production-08c9.up.railway.app";
export const N8N_WEBHOOK_BASE = `${N8N_BASE_URL}/webhook`;

export const N8N_WEBHOOKS = {
  callCompleted: `${N8N_WEBHOOK_BASE}/call-completed`,
  smsFollowUp: `${N8N_WEBHOOK_BASE}/sms-follow-up`,
  hubspotSync: `${N8N_WEBHOOK_BASE}/hubspot-sync`,
  ghlSync: `${N8N_WEBHOOK_BASE}/ghl-sync`,
  sheetsLog: `${N8N_WEBHOOK_BASE}/sheets-log`,
} as const;
