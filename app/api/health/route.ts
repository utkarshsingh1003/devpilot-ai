import { NextResponse } from "next/server";
import { getAiStatus } from "@/lib/ai-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const ai = getAiStatus();

  return NextResponse.json(
    {
      status: "ok",
      service: "devpilot-ai",
      aiEnabled: ai.enabled,
      // Non-secret AI configuration summary. Never includes the API key.
      ai: {
        enabled: ai.enabled,
        provider: ai.provider,
        model: ai.model,
        zeroCost: ai.zeroCost,
      },
      githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()),
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
