import { NextResponse } from "next/server";
import { analyzeRepository } from "@/lib/analysis/analyze";
import { generateAiInsight } from "@/lib/ai";
import { getAiStatus } from "@/lib/ai-config";
import { getDemoResult } from "@/lib/demo";
import { GitHubError, loadGitHubRepository } from "@/lib/github";
import { readJsonBody } from "@/lib/request-body";
import type { AiInsight, AnalysisResult } from "@/lib/types";
import { validateAnalyzeRequest } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stay below `maxDuration` so the client receives a JSON response instead of a
 * platform-killed connection, and reserve enough of that budget for AI.
 */
const ANALYSIS_BUDGET_MS = 55_000;
const GITHUB_BUDGET_MS = 30_000;
const AI_MIN_BUDGET_MS = 8_000;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();

  if (buckets.size > 5_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function errorResponse(message: string, status: number, retryAfter?: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    },
  );
}

function aiBudgetExceededInsight(): AiInsight {
  const status = getAiStatus();
  return {
    enabled: status.enabled,
    status: "error",
    provider: status.provider ?? undefined,
    model: status.model ?? undefined,
    zeroCost: status.zeroCost,
    error:
      "AI summary was skipped to stay within the request time limit. The deterministic analysis below is complete and unaffected.",
  };
}

/**
 * Runs the optional AI summary, but never past the request deadline. The
 * deterministic result must still be returned if the provider is slow.
 */
async function generateAiWithinBudget(
  result: AnalysisResult,
  deadline: number,
): Promise<AiInsight> {
  if (deadline - Date.now() < AI_MIN_BUDGET_MS) {
    console.error("[devpilot] AI summary skipped: request budget exhausted.");
    return aiBudgetExceededInsight();
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), deadline - Date.now());
  });

  try {
    const insight = await Promise.race([generateAiInsight(result), budget]);
    if (insight) return insight;
    console.error("[devpilot] AI summary exceeded the request budget.");
    return aiBudgetExceededInsight();
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const rate = checkRateLimit(clientKey(request));
  if (!rate.allowed) {
    return errorResponse(
      `Too many analyses from this address. Try again in ${rate.retryAfter} seconds.`,
      429,
      rate.retryAfter,
    );
  }

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    return errorResponse(parsedBody.message, parsedBody.status);
  }

  const validated = validateAnalyzeRequest(parsedBody.value);
  if (!validated.ok) {
    return errorResponse(validated.message, 400);
  }

  try {
    const deadline = Date.now() + ANALYSIS_BUDGET_MS;
    const result =
      validated.mode === "demo"
        ? getDemoResult()
        : analyzeRepository(
            await loadGitHubRepository(validated.repoUrl, {
              deadline: Math.min(deadline, Date.now() + GITHUB_BUDGET_MS),
            }),
          );

    result.ai = await generateAiWithinBudget(result, deadline);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof GitHubError) {
      return errorResponse(error.message, error.status);
    }

    console.error(
      "[devpilot] Analysis failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return errorResponse(
      "Analysis failed unexpectedly. Try again, or use the demo repository.",
      500,
    );
  }
}
