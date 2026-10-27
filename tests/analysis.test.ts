import { describe, expect, it } from "vitest";
import { analyzeRepository } from "@/lib/analysis/analyze";
import { getDemoResult } from "@/lib/demo";
import { isTestFile } from "@/lib/languages";
import type { AnalyzeInput } from "@/lib/types";

const repo = {
  owner: "test",
  name: "repo",
  fullName: "test/repo",
  url: "https://github.com/test/repo",
  branch: "main",
  description: null,
  stars: 0,
  isDemo: false,
};

function input(overrides: Partial<AnalyzeInput> = {}): AnalyzeInput {
  return {
    repo,
    files: [],
    filesSkipped: 0,
    treeTruncated: false,
    hasReadme: true,
    testFiles: 0,
    ...overrides,
  };
}

describe("deterministic analysis", () => {
  it("finds real issues in the bundled demo repository", () => {
    const result = getDemoResult();
    const ruleIds = new Set(result.findings.map((finding) => finding.ruleId));

    expect(result.mode).toBe("demo");
    expect(result.summary.filesAnalyzed).toBe(5);
    expect(result.summary.totalLines).toBeGreaterThan(50);
    expect(result.summary.findingsTotal).toBeGreaterThan(8);
    expect(ruleIds).toContain("security.hardcoded-secret");
    expect(ruleIds).toContain("security.eval");
    expect(ruleIds).toContain("bug.empty-catch");
    expect(ruleIds).toContain("bug.bare-except");
    expect(ruleIds).toContain("security.shell-true");
    expect(ruleIds).toContain("testing.no-tests");
    expect(result.summary.severityCounts.critical).toBeGreaterThan(0);
    expect(result.summary.score).toBeGreaterThanOrEqual(0);
    expect(result.summary.score).toBeLessThanOrEqual(100);
    expect(result.summary.languages.map((language) => language.name)).toEqual(
      expect.arrayContaining(["TypeScript", "JavaScript", "Python"]),
    );
  });

  it("only reports findings for files that were actually supplied", () => {
    const result = getDemoResult();
    const demoPaths = new Set([
      "src/api/users.ts",
      "src/components/UserCard.tsx",
      "src/legacy/report.js",
      "src/utils/format.ts",
      "scripts/cleanup.py",
    ]);

    for (const finding of result.findings) {
      if (finding.file === "(repository)") continue;
      expect(demoPaths.has(finding.file)).toBe(true);
      expect(finding.line).toBeGreaterThan(0);
    }
  });

  it("returns a perfect score for clean code with tests", () => {
    const result = analyzeRepository(
      input({
        files: [
          {
            path: "src/math.ts",
            language: "TypeScript",
            content: [
              "export function add(a: number, b: number): number {",
              "  return a + b;",
              "}",
            ].join("\n"),
          },
        ],
        testFiles: 1,
      }),
    );

    expect(result.summary.findingsTotal).toBe(0);
    expect(result.summary.score).toBe(100);
    expect(result.summary.grade).toBe("A");
  });

  it("reports a missing test suite without inventing file-level findings", () => {
    const result = analyzeRepository(
      input({
        files: [
          {
            path: "src/math.ts",
            language: "TypeScript",
            content: "export const answer = 42;\n",
          },
        ],
        testFiles: 0,
      }),
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].ruleId).toBe("testing.no-tests");
    expect(result.findings[0].file).toBe("(repository)");
  });

  it("flags hardcoded secrets and empty catch blocks", () => {
    const result = analyzeRepository(
      input({
        hasReadme: true,
        testFiles: 1,
        files: [
          {
            path: "src/config.ts",
            language: "TypeScript",
            content: [
              'const apiKey = "sk-test-fixture-0000000000000000";',
              "try {",
              "  run();",
              "} catch (error) {}",
            ].join("\n"),
          },
        ],
      }),
    );

    const ids = result.findings.map((finding) => finding.ruleId);
    expect(ids).toContain("security.token-pattern");
    expect(ids).toContain("bug.empty-catch");
    expect(result.findings.find((finding) => finding.ruleId === "bug.empty-catch")?.line).toBe(4);
  });

  it("recognizes common test file names", () => {
    expect(isTestFile("test.js")).toBe(true);
    expect(isTestFile("tests/index.ts")).toBe(true);
    expect(isTestFile("src/math.test.ts")).toBe(true);
    expect(isTestFile("scripts/cleanup.py")).toBe(false);
    expect(isTestFile("src/contest.js")).toBe(false);
  });

  it("records truncation warnings", () => {
    const result = analyzeRepository(
      input({
        files: [
          {
            path: "src/a.ts",
            language: "TypeScript",
            content: "export const value = 1;\n",
          },
        ],
        filesSkipped: 3,
        treeTruncated: true,
        testFiles: 1,
      }),
    );

    expect(result.warnings.join(" ")).toMatch(/truncated/i);
    expect(result.warnings.join(" ")).toMatch(/3 eligible source files/i);
  });
});
