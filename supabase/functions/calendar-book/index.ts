import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  AppError,
  createServiceClient,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "../_shared/errors.ts";
import { createBooking } from "../_shared/calendar.ts";
import { captureBusinessEvent } from "../_shared/analytics.ts";

interface BookRequest {
  business_id: string;
  scheduled_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  duration_minutes?: number;
  notes?: string;
  call_id?: string;
  agent_id?: string;
}

interface RetellToolRequest {
  name?: string;
  args?: BookRequest;
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
    const raw = await parseJsonBody<BookRequest | RetellToolRequest>(req);
    const args = "business_id" in raw ? raw : (raw as RetellToolRequest).args;

    if (!args?.business_id || !args.scheduled_at || !args.customer_name || !args.customer_phone) {
      throw new AppError(
        "business_id, scheduled_at, customer_name, and customer_phone are required",
        400,
      );
    }

    const supabase = createServiceClient();

    const result = await createBooking(supabase, {
      businessId: args.business_id,
      scheduledAt: args.scheduled_at,
      customerName: args.customer_name,
      customerPhone: args.customer_phone,
      customerEmail: args.customer_email,
      durationMinutes: args.duration_minutes,
      notes: args.notes,
      callId: args.call_id,
      agentId: args.agent_id,
    });

    if (args.call_id) {
      await supabase.from("calls").update({ outcome: "booked" }).eq("id", args.call_id);
    }

    await captureBusinessEvent(args.business_id, "appointment_booked", {
      appointment_id: result.appointmentId,
      call_id: args.call_id,
    });

    const displayTime = new Date(args.scheduled_at).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    return jsonResponse({
      appointment_id: result.appointmentId,
      external_id: result.externalId,
      result: `Appointment confirmed for ${args.customer_name} on ${displayTime}.`,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
