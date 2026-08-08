const STRIPE_API = "https://api.stripe.com/v1";

function encodeParams(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") body.append(k, String(v));
  }
  return body.toString();
}

export async function stripeRequest<T>(
  path: string,
  method: "GET" | "POST",
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");

  const url = method === "GET" && params
    ? `${STRIPE_API}${path}?${encodeParams(params)}`
    : `${STRIPE_API}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" && params ? encodeParams(params) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || `Stripe error ${res.status}`);
  }
  return json as T;
}
