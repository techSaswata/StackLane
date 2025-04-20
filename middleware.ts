import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect to /dashboard if logged in and accessing the login or root page
  if (session && (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "/login")) {
    const dashboardUrl = new URL("/dashboard", req.url);

    // Check if the first_time_login cookie is already set
    const firstTimeLogin = req.cookies.get("first_time_login");
    if (!firstTimeLogin) {
      // Set the first_time_login cookie
      res.cookies.set("first_time_login", "true", { path: "/", httpOnly: false });
    }

    return NextResponse.redirect(dashboardUrl);
  }

  // Redirect to /dashboard if logged in and accessing /auth/callback
  if (session && req.nextUrl.pathname === "/auth/callback") {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Allow the request to proceed
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};