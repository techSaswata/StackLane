import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // We'll send a redirect with a special param that our loading component will look for
  // This ensures the loading animation stays visible until the dashboard fully loads
  return NextResponse.redirect(new URL("/dashboard?auth_complete=true", requestUrl.origin))
}
