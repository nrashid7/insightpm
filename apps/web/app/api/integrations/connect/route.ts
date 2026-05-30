import { NextResponse } from "next/server";
import { integrationConnectSchema } from "@businessvoice/shared";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/actions/business";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = integrationConnectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const business = await getBusiness();
    if (!business) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const { error } = await supabase.from("integrations").upsert({
      business_id: business.id,
      provider: parsed.data.provider,
      config: parsed.data.config || {},
      is_active: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Integration connect error:", error);
    return NextResponse.json({ error: "Connection failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider) {
    return NextResponse.json({ error: "Provider required" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const apiKeyProviders = ["cal_com", "calendly", "hubspot", "gohighlevel", "google_sheets"];
  if (apiKeyProviders.includes(provider)) {
    return NextResponse.redirect(`${origin}/dashboard/settings/connect?provider=${provider}`);
  }

  return NextResponse.redirect(
    `${origin}/dashboard/settings?connect=${provider}`
  );
}
