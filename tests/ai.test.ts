import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_MAX_OUTPUT_TOKENS,
  GEMINI_OPENAI_BASE_URL,
  getAiStatus,
  isFreeTierGeminiModel,
  resolveAiConfig,
  resolveAiProvider,
  resolveMaxOutputTokens,
} from "@/lib/ai-config";
import { generateAiInsight } from "@/lib/ai";
import type { AnalysisResult } from "@/lib/types";

function sampleResult(): AnalysisResult {
  return {
    repo: {
      owner: "demo",
      name: "demo",
      fullName: "demo/demo",
      url: null,
      branch: null,
      description: null,
      stars: null,
      isDemo: true,
    },
    mode: "demo",
    generatedAt: new Date(0).toISOString(),
    summary: {
      score: 82,
      grade: "B",
      filesAnalyzed: 2,
      filesSkipped: 0,
      totalLines: 40,
      totalBytes: 900,
      testFiles: 0,
      hasTests: false,
      findingsTotal: 1,
      findingsReturned: 1,
      findingsTruncated: false,
      severityCounts: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
      languages: [{ name: "TypeScript", files: 2, lines: 40, percent: 100 }],
    },
    findings: [
      {
        id: "f1",
        ruleId: "hardcoded-secret",
        title: "Hardcoded secret",
        description: "A secret appears to be hardcoded.",
        severity: "high",
        category: "security",
        file: "src/a.ts",
        line: 3,
        snippet: "const key = \"...\";",
        suggestion: "Move the secret to an environment variable.",
      },
    ],
    ai: { enabled: false, status: "disabled" },
    warnings: [],
    limits: {
      maxFiles: 24,
      maxFileBytes: 100_000,
      maxTotalBytes: 300_000,
      treeTruncated: false,
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("resolveAiProvider", () => {
  it("auto-detects Gemini from GEMINI_API_KEY", () => {
    expect(resolveAiProvider({ GEMINI_API_KEY: "test-key" })).toBe("gemini");
  });

  it("falls back to the generic provider without a Gemini key", () => {
    expect(resolveAiProvider({})).toBe("openai-compatible");
    expect(resolveAiProvider({ AI_API_KEY: "test-key" })).toBe(
      "openai-compatible",
    );
  });

  it("honors an explicit provider and rejects unknown values", () => {
    expect(resolveAiProvider({ AI_PROVIDER: "google" })).toBe("gemini");
    expect(resolveAiProvider({ AI_PROVIDER: "compatible" })).toBe(
      "openai-compatible",
    );
    expect(resolveAiProvider({ AI_PROVIDER: "vertex" })).toBeNull();
  });
});

describe("resolveMaxOutputTokens", () => {
  it("defaults, clamps, and ignores invalid values", () => {
    expect(resolveMaxOutputTokens(undefined)).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
    expect(resolveMaxOutputTokens("not-a-number")).toBe(
      DEFAULT_MAX_OUTPUT_TOKENS,
    );
    expect(resolveMaxOutputTokens("10")).toBe(128);
    expect(resolveMaxOutputTokens("9999")).toBe(1024);
    expect(resolveMaxOutputTokens("700")).toBe(700);
  });
});

describe("resolveAiConfig (zero-cost Gemini profile)", () => {
  it("is disabled without a key", () => {
    expect(resolveAiConfig({})).toEqual({ ok: false, reason: "disabled" });
  });

  it("pins the Gemini Developer API endpoint and free-tier default", () => {
    const config = resolveAiConfig({ GEMINI_API_KEY: "test-key" });
    expect(config).toEqual({
      ok: true,
      provider: "gemini",
      apiKey: "test-key",
      baseUrl: GEMINI_OPENAI_BASE_URL,
      model: DEFAULT_GEMINI_MODEL,
      maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
      zeroCost: true,
    });
  });

  it("accepts an explicitly configured free-tier model", () => {
    const config = resolveAiConfig({
      GEMINI_API_KEY: "test-key",
      AI_MODEL: "gemini-2.5-flash-lite",
    });
    expect(config.ok && config.model).toBe("gemini-2.5-flash-lite");
  });

  it("rejects a model outside the free-tier allowlist", () => {
    const config = resolveAiConfig({
      GEMINI_API_KEY: "test-key",
      AI_MODEL: "gemini-3-pro",
    });
    expect(config.ok).toBe(false);
    if (!config.ok) expect(config.reason).toBe("invalid");
  });

  it("rejects Vertex AI and custom endpoints", () => {
    const config = resolveAiConfig({
      GEMINI_API_KEY: "test-key",
      AI_BASE_URL: "https://us-central1-aiplatform.googleapis.com/v1",
    });
    expect(config.ok).toBe(false);
    if (!config.ok && config.reason === "invalid") {
      expect(config.message).toMatch(/Vertex AI|custom endpoints/i);
    }
  });

  it("accepts the exact Gemini endpoint", () => {
    const config = resolveAiConfig({
      GEMINI_API_KEY: "test-key",
      AI_BASE_URL: `${GEMINI_OPENAI_BASE_URL}/`,
    });
    expect(config.ok).toBe(true);
  });

  it("supports AI_API_KEY as a Gemini fallback", () => {
    const config = resolveAiConfig({
      AI_PROVIDER: "gemini",
      AI_API_KEY: "fallback-key",
    });
    expect(config.ok && config.provider).toBe("gemini");
  });

  it("rejects an unknown provider", () => {
    const config = resolveAiConfig({
      AI_PROVIDER: "vertex",
      AI_API_KEY: "test-key",
    });
    expect(config.ok).toBe(false);
  });

  it("keeps the generic provider non-zero-cost", () => {
    const config = resolveAiConfig({
      AI_PROVIDER: "openai-compatible",
      AI_API_KEY: "test-key",
      AI_BASE_URL: "https://api.openai.com/v1",
      AI_MODEL: "gpt-4o-mini",
    });
    expect(config.ok).toBe(true);
    if (config.ok) {
      expect(config.provider).toBe("openai-compatible");
      expect(config.zeroCost).toBe(false);
    }
  });

  it("rejects an invalid generic base URL", () => {
    const config = resolveAiConfig({
      AI_PROVIDER: "openai-compatible",
      AI_API_KEY: "test-key",
      AI_BASE_URL: "file:///etc/passwd",
    });
    expect(config.ok).toBe(false);
  });

  it("identifies free-tier models", () => {
    expect(isFreeTierGeminiModel("gemini-3.8-flash")).toBe(true);
    expect(isFreeTierGeminiModel("gemini-4-argon")).toBe(false);
  });
});

describe("getAiStatus", () => {
  it("reports non-secret status only", () => {
    const status = getAiStatus({ GEMINI_API_KEY: "super-secret-key" });
    expect(status).toEqual({
      enabled: true,
      provider: "gemini",
      model: DEFAULT_GEMINI_MODEL,
      zeroCost: true,
    });
    expect(JSON.stringify(status)).not.toContain("super-secret-key");
  });

  it("reports disabled when no key is configured", () => {
    expect(getAiStatus({})).toEqual({
      enabled: false,
      provider: null,
      model: null,
      zeroCost: false,
    });
  });
});

describe("generateAiInsight", () => {
  it("returns disabled without calling the provider", async () => {
    const fetchImpl = vi.fn();
    const insight = await generateAiInsight(sampleResult(), {
      env: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(insight).toEqual({
      enabled: false,
      status: "disabled",
      zeroCost: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed on an invalid zero-cost configuration", async () => {
    const fetchImpl = vi.fn();
    const insight = await generateAiInsight(sampleResult(), {
      env: { GEMINI_API_KEY: "test-key", AI_MODEL: "gemini-3-pro" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(insight.status).toBe("error");
    expect(insight.provider).toBe("gemini");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends a capped, tool-free request and parses the summary", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "One high-severity secret was found in the sample.",
                priorities: ["Remove the hardcoded secret", "Add tests"],
              }),
            },
          },
        ],
      }),
    );

    const insight = await generateAiInsight(sampleResult(), {
      env: {
        GEMINI_API_KEY: "test-key",
        AI_MODEL: "gemini-3.8-flash",
        AI_MAX_OUTPUT_TOKENS: "256",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(insight).toMatchObject({
      enabled: true,
      status: "ok",
      provider: "gemini",
      zeroCost: true,
      model: "gemini-3.8-flash",
      priorities: ["Remove the hardcoded secret", "Add tests"],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${GEMINI_OPENAI_BASE_URL}/chat/completions`);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
    });

    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("gemini-3.8-flash");
    expect(body.max_tokens).toBe(256);
    expect(body.reasoning_effort).toBe("low");
    expect(body.tools).toBeUndefined();
    expect(body.response_format).toBeUndefined();
    expect(body.messages[0].content).not.toContain("const key");
  });

  it("does not send Gemini-only reasoning effort to generic providers", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "A generic provider summary was returned.",
                priorities: ["Review the finding"],
              }),
            },
          },
        ],
      }),
    );

    const insight = await generateAiInsight(sampleResult(), {
      env: {
        AI_PROVIDER: "openai-compatible",
        AI_API_KEY: "test-key",
        AI_BASE_URL: "https://api.openai.com/v1",
        AI_MODEL: "gpt-4o-mini",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(insight.status).toBe("ok");
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.reasoning_effort).toBeUndefined();
  });

  it("retries a transient 503 and succeeds", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "The retry succeeded after a transient failure.",
                  priorities: ["Review the finding"],
                }),
              },
            },
          ],
        }),
      );

    const insight = await generateAiInsight(sampleResult(), {
      env: { GEMINI_API_KEY: "test-key" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      random: () => 0.5,
    });

    expect(insight.status).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(625);
  });

  it("honors Retry-After for transient rate limits", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "rate limited" }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "2" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "The rate-limited request succeeded after waiting.",
                  priorities: ["Review the finding"],
                }),
              },
            },
          ],
        }),
      );

    const insight = await generateAiInsight(sampleResult(), {
      env: { GEMINI_API_KEY: "test-key" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
    });

    expect(insight.status).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("retries a network failure and succeeds", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "The network retry succeeded.",
                  priorities: ["Review the finding"],
                }),
              },
            },
          ],
        }),
      );

    const insight = await generateAiInsight(sampleResult(), {
      env: { GEMINI_API_KEY: "test-key" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      random: () => 0,
    });

    expect(insight.status).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it("stops after the bounded retry budget", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "busy" }, 503));

    const insight = await generateAiInsight(sampleResult(), {
      env: { GEMINI_API_KEY: "test-key" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
      random: () => 0,
    });

    expect(insight.status).toBe("error");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-transient provider errors", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "bad request" }, 400));

    const insight = await generateAiInsight(sampleResult(), {
      env: { GEMINI_API_KEY: "test-key" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: sleep,
    });

    expect(insight.status).toBe("error");
    expect(insight.error).toMatch(/deterministic analysis/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("returns an error insight for invalid JSON content", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: "not json" } }] }),
    );
    const insight = await generateAiInsight(sampleResult(), {
      env: { GEMINI_API_KEY: "test-key" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(insight.status).toBe("error");
  });
});
