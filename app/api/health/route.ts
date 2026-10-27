import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "devpilot-ai",
      aiEnabled: Boolean(process.env.AI_API_KEY?.trim()),
      githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()),
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
