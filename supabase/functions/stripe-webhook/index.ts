import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { planFromStripePrice } from "../_shared/plans.ts";
import type { PlanId } from "../_shared/plans.ts";
import { initLogger, logger } from "../_shared/logger.ts";

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = signature.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === sig;
}

async function syncSubscription(
  admin: ReturnType<typeof createClient>,
  userId: string,
  subscription: {
    id: string;
    status: string;
    current_period_end: number;
    items?: { data?: { price?: { id?: string } }[] };
    metadata?: { plan?: string };
  }
) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  let plan: PlanId | null = (subscription.metadata?.plan as PlanId) || null;
  if (!plan && priceId) plan = planFromStripePrice(priceId);

  await admin.from("profiles").update({
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    plan: plan || null,
  }).eq("id", userId);
}

serve(async (req) => {
  initLogger("stripe-webhook", req);

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  const valid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        if (userId && customerId) {
          await admin.from("profiles").update({
            stripe_customer_id: customerId,
          }).eq("id", userId);
        }
        if (userId && subscriptionId && typeof subscriptionId === "string") {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey) {
            const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
              headers: { Authorization: `Bearer ${stripeKey}` },
            });
            if (subRes.ok) {
              const sub = await subRes.json();
              await syncSubscription(admin, userId, sub);
            }
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) await syncSubscription(admin, userId, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await admin.from("profiles").update({
            subscription_status: "canceled",
            plan: null,
            stripe_subscription_id: null,
            current_period_end: null,
          }).eq("id", userId);
        }
        break;
      }
      default:
        logger.info("Unhandled Stripe event", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("stripe-webhook error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
