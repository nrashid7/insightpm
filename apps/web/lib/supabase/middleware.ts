import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ONBOARDING_STEPS: Record<number, string> = {
  1: "/onboarding/business",
  2: "/onboarding/knowledge",
  3: "/onboarding/calendar",
  4: "/onboarding/call-preferences",
  5: "/onboarding/voice",
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protectedPrefixes = ["/dashboard", "/onboarding", "/admin"];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (user) {
    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let business: { onboarding_step: number; onboarding_complete: boolean } | null = null;

    if (membership?.business_id) {
      const { data } = await supabase
        .from("businesses")
        .select("onboarding_step, onboarding_complete")
        .eq("id", membership.business_id)
        .single();
      business = data;
    }

    if (isAuthPage) {
      const url = request.nextUrl.clone();
      if (!membership) {
        url.pathname = "/onboarding/business";
      } else if (business && !business.onboarding_complete) {
        url.pathname = ONBOARDING_STEPS[business.onboarding_step] ?? "/onboarding/business";
      } else {
        url.pathname = "/dashboard";
      }
      return NextResponse.redirect(url);
    }

    if (!membership && pathname.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding/business";
      return NextResponse.redirect(url);
    }

    if (
      business &&
      !business.onboarding_complete &&
      pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/dashboard/billing")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_STEPS[business.onboarding_step] ?? "/onboarding/business";
      return NextResponse.redirect(url);
    }

    if (business && !business.onboarding_complete && isOnboarding) {
      const expectedStep = ONBOARDING_STEPS[business.onboarding_step];
      if (expectedStep && pathname !== expectedStep && !pathname.startsWith("/onboarding/")) {
        const url = request.nextUrl.clone();
        url.pathname = expectedStep;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
