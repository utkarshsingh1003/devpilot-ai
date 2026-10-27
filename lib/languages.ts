import type { Language } from "./types";

const LANGUAGE_BY_EXTENSION: Record<string, Language> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
};

const IGNORED_SEGMENTS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".turbo",
  ".cache",
  "generated",
  "migrations",
]);

export const IGNORED_FILE_RE =
  /(\.min\.(js|css)$|\.d\.ts$|\.map$|\.lock$|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$)/i;

export const TEST_FILE_RE =
  /(^|\/)(__tests__|tests?|specs?)\/|(^|\/)(test|tests|spec|specs)\.[cm]?[jt]sx?$|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]+\.py$|_test\.py$/i;

export function detectLanguage(path: string): Language | null {
  const clean = path.split("?")[0].split("#")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return LANGUAGE_BY_EXTENSION[ext] ?? null;
}

export function isIgnoredPath(path: string): boolean {
  const segments = path.split("/");
  if (segments.some((segment) => IGNORED_SEGMENTS.has(segment.toLowerCase()))) {
    return true;
  }
  return IGNORED_FILE_RE.test(path);
}

export function isTestFile(path: string): boolean {
  return TEST_FILE_RE.test(path);
}

export function isReadme(path: string): boolean {
  return /^readme(\.(md|mdx|rst|txt))?$/i.test(path);
}

export function isAnalyzablePath(path: string): boolean {
  if (isIgnoredPath(path)) return false;
  return detectLanguage(path) !== null;
}

export function countLines(content: string): number {
  if (!content) return 0;
  return content.split(/\r\n|\r|\n/).length;
}
