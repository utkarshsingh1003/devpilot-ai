import { z } from "zod";
import type { AiInsight, AnalysisResult } from "./types";

const AI_TIMEOUT_MS = 20_000;

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

/**
 * Validates the configured AI endpoint. Only absolute HTTP(S) URLs are accepted
 * so a misconfigured environment variable cannot point the server at a
 * non-network protocol or a relative path.
 */
export function resolveAiBaseUrl(raw?: string): string | null {
  const candidate = raw?.trim() || "https://api.openai.com/v1";
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/**
 * Optional AI layer. It receives finding metadata only — never full source
 * files or code snippets — and must not invent new findings.
 */
export async function generateAiInsight(result: AnalysisResult): Promise<AiInsight> {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    return { enabled: false, status: "disabled" };
  }

  const baseUrl = resolveAiBaseUrl(process.env.AI_BASE_URL);
  if (!baseUrl) {
    return {
      enabled: true,
      status: "error",
      error:
        "AI summaries are misconfigured: AI_BASE_URL must be an absolute http(s) URL. The deterministic analysis is unaffected.",
    };
  }

  const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";

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
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 450,
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

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
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
      model,
      error:
        "AI summary could not be generated. The deterministic analysis below is complete and unaffected.",
    };
  }
}
