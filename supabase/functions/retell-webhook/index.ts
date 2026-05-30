import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createServiceClient,
  errorResponse,
  jsonResponse,
} from "../_shared/errors.ts";
import { verifyRetellSignature, readRawBody } from "../_shared/webhook.ts";
import { captureCallEvent } from "../_shared/analytics.ts";
import { AppError } from "../_shared/errors.ts";
import { recordUsageMinutes } from "../_shared/stripe.ts";
import { sendSms } from "../_shared/sms.ts";
import { buildN8nDispatchPayload } from "../_shared/crm.ts";

interface RetellWebhookEvent {
  event: string;
  call: RetellCall;
}

interface RetellCall {
  call_id: string;
  agent_id: string;
  call_type?: string;
  from_number?: string;
  to_number?: string;
  direction?: string;
  call_status?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  recording_url?: string;
  transcript?: Array<{ role: string; content: string }>;
  transcript_object?: Array<{ role: string; content: string }>;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    custom_analysis_data?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

async function invokeFunction(name: string, body: Record<string, unknown>): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return;

  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error(`[retell-webhook] Failed to invoke ${name}:`, await response.text());
  }
}

function mapCallStatus(status?: string): string {
  switch (status) {
    case "registered":
    case "ongoing":
      return "in_progress";
    case "ended":
      return "completed";
    case "error":
      return "failed";
    default:
      return "ringing";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-retell-signature, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await readRawBody(req);
    await verifyRetellSignature(req, rawBody);

    const payload = JSON.parse(rawBody) as RetellWebhookEvent;
    const { event, call } = payload;

    if (!event || !call?.call_id) {
      throw new AppError("Invalid Retell webhook payload", 400);
    }

    const supabase = createServiceClient();

    const { data: agent } = await supabase
      .from("agents")
      .select("id, business_id")
      .eq("retell_agent_id", call.agent_id)
      .maybeSingle();

    if (!agent) {
      console.warn(`[retell-webhook] Unknown agent: ${call.agent_id}`);
      return jsonResponse({ received: true, skipped: true });
    }

    const businessId = agent.business_id;
    const durationSeconds = call.duration_ms
      ? Math.round(call.duration_ms / 1000)
      : 0;

    if (event === "call_started") {
      await supabase.from("calls").upsert({
        business_id: businessId,
        agent_id: agent.id,
        retell_call_id: call.call_id,
        caller_number: call.from_number ?? null,
        status: "in_progress",
        started_at: call.start_timestamp
          ? new Date(call.start_timestamp).toISOString()
          : new Date().toISOString(),
      }, { onConflict: "retell_call_id" });

      await captureCallEvent(businessId, call.call_id, "call_started", {
        agent_id: agent.id,
        caller_number: call.from_number,
      });
    }

    if (event === "call_ended") {
      const { data: existingCall } = await supabase
        .from("calls")
        .select("id")
        .eq("retell_call_id", call.call_id)
        .maybeSingle();

      const callRow = {
        business_id: businessId,
        agent_id: agent.id,
        retell_call_id: call.call_id,
        caller_number: call.from_number ?? null,
        duration_seconds: durationSeconds,
        status: mapCallStatus(call.call_status),
        recording_url: call.recording_url ?? null,
        ended_at: call.end_timestamp
          ? new Date(call.end_timestamp).toISOString()
          : new Date().toISOString(),
      };

      const { data: upserted } = await supabase
        .from("calls")
        .upsert(callRow, { onConflict: "retell_call_id" })
        .select("id")
        .single();

      const callId = upserted?.id ?? existingCall?.id;
      const transcript = call.transcript ?? call.transcript_object ?? [];

      if (callId && transcript.length > 0) {
        await supabase.from("call_transcripts").upsert({
          call_id: callId,
          transcript,
        }, { onConflict: "call_id" });
      }

      if (callId && durationSeconds > 0) {
        const minutes = Math.ceil(durationSeconds / 60);
        await recordUsageMinutes(supabase, businessId, callId, minutes);
      }

      const isMissed = durationSeconds === 0 || call.call_status === "no_answer";
      if (isMissed && call.from_number) {
        try {
          await sendSms(supabase, {
            businessId,
            callId: callId ?? undefined,
            to: call.from_number,
            body: `Hi! We noticed we missed your call. Reply here or call us back — we'd love to help!`,
          });
        } catch (smsErr) {
          console.error("[retell-webhook] SMS failed:", smsErr);
        }
      }

      await captureCallEvent(businessId, call.call_id, "call_ended", {
        duration_seconds: durationSeconds,
        call_id: callId,
      });

      if (callId) {
        await invokeFunction("call-analyze", { call_id: callId });

        const { data: transcriptRow } = await supabase
          .from("call_transcripts")
          .select("summary")
          .eq("call_id", callId)
          .maybeSingle();

        const { data: callRow } = await supabase
          .from("calls")
          .select("lead_score, outcome, caller_number")
          .eq("id", callId)
          .single();

        await invokeFunction("n8n-dispatch", buildN8nDispatchPayload({
          event: "call_completed",
          businessId,
          callId,
          contact: {
            phone: callRow?.caller_number ?? call.from_number,
          },
          callSummary: transcriptRow?.summary ?? undefined,
          leadScore: callRow?.lead_score ?? undefined,
          pipelineStage: callRow?.outcome === "qualified_lead" ? "qualified" : "new_lead",
          outcome: callRow?.outcome ?? undefined,
        }));
      }
    }

    if (event === "call_analyzed") {
      const analysis = call.call_analysis;
      const { data: existingCall } = await supabase
        .from("calls")
        .select("id")
        .eq("retell_call_id", call.call_id)
        .maybeSingle();

      if (existingCall && analysis) {
        await supabase.from("calls").update({
          sentiment: analysis.user_sentiment ?? null,
          qualification_data: analysis.custom_analysis_data ?? {},
        }).eq("id", existingCall.id);

        if (analysis.call_summary) {
          await supabase.from("call_transcripts").upsert({
            call_id: existingCall.id,
            summary: analysis.call_summary,
          }, { onConflict: "call_id" });
        }

        await invokeFunction("n8n-dispatch", {
          event: "call_analyzed",
          business_id: businessId,
          call_id: existingCall.id,
        });
      }

      await captureCallEvent(businessId, call.call_id, "call_analyzed");
    }

    return jsonResponse({ received: true, event });
  } catch (error) {
    return errorResponse(error);
  }
});
