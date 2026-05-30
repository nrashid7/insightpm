import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { AppError } from "./errors.ts";

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  businessId: string;
  callId?: string;
}

export interface SendSmsResult {
  sid: string;
  status: string;
}

export async function sendSms(
  supabase: SupabaseClient,
  options: SendSmsOptions,
): Promise<SendSmsResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const defaultFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !defaultFrom) {
    throw new AppError("Missing Twilio configuration", 500, "CONFIG_ERROR");
  }

  const from = options.from ?? defaultFrom;
  const credentials = btoa(`${accountSid}:${authToken}`);

  const params = new URLSearchParams({
    To: options.to,
    From: from,
    Body: options.body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      `Twilio SMS failed: ${data.message ?? response.statusText}`,
      response.status,
      "SMS_ERROR",
    );
  }

  await supabase.from("sms_messages").insert({
    business_id: options.businessId,
    call_id: options.callId ?? null,
    to_number: options.to,
    from_number: from,
    body: options.body,
    direction: "outbound",
    status: data.status ?? "sent",
    twilio_sid: data.sid,
  });

  return { sid: data.sid, status: data.status };
}
