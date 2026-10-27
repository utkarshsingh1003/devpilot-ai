import { describe, expect, it } from "vitest";
import { parseRepoUrl } from "@/lib/repo-url";

describe("parseRepoUrl", () => {
  it("accepts a canonical GitHub URL", () => {
    expect(parseRepoUrl("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("accepts owner/repo shorthand and strips .git", () => {
    expect(parseRepoUrl("sindresorhus/p-limit")).toEqual({
      owner: "sindresorhus",
      repo: "p-limit",
    });
    expect(parseRepoUrl("https://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("accepts SSH URLs and tree URLs", () => {
    expect(parseRepoUrl("git@github.com:owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    expect(parseRepoUrl("https://github.com/owner/repo/tree/main")).toEqual({
      owner: "owner",
      repo: "repo",
      branch: "main",
    });
  });

  it("rejects non-GitHub hosts and malformed input", () => {
    expect(parseRepoUrl("https://gitlab.com/owner/repo")).toBeNull();
    expect(parseRepoUrl("https://github.com/only-owner")).toBeNull();
    expect(parseRepoUrl("javascript:alert(1)")).toBeNull();
    expect(parseRepoUrl("")).toBeNull();
    expect(parseRepoUrl("https://evil.example/github.com/owner/repo")).toBeNull();
    expect(parseRepoUrl("https://github.com/owner-/repo")).toBeNull();
  });

  it("rejects path traversal style owner and repo names", () => {
    expect(parseRepoUrl("https://github.com/../repo")).toBeNull();
    expect(parseRepoUrl("https://github.com/owner/..")).toBeNull();
    expect(parseRepoUrl("https://github.com/owner/repo/issues/1")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("returns null instead of throwing on malformed percent-encoding", () => {
    expect(() => parseRepoUrl("https://github.com/%E0%A4%A/repo")).not.toThrow();
    expect(parseRepoUrl("https://github.com/%E0%A4%A/repo")).toBeNull();
    expect(parseRepoUrl("https://github.com/owner/%ZZ")).toBeNull();
    expect(parseRepoUrl("https://github.com/owner/repo/tree/%E0%A4%A")).toBeNull();
  });
});
