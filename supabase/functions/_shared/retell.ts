import { AppError } from "./errors.ts";

const RETELL_API_BASE = "https://api.retellai.com";

function getRetellApiKey(): string {
  const key = Deno.env.get("RETELL_API_KEY");
  if (!key) {
    throw new AppError("Missing RETELL_API_KEY", 500, "CONFIG_ERROR");
  }
  return key;
}

async function retellFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${RETELL_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getRetellApiKey()}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(`Retell API error: ${text}`, response.status, "RETELL_ERROR");
  }

  return await response.json() as T;
}

export interface RetellLlmConfig {
  model?: string;
  model_temperature?: number;
  general_prompt?: string;
  begin_message?: string;
  general_tools?: RetellCustomTool[];
}

export interface RetellCustomTool {
  type: "custom" | "transfer_call";
  name: string;
  description: string;
  url?: string;
  speak_during_execution?: boolean;
  speak_after_execution?: boolean;
  parameters?: Record<string, unknown>;
  transfer_destination?: {
    type: "predefined";
    number: string;
  };
}

export interface RetellAgentConfig {
  agent_name: string;
  voice_id: string;
  response_engine: {
    type: "retell-llm";
    llm_id: string;
  };
  language?: string;
  webhook_url?: string;
  enable_backchannel?: boolean;
  ambient_sound?: string;
}

export async function createRetellLlm(config: RetellLlmConfig): Promise<{ llm_id: string }> {
  return await retellFetch("/create-retell-llm", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export async function updateRetellLlm(
  llmId: string,
  config: Partial<RetellLlmConfig>,
): Promise<{ llm_id: string }> {
  return await retellFetch(`/update-retell-llm/${llmId}`, {
    method: "PATCH",
    body: JSON.stringify(config),
  });
}

export async function createRetellAgent(
  config: RetellAgentConfig,
): Promise<{ agent_id: string }> {
  return await retellFetch("/create-agent", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export async function updateRetellAgent(
  agentId: string,
  config: Partial<RetellAgentConfig>,
): Promise<{ agent_id: string }> {
  return await retellFetch(`/update-agent/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify(config),
  });
}

export async function createRetellPhoneNumber(
  agentId: string,
  areaCode?: number,
): Promise<{ phone_number: string; phone_number_pretty?: string }> {
  return await retellFetch("/create-phone-number", {
    method: "POST",
    body: JSON.stringify({
      agent_id: agentId,
      ...(areaCode ? { area_code: areaCode } : {}),
    }),
  });
}

export function buildQualifyLeadTool(
  functionUrl: string,
  businessId: string,
): RetellCustomTool {
  return {
    type: "custom",
    name: "qualify_lead",
    description: "Record lead qualification answers and score the lead.",
    url: functionUrl,
    speak_during_execution: false,
    speak_after_execution: true,
    parameters: {
      type: "object",
      properties: {
        business_id: { type: "string", const: businessId },
        call_id: { type: "string", description: "Current call ID if available" },
        name: { type: "string" },
        email: { type: "string" },
        company: { type: "string" },
        need: { type: "string" },
        timeline: { type: "string" },
        budget: { type: "string" },
        lead_score: { type: "number", description: "0-100 lead quality score" },
      },
      required: ["business_id", "name", "lead_score"],
    },
  };
}

export function buildTransferCallTool(transferNumber?: string): RetellCustomTool | null {
  if (!transferNumber) return null;
  return {
    type: "transfer_call",
    name: "transfer_call",
    description: "Transfer the caller to a human team member when requested or for emergencies.",
    transfer_destination: {
      type: "predefined",
      number: transferNumber,
    },
  };
}

export function buildKnowledgeSearchTool(
  functionUrl: string,
  businessId: string,
): RetellCustomTool {
  return {
    type: "custom",
    name: "search_knowledge",
    description: "Search the business knowledge base for answers to caller questions.",
    url: functionUrl,
    speak_during_execution: true,
    speak_after_execution: true,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query based on the caller's question",
        },
        business_id: {
          type: "string",
          description: "Business ID",
          const: businessId,
        },
      },
      required: ["query", "business_id"],
    },
  };
}

export function buildCalendarTools(
  availabilityUrl: string,
  bookUrl: string,
  businessId: string,
): RetellCustomTool[] {
  return [
    {
      type: "custom",
      name: "check_availability",
      description: "Check available appointment slots for a given date range.",
      url: availabilityUrl,
      speak_during_execution: true,
      speak_after_execution: true,
      parameters: {
        type: "object",
        properties: {
          business_id: { type: "string", const: businessId },
          start_date: { type: "string", description: "ISO date start" },
          end_date: { type: "string", description: "ISO date end" },
          duration_minutes: { type: "number", description: "Appointment duration" },
        },
        required: ["business_id", "start_date"],
      },
    },
    {
      type: "custom",
      name: "book_appointment",
      description: "Book an appointment for the caller.",
      url: bookUrl,
      speak_during_execution: true,
      speak_after_execution: true,
      parameters: {
        type: "object",
        properties: {
          business_id: { type: "string", const: businessId },
          scheduled_at: { type: "string", description: "ISO datetime" },
          customer_name: { type: "string" },
          customer_phone: { type: "string" },
          customer_email: { type: "string" },
          duration_minutes: { type: "number" },
          notes: { type: "string" },
        },
        required: ["business_id", "scheduled_at", "customer_name", "customer_phone"],
      },
    },
  ];
}

export function buildCustomToolsConfig(
  supabaseUrl: string,
  businessId: string,
  options: {
    includeCalendar?: boolean;
    transferNumber?: string;
  } = {},
): RetellCustomTool[] {
  const base = `${supabaseUrl}/functions/v1`;
  const tools: RetellCustomTool[] = [
    buildKnowledgeSearchTool(`${base}/knowledge-search`, businessId),
    buildQualifyLeadTool(`${base}/qualify-lead`, businessId),
  ];

  if (options.includeCalendar) {
    tools.push(
      ...buildCalendarTools(
        `${base}/calendar-availability`,
        `${base}/calendar-book`,
        businessId,
      ),
    );
  }

  const transferTool = buildTransferCallTool(options.transferNumber);
  if (transferTool) {
    tools.push(transferTool);
  }

  return tools;
}
