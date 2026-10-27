import { describe, expect, it } from "vitest";
import { parseAiResponse } from "@/lib/ai";
import { validateAnalyzeRequest } from "@/lib/validation";

describe("validateAnalyzeRequest", () => {
  it("accepts demo mode without a URL", () => {
    expect(validateAnalyzeRequest({ mode: "demo" })).toEqual({
      ok: true,
      mode: "demo",
      repoUrl: null,
    });
  });

  it("accepts a valid GitHub URL", () => {
    expect(
      validateAnalyzeRequest({
        mode: "github",
        repoUrl: "https://github.com/vercel/next.js",
      }),
    ).toEqual({
      ok: true,
      mode: "github",
      repoUrl: "https://github.com/vercel/next.js",
    });
  });

  it("rejects missing and non-GitHub URLs", () => {
    expect(validateAnalyzeRequest({ mode: "github" }).ok).toBe(false);
    expect(
      validateAnalyzeRequest({ mode: "github", repoUrl: "https://gitlab.com/a/b" }).ok,
    ).toBe(false);
    expect(
      validateAnalyzeRequest({ mode: "github", repoUrl: "x".repeat(301) }).ok,
    ).toBe(false);
  });

  it("rejects malformed payloads", () => {
    expect(validateAnalyzeRequest(null).ok).toBe(false);
    expect(validateAnalyzeRequest({ mode: "unknown" }).ok).toBe(false);
  });
});

describe("parseAiResponse", () => {
  it("parses plain and fenced JSON", () => {
    expect(
      parseAiResponse('{"summary":"A useful summary of the findings.","priorities":["Fix secrets"]}'),
    ).toEqual({
      summary: "A useful summary of the findings.",
      priorities: ["Fix secrets"],
    });
    expect(
      parseAiResponse(
        '```json\n{"summary":"A useful summary of the findings.","priorities":["Fix secrets"]}\n```',
      ),
    ).not.toBeNull();
  });

  it("rejects invalid or invented shapes", () => {
    expect(parseAiResponse("not json")).toBeNull();
    expect(parseAiResponse('{"summary":"short","priorities":[]}')).toBeNull();
    expect(parseAiResponse('{"summary":"A sufficiently long summary here.","priorities":"nope"}')).toBeNull();
  });
});
