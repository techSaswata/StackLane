import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: any }) {
  const supabase = createRouteHandlerClient({ cookies });

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Await params to ensure it's resolved before accessing its properties
    const resolvedParams = await params;

    // Validate slug
    if (!resolvedParams || !resolvedParams.slug || resolvedParams.slug.length === 0) {
      return NextResponse.json({ error: "Slug parameter is required" }, { status: 400 });
    }

    const slug = resolvedParams.slug;
    const repoFullName = slug.join("/");

    // Determine the endpoint based on the URL pattern
    let endpoint = `https://api.github.com/repos/${repoFullName}`;

    // Check if we're requesting a specific resource
    if (slug.length > 2) {
      const resource = slug[2];
      endpoint = `https://api.github.com/repos/${slug[0]}/${slug[1]}/${resource}`;
    }

    // Get GitHub access token from session
    const accessToken = session.provider_token;

    if (!accessToken) {
      return NextResponse.json({ error: "GitHub token not found" }, { status: 401 });
    }

    // Fetch data from GitHub API
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    return NextResponse.json({ error: "Failed to fetch data from GitHub" }, { status: 500 });
  }
}
