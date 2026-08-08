import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { stripeRequest } from "../_shared/stripe.ts";
import type { PlanId } from "../_shared/plans.ts";
import { initLogger, logger } from "../_shared/logger.ts";

const PRICE_ENV: Record<PlanId, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  enterprise: "STRIPE_PRICE_ENTERPRISE",
};

serve(async (req) => {
  initLogger("stripe-checkout", req);
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const plan = body.plan as PlanId;
    if (!plan || !["starter", "growth", "enterprise"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = Deno.env.get(PRICE_ENV[plan]);
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Price not configured for ${plan}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://insightpm.app";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripeRequest<{ id: string }>("/customers", "POST", {
        email: user.email || profile?.email || "",
        "metadata[supabase_user_id]": user.id,
      });
      customerId = customer.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const session = await stripeRequest<{ url: string }>("/checkout/sessions", "POST", {
      customer: customerId,
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      success_url: `${siteUrl}/analyze?checkout=success`,
      cancel_url: `${siteUrl}/#pricing`,
      "metadata[supabase_user_id]": user.id,
      "metadata[plan]": plan,
      "subscription_data[metadata][supabase_user_id]": user.id,
      "subscription_data[metadata][plan]": plan,
    });

    logger.info("Checkout session created", { userId: user.id, plan });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("stripe-checkout error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
