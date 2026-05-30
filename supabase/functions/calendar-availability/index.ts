import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  AppError,
  createServiceClient,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "../_shared/errors.ts";
import { checkAvailability } from "../_shared/calendar.ts";

interface AvailabilityRequest {
  business_id: string;
  start_date: string;
  end_date?: string;
  duration_minutes?: number;
}

interface RetellToolRequest {
  name?: string;
  args?: AvailabilityRequest;
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
    const raw = await parseJsonBody<AvailabilityRequest | RetellToolRequest>(req);

    const businessId = "business_id" in raw && raw.business_id
      ? raw.business_id
      : (raw as RetellToolRequest).args?.business_id;

    const startDate = "start_date" in raw && raw.start_date
      ? raw.start_date
      : (raw as RetellToolRequest).args?.start_date;

    const endDate = "end_date" in raw
      ? raw.end_date
      : (raw as RetellToolRequest).args?.end_date;

    const durationMinutes = "duration_minutes" in raw
      ? raw.duration_minutes
      : (raw as RetellToolRequest).args?.duration_minutes;

    if (!businessId || !startDate) {
      throw new AppError("business_id and start_date are required", 400);
    }

    const supabase = createServiceClient();
    const slots = await checkAvailability(supabase, {
      businessId,
      startDate,
      endDate,
      durationMinutes,
    });

    const formatted = slots.map((s) => ({
      start: s.start,
      end: s.end,
      display: new Date(s.start).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    }));

    return jsonResponse({
      slots: formatted,
      result: formatted.length > 0
        ? `Available slots: ${formatted.map((s) => s.display).join(", ")}`
        : "No available slots found for the requested dates.",
    });
  } catch (error) {
    return errorResponse(error);
  }
});
