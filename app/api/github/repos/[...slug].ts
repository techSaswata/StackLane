import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cookies = req.cookies; // Access the cookies property
    const authToken = cookies.get('sb-bysyalujziclkdjmjggn-auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: "GitHub authentication required" }, { status: 401 });
    }

    const slug = req.nextUrl.pathname.split("/").slice(-1)[0];
    const githubApiUrl = `https://api.github.com/${slug}`;

    const response = await fetch(githubApiUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (response.status === 401) {
      return NextResponse.json({ error: "GitHub token expired" }, { status: 401 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch data from GitHub" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
