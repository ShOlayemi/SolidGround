import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PREMIUM_ROUTES: string[] = [];  // All features are currently free-tier — no premium-only routes

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { pathname } = request.nextUrl;
  const { data: { user } } = await supabase.auth.getUser();

  // Admin-only routes: require non-user role
  if (pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));

    // Allow first-admin bootstrap page even for regular users
    if (pathname === "/admin/setup") return response;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role === "user") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    if (pathname.startsWith("/dashboard/billing") || pathname.startsWith("/dashboard/settings")) return response;
    if (PREMIUM_ROUTES.some((route) => pathname.startsWith(route))) {
      const { data: sub } = await supabase.from("subscriptions").select("plan_tier").eq("user_id", user.id).eq("status", "active").maybeSingle();
      if (!sub || sub.plan_tier === "free") return NextResponse.redirect(new URL("/dashboard/billing?upgrade=required", request.url));
    }
    return response;
  }
  if (user && ["/login", "/signup", "/reset-password"].includes(pathname)) return NextResponse.redirect(new URL("/dashboard", request.url));
  return response;
}
export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup", "/reset-password"] };
