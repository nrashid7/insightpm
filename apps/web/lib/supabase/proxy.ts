import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

const ONBOARDING_STEPS: Record<number, string> = {
  1: "/onboarding/business",
  2: "/onboarding/knowledge",
  3: "/onboarding/calendar",
  4: "/onboarding/call-preferences",
  5: "/onboarding/voice",
};

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/admin"];

type CookieToSet = { name: string; value: string; options: CookieOptions };

function redirectTo(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const response = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isProtected && !claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  }

  if (!claims) {
    return supabaseResponse;
  }

  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", claims.sub)
      .single();

    if (profile?.role !== "admin") {
      return redirectTo(request, "/dashboard", supabaseResponse);
    }
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", claims.sub)
    .maybeSingle();

  let business: { onboarding_step: number; onboarding_complete: boolean } | null =
    null;

  if (membership?.business_id) {
    const { data } = await supabase
      .from("businesses")
      .select("onboarding_step, onboarding_complete")
      .eq("id", membership.business_id)
      .single();
    business = data;
  }

  if (isAuthPage) {
    if (!membership) {
      return redirectTo(request, "/onboarding/business", supabaseResponse);
    }
    if (business && !business.onboarding_complete) {
      return redirectTo(
        request,
        ONBOARDING_STEPS[business.onboarding_step] ?? "/onboarding/business",
        supabaseResponse
      );
    }
    return redirectTo(request, "/dashboard", supabaseResponse);
  }

  if (!membership && pathname.startsWith("/dashboard")) {
    return redirectTo(request, "/onboarding/business", supabaseResponse);
  }

  if (
    business &&
    !business.onboarding_complete &&
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/billing")
  ) {
    return redirectTo(
      request,
      ONBOARDING_STEPS[business.onboarding_step] ?? "/onboarding/business",
      supabaseResponse
    );
  }

  if (business && !business.onboarding_complete && isOnboarding) {
    const expectedStep = ONBOARDING_STEPS[business.onboarding_step];
    if (expectedStep && pathname !== expectedStep) {
      return redirectTo(request, expectedStep, supabaseResponse);
    }
  }

  return supabaseResponse;
}
