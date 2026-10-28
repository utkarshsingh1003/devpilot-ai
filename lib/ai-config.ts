/**
 * AI provider configuration with a strict zero-cost profile for Google Gemini.
 *
 * The Gemini Developer API free tier is free of charge for eligible models and
 * does not require a billing account. To keep that guarantee, this module:
 *   - pins requests to the Gemini Developer API endpoint (never Vertex AI),
 *   - only allows models documented as free-tier eligible,
 *   - caps output tokens,
 *   - never enables tools or grounding (which can be billed per request).
 *
 * The app cannot inspect the Google Cloud project's billing state. Using a
 * project without a billing account is the operator's responsibility.
 */

import type { AiProvider } from "./types";

/** Minimal environment shape, so tests can pass plain objects. */
export type AiEnv = Record<string, string | undefined>;

export const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Default to a model verified to respond reliably within the request budget.
 * `gemini-3.8-flash` is still listed by the API but did not respond in testing
 * (>90s, both native and OpenAI-compatible endpoints), so it is not the default.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_COMPATIBLE_MODEL = "gpt-4o-mini";
export const DEFAULT_MAX_OUTPUT_TOKENS = 512;
export const MIN_MAX_OUTPUT_TOKENS = 128;
export const MAX_MAX_OUTPUT_TOKENS = 1024;

/**
 * Models documented as free-tier eligible on the Gemini Developer API pricing
 * page. Update this list deliberately after re-checking Google's pricing page;
 * anything else is rejected rather than risking a paid request.
 */
export const GEMINI_FREE_TIER_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

export type AiConfig =
  | {
      ok: true;
      provider: "gemini";
      apiKey: string;
      baseUrl: string;
      model: string;
      maxOutputTokens: number;
      zeroCost: true;
    }
  | {
      ok: true;
      provider: "openai-compatible";
      apiKey: string;
      baseUrl: string;
      model: string;
      maxOutputTokens: number;
      zeroCost: false;
    }
  | { ok: false; reason: "disabled" }
  | { ok: false; reason: "invalid"; message: string };

export function resolveAiProvider(
  env: AiEnv = process.env,
): AiProvider | null {
  const raw = env.AI_PROVIDER?.trim().toLowerCase();
  if (!raw) {
    return env.GEMINI_API_KEY?.trim() ? "gemini" : "openai-compatible";
  }
  if (raw === "gemini" || raw === "google") return "gemini";
  if (raw === "openai" || raw === "openai-compatible" || raw === "compatible") {
    return "openai-compatible";
  }
  return null;
}

export function isFreeTierGeminiModel(model: string): boolean {
  return (GEMINI_FREE_TIER_MODELS as readonly string[]).includes(model);
}

export function resolveMaxOutputTokens(raw?: string): number {
  const value = raw?.trim();
  if (!value) return DEFAULT_MAX_OUTPUT_TOKENS;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_OUTPUT_TOKENS;

  return Math.min(
    MAX_MAX_OUTPUT_TOKENS,
    Math.max(MIN_MAX_OUTPUT_TOKENS, Math.round(parsed)),
  );
}

/**
 * Validates a generic OpenAI-compatible endpoint. Only absolute HTTP(S) URLs
 * are accepted so a misconfigured environment variable cannot point the server
 * at a non-network protocol or a relative path.
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

export function resolveAiConfig(env: AiEnv = process.env): AiConfig {
  const provider = resolveAiProvider(env);
  if (!provider) {
    return {
      ok: false,
      reason: "invalid",
      message:
        "AI_PROVIDER must be either \"gemini\" or \"openai-compatible\". The deterministic analysis is unaffected.",
    };
  }

  const apiKey =
    provider === "gemini"
      ? env.GEMINI_API_KEY?.trim() || env.AI_API_KEY?.trim()
      : env.AI_API_KEY?.trim();

  if (!apiKey) {
    return { ok: false, reason: "disabled" };
  }

  const maxOutputTokens = resolveMaxOutputTokens(env.AI_MAX_OUTPUT_TOKENS);

  if (provider === "gemini") {
    const configuredBase = env.AI_BASE_URL?.trim();
    if (
      configuredBase &&
      configuredBase.replace(/\/+$/, "") !== GEMINI_OPENAI_BASE_URL
    ) {
      return {
        ok: false,
        reason: "invalid",
        message:
          "AI_BASE_URL must be unset or set to the Gemini Developer API endpoint for the zero-cost profile. Vertex AI and custom endpoints are not allowed.",
      };
    }

    const model = env.AI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
    if (!isFreeTierGeminiModel(model)) {
      return {
        ok: false,
        reason: "invalid",
        message: `Model "${model}" is not on the free-tier allowlist. Use one of: ${GEMINI_FREE_TIER_MODELS.join(", ")}.`,
      };
    }

    return {
      ok: true,
      provider: "gemini",
      apiKey,
      baseUrl: GEMINI_OPENAI_BASE_URL,
      model,
      maxOutputTokens,
      zeroCost: true,
    };
  }

  const baseUrl = resolveAiBaseUrl(env.AI_BASE_URL);
  if (!baseUrl) {
    return {
      ok: false,
      reason: "invalid",
      message:
        "AI_BASE_URL must be an absolute http(s) URL. The deterministic analysis is unaffected.",
    };
  }

  return {
    ok: true,
    provider: "openai-compatible",
    apiKey,
    baseUrl,
    model: env.AI_MODEL?.trim() || DEFAULT_COMPATIBLE_MODEL,
    maxOutputTokens,
    zeroCost: false,
  };
}

export interface AiStatus {
  enabled: boolean;
  provider: AiProvider | null;
  model: string | null;
  zeroCost: boolean;
}

/** Non-secret summary for health checks and server-rendered UI flags. */
export function getAiStatus(env: AiEnv = process.env): AiStatus {
  const config = resolveAiConfig(env);
  if (!config.ok) {
    return { enabled: false, provider: null, model: null, zeroCost: false };
  }
  return {
    enabled: true,
    provider: config.provider,
    model: config.model,
    zeroCost: config.zeroCost,
  };
}
