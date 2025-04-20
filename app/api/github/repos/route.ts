import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const cookiesInstance = cookies(); // Await cookies() before using
  const supabase = createRouteHandlerClient({ cookies: () => cookiesInstance });

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get GitHub access token from session
    const accessToken = session.provider_token;

    if (!accessToken) {
      return NextResponse.json({ error: "GitHub token not found" }, { status: 401 });
    }

    // Fetch repositories from GitHub API
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      let errorDetails = {};
      try {
        errorDetails = await response.json(); // Attempt to parse error response
      } catch {
        errorDetails = { message: "Unable to parse error response" }; // Fallback if parsing fails
      }
      console.error("GitHub API error:", {
        status: response.status,
        statusText: response.statusText,
        errorDetails,
      });
      return NextResponse.json({ error: "GitHub API error", details: errorDetails }, { status: response.status });
    }

    const repositories = await response.json();

    return NextResponse.json(repositories);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
}
