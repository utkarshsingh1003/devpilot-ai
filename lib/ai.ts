import { z } from "zod";
import { resolveAiConfig, resolveAiProvider } from "./ai-config";
import type { AiEnv } from "./ai-config";
import type { AiInsight, AnalysisResult } from "./types";

const AI_TIMEOUT_MS = 20_000;
const AI_MAX_ATTEMPTS = 2;
const AI_RETRY_BASE_DELAY_MS = 500;
const AI_RETRY_JITTER_MS = 250;
const AI_MAX_RETRY_DELAY_MS = 5_000;

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

class AiHttpError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(status: number, retryAfterMs?: number) {
    super(`AI provider returned ${status}`);
    this.name = "AiHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());

  return undefined;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AiHttpError) return RETRYABLE_STATUSES.has(error.status);
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return error.name === "AbortError" || error.name === "TimeoutError";
  }
  return false;
}

function retryDelay(
  attempt: number,
  retryAfterMs: number | undefined,
  random: () => number,
): number {
  if (retryAfterMs !== undefined) {
    return Math.min(AI_MAX_RETRY_DELAY_MS, retryAfterMs);
  }

  const exponential = AI_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.floor(random() * AI_RETRY_JITTER_MS);
  return Math.min(AI_MAX_RETRY_DELAY_MS, exponential + jitter);
}

const aiResponseSchema = z.object({
  summary: z.string().min(10).max(1200),
  priorities: z.array(z.string().min(3).max(240)).min(1).max(5),
});

export function extractJsonObject(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export function parseAiResponse(content: string): z.infer<typeof aiResponseSchema> | null {
  try {
    const parsed = aiResponseSchema.safeParse(extractJsonObject(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

interface GenerateAiInsightOptions {
  env?: AiEnv;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  random?: () => number;
}

/**
 * Optional AI layer. It receives finding metadata only — never full source
 * files or code snippets — and must not invent new findings.
 *
 * Configuration is resolved by `resolveAiConfig`, which enforces the zero-cost
 * Gemini profile: fixed Developer API endpoint, free-tier model allowlist, and
 * a capped output budget. No tools, grounding, or file uploads are ever sent.
 */
export async function generateAiInsight(
  result: AnalysisResult,
  options: GenerateAiInsightOptions = {},
): Promise<AiInsight> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl =
    options.sleepImpl ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;

  const config = resolveAiConfig(env);
  if (!config.ok) {
    if (config.reason === "disabled") {
      return { enabled: false, status: "disabled", zeroCost: false };
    }
    return {
      enabled: true,
      status: "error",
      provider: resolveAiProvider(env) ?? undefined,
      zeroCost: false,
      error: config.message,
    };
  }

  const { provider, model, baseUrl, apiKey, maxOutputTokens, zeroCost } = config;

  const payload = {
    repository: result.repo.fullName,
    mode: result.mode,
    stats: {
      score: result.summary.score,
      filesAnalyzed: result.summary.filesAnalyzed,
      totalLines: result.summary.totalLines,
      hasTests: result.summary.hasTests,
      languages: result.summary.languages.map((language) => language.name),
    },
    severityCounts: result.summary.severityCounts,
    findings: result.findings.slice(0, 10).map((finding) => ({
      severity: finding.severity,
      category: finding.category,
      title: finding.title,
      file: finding.file,
      line: finding.line,
      suggestion: finding.suggestion,
    })),
  };

  try {
    let response: Response | null = null;

    for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt += 1) {
      try {
        const candidate = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: maxOutputTokens,
            // Gemini 3 uses thinking tokens by default. Keep reasoning low so
            // the capped output budget is spent on the summary, not thoughts.
            ...(provider === "gemini" ? { reasoning_effort: "low" } : {}),
            messages: [
              {
                role: "system",
                content:
                  "You summarize deterministic static-analysis results for a developer tool. Use ONLY the supplied findings and statistics. Never invent a file, line number, vulnerability, or security guarantee. Return strict JSON with exactly two keys: summary (a string of at most 90 words) and priorities (an array of 2-4 short, actionable strings). Do not include raw source code. If there are no findings, say the rule set found no signals and that this is not proof of correctness.",
              },
              {
                role: "user",
                content: JSON.stringify(payload),
              },
            ],
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
          cache: "no-store",
        });

        if (candidate.ok) {
          response = candidate;
          break;
        }

        throw new AiHttpError(
          candidate.status,
          parseRetryAfter(candidate.headers.get("retry-after")),
        );
      } catch (error) {
        if (attempt >= AI_MAX_ATTEMPTS || !isRetryable(error)) throw error;

        await sleepImpl(
          retryDelay(
            attempt,
            error instanceof AiHttpError ? error.retryAfterMs : undefined,
            random,
          ),
        );
      }
    }

    if (!response) {
      throw new Error("AI provider request failed");
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("AI provider returned an unexpected payload");
    }

    const parsed = parseAiResponse(content);
    if (!parsed) {
      throw new Error("AI provider returned invalid JSON");
    }

    return {
      enabled: true,
      status: "ok",
      provider,
      zeroCost,
      model,
      summary: parsed.summary,
      priorities: parsed.priorities,
    };
  } catch (error) {
    console.error(
      "[devpilot] Optional AI summary failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      enabled: true,
      status: "error",
      provider,
      zeroCost,
      model,
      error:
        "AI summary could not be generated. The deterministic analysis below is complete and unaffected.",
    };
  }
}
