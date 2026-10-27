import { describe, expect, it } from "vitest";
import { resolveAiBaseUrl } from "@/lib/ai";
import { readJsonBody } from "@/lib/request-body";
import { resolveSiteUrl } from "@/lib/site-url";

function jsonRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("resolveSiteUrl", () => {
  it("returns a normalized origin for a valid URL", () => {
    expect(resolveSiteUrl("https://devpilot.example.com/some/path")).toBe(
      "https://devpilot.example.com",
    );
  });

  it("falls back to localhost for missing or invalid values", () => {
    expect(resolveSiteUrl(undefined)).toBe("http://localhost:3000");
    expect(resolveSiteUrl("")).toBe("http://localhost:3000");
    expect(resolveSiteUrl("not a url")).toBe("http://localhost:3000");
    expect(resolveSiteUrl("javascript:alert(1)")).toBe("http://localhost:3000");
    expect(resolveSiteUrl("ftp://example.com")).toBe("http://localhost:3000");
  });
});

describe("resolveAiBaseUrl", () => {
  it("defaults to the OpenAI endpoint", () => {
    expect(resolveAiBaseUrl(undefined)).toBe("https://api.openai.com/v1");
  });

  it("accepts http(s) endpoints and strips trailing slashes", () => {
    expect(resolveAiBaseUrl("http://localhost:11434/v1/")).toBe(
      "http://localhost:11434/v1",
    );
  });

  it("rejects non-http protocols and malformed values", () => {
    expect(resolveAiBaseUrl("file:///etc/passwd")).toBeNull();
    expect(resolveAiBaseUrl("not-a-url")).toBeNull();
    expect(resolveAiBaseUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("readJsonBody", () => {
  it("parses a JSON body within the limit", async () => {
    const result = await readJsonBody(jsonRequest('{"mode":"demo"}'));
    expect(result).toEqual({ ok: true, value: { mode: "demo" } });
  });

  it("rejects malformed JSON", async () => {
    const result = await readJsonBody(jsonRequest("{not json"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  it("rejects a body that exceeds the limit while streaming", async () => {
    const result = await readJsonBody(
      jsonRequest(JSON.stringify({ mode: "demo", padding: "x".repeat(20_000) })),
      10_000,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(413);
    }
  });

  it("rejects an oversized declared Content-Length without reading", async () => {
    const result = await readJsonBody(
      jsonRequest('{"mode":"demo"}', { "content-length": "999999" }),
      10_000,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(413);
    }
  });
});
