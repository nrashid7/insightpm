import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/actions/business";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard/settings?error=oauth_denied`);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${origin}/api/oauth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return NextResponse.redirect(`${origin}/dashboard/settings?error=token_failed`);
    }

    const business = await getBusiness();
    if (business) {
      const supabase = await createClient();
      await supabase.from("integrations").upsert(
        {
          business_id: business.id,
          provider: "google_calendar",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          config: { scope: tokens.scope },
          is_active: true,
        },
        { onConflict: "business_id,provider" }
      );
    }

    const redirectTo = state?.includes("onboarding")
      ? "/onboarding/calendar?connected=google_calendar"
      : "/dashboard/settings?connected=google_calendar";

    return NextResponse.redirect(`${origin}${redirectTo}`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${origin}/dashboard/settings?error=oauth_failed`);
  }
}
