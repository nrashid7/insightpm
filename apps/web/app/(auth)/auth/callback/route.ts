import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ONBOARDING_STEPS: Record<number, string> = {
  1: "/onboarding/business",
  2: "/onboarding/knowledge",
  3: "/onboarding/calendar",
  4: "/onboarding/call-preferences",
  5: "/onboarding/voice",
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
      const { data: membership } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.redirect(`${origin}/onboarding/business`);
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("onboarding_step, onboarding_complete")
        .eq("id", membership.business_id)
        .single();

      if (!business?.onboarding_complete) {
        const step = ONBOARDING_STEPS[business?.onboarding_step ?? 1] ?? "/onboarding/business";
        return NextResponse.redirect(`${origin}${step}`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
