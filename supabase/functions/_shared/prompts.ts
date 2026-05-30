export interface BusinessPromptData {
  name: string;
  website?: string | null;
  phone?: string | null;
  timezone?: string;
  hours?: Record<string, { open: string; close: string; closed?: boolean }>;
  industry?: string;
}

export interface TemplatePromptData {
  system_prompt: string;
  objection_handlers?: Array<{ trigger: string; response: string }>;
  booking_rules?: string[];
  escalation_rules?: Array<{ condition: string; action: string }>;
  faq_rules?: string[];
  qualification_questions?: string[];
}

export function mergeTemplateVariables(
  template: string,
  business: BusinessPromptData,
): string {
  const hoursText = formatBusinessHours(business.hours);

  const replacements: Record<string, string> = {
    business_name: business.name,
    business_website: business.website ?? "N/A",
    business_phone: business.phone ?? "N/A",
    business_timezone: business.timezone ?? "America/New_York",
    business_hours: hoursText,
    business_industry: business.industry ?? "general_smb",
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return replacements[key] ?? `{{${key}}}`;
  });
}

export function buildSystemPrompt(
  template: TemplatePromptData,
  business: BusinessPromptData,
  knowledgeContext?: string,
): string {
  const sections: string[] = [
    mergeTemplateVariables(template.system_prompt, business),
  ];

  if (template.qualification_questions?.length) {
    sections.push(
      "## Qualification Questions\n" +
        template.qualification_questions.map((q) => `- ${q}`).join("\n"),
    );
  }

  if (template.booking_rules?.length) {
    sections.push(
      "## Booking Rules\n" +
        template.booking_rules.map((r) => `- ${r}`).join("\n"),
    );
  }

  if (template.escalation_rules?.length) {
    sections.push(
      "## Escalation Rules\n" +
        template.escalation_rules
          .map((r) => `- When: ${r.condition} → Action: ${r.action}`)
          .join("\n"),
    );
  }

  if (template.faq_rules?.length) {
    sections.push(
      "## FAQ Guidelines\n" +
        template.faq_rules.map((r) => `- ${r}`).join("\n"),
    );
  }

  if (template.objection_handlers?.length) {
    sections.push(
      "## Objection Handlers\n" +
        template.objection_handlers
          .map((h) =>
            `- If caller says "${h.trigger}": ${mergeTemplateVariables(h.response, business)}`
          )
          .join("\n"),
    );
  }

  if (knowledgeContext) {
    sections.push(`## Knowledge Base Context\n${knowledgeContext}`);
  }

  sections.push(
    "\nAlways be professional, concise, and helpful. Use tools when needed. Never invent facts not supported by the knowledge base or business info.",
  );

  return sections.join("\n\n");
}

function formatBusinessHours(
  hours?: Record<string, { open: string; close: string; closed?: boolean }>,
): string {
  if (!hours || Object.keys(hours).length === 0) {
    return "Monday-Friday 9:00 AM - 5:00 PM";
  }

  return Object.entries(hours)
    .map(([day, schedule]) => {
      if (schedule.closed) return `${capitalize(day)}: Closed`;
      return `${capitalize(day)}: ${schedule.open} - ${schedule.close}`;
    })
    .join(", ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
