import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  AppError,
  createServiceClient,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "../_shared/errors.ts";
import {
  buildCustomToolsConfig,
  createRetellAgent,
  createRetellLlm,
  createRetellPhoneNumber,
} from "../_shared/retell.ts";
import { buildSystemPrompt } from "../_shared/prompts.ts";
import { captureBusinessEvent } from "../_shared/analytics.ts";

interface CreateAgentRequest {
  business_id: string;
  template_id?: string;
  template_slug?: string;
  name?: string;
  type?: string;
  voice_id?: string;
  voice_provider?: string;
  include_calendar?: boolean;
  area_code?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await parseJsonBody<CreateAgentRequest>(req);
    const { business_id } = body;

    if (!business_id || (!body.template_id && !body.template_slug)) {
      throw new AppError("business_id and template_id or template_slug are required", 400);
    }

    const supabase = createServiceClient();

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", business_id)
      .single();

    if (bizError || !business) {
      throw new AppError("Business not found", 404);
    }

    let templateQuery = supabase.from("agent_templates").select("*");
    if (body.template_id) {
      templateQuery = templateQuery.eq("id", body.template_id);
    } else {
      templateQuery = templateQuery.eq("slug", body.template_slug!);
    }
    const { data: template, error: tplError } = await templateQuery.single();

    if (tplError || !template) {
      throw new AppError("Agent template not found", 404);
    }

    const template_id = template.id as string;

    const { data: callPrefs } = await supabase
      .from("call_preferences")
      .select("transfer_number, emergency_number")
      .eq("business_id", business_id)
      .maybeSingle();

    const templateConfig = template.config as Record<string, unknown>;
    const voiceConfig = templateConfig.voice as Record<string, string> | undefined;
    const llmConfig = templateConfig.retell_llm_config as Record<string, unknown> | undefined;

    const voiceId = body.voice_id ??
      (body.voice_provider === "elevenlabs"
        ? voiceConfig?.elevenlabs_voice_id
        : voiceConfig?.retell_voice_id) ??
      voiceConfig?.retell_voice_id ??
      "11labs-Adrian";

    const systemPrompt = buildSystemPrompt(
      {
        system_prompt: (templateConfig.system_prompt as string) ?? "",
        objection_handlers: templateConfig.objection_handlers as Array<{ trigger: string; response: string }>,
        booking_rules: templateConfig.booking_rules as string[],
        escalation_rules: templateConfig.escalation_rules as Array<{ condition: string; action: string }>,
        faq_rules: templateConfig.faq_rules as string[],
        qualification_questions: templateConfig.qualification_questions as string[],
      },
      {
        name: business.name,
        website: business.website,
        phone: business.phone,
        timezone: business.timezone,
        hours: business.hours,
        industry: business.industry,
      },
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/retell-webhook`;

    const customTools = buildCustomToolsConfig(supabaseUrl, business_id, {
      includeCalendar: body.include_calendar ?? true,
      transferNumber: callPrefs?.transfer_number ?? callPrefs?.emergency_number ?? undefined,
    });

    const { llm_id } = await createRetellLlm({
      model: (llmConfig?.model as string) ?? "gpt-4.1-mini",
      model_temperature: (llmConfig?.temperature as number) ?? 0.7,
      general_prompt: systemPrompt,
      begin_message: `Hi, thanks for calling ${business.name}. How can I help you today?`,
      general_tools: customTools,
    });

    const agentName = body.name ?? (templateConfig.agent_name as string) ?? template.name;

    const { agent_id } = await createRetellAgent({
      agent_name: agentName,
      voice_id: voiceId,
      response_engine: { type: "retell-llm", llm_id },
      webhook_url: webhookUrl,
      language: "en-US",
      enable_backchannel: true,
    });

    let phoneNumber: string | null = null;
    try {
      const phone = await createRetellPhoneNumber(agent_id, body.area_code);
      phoneNumber = phone.phone_number_pretty ?? phone.phone_number;
    } catch (phoneErr) {
      console.warn("[retell-create-agent] Phone provisioning failed:", phoneErr);
    }

    const { data: agent, error: insertError } = await supabase
      .from("agents")
      .insert({
        business_id,
        template_id,
        name: agentName,
        type: body.type ?? "inbound",
        retell_agent_id: agent_id,
        retell_llm_id: llm_id,
        phone_number: phoneNumber,
        voice_provider: body.voice_provider ?? "retell",
        voice_id: voiceId,
        config: templateConfig,
        is_active: true,
      })
      .select("*")
      .single();

    if (insertError) {
      throw new AppError(`Failed to save agent: ${insertError.message}`, 500);
    }

    await captureBusinessEvent(business_id, "agent_created", {
      agent_id: agent.id,
      template_id,
      retell_agent_id: agent_id,
    });

    return jsonResponse({ agent }, 201);
  } catch (error) {
    return errorResponse(error);
  }
});
