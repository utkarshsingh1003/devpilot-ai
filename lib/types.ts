export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CATEGORIES = [
  "security",
  "bug",
  "maintainability",
  "performance",
  "testing",
  "style",
  "documentation",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Language = "TypeScript" | "JavaScript" | "Python";

export interface RepoFile {
  path: string;
  content: string;
  language: Language;
}

export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  file: string;
  line: number;
  snippet: string;
  suggestion: string;
  fix?: string;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface LanguageStat {
  name: Language;
  files: number;
  lines: number;
  percent: number;
}

export interface AnalysisSummary {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  filesAnalyzed: number;
  filesSkipped: number;
  totalLines: number;
  totalBytes: number;
  testFiles: number;
  hasTests: boolean;
  findingsTotal: number;
  findingsReturned: number;
  findingsTruncated: boolean;
  severityCounts: SeverityCounts;
  languages: LanguageStat[];
}

export interface RepoMeta {
  owner: string;
  name: string;
  fullName: string;
  url: string | null;
  branch: string | null;
  description: string | null;
  stars: number | null;
  isDemo: boolean;
}

export type AiStatus = "disabled" | "ok" | "error";

export type AiProvider = "gemini" | "openai-compatible";

export interface AiInsight {
  enabled: boolean;
  status: AiStatus;
  provider?: AiProvider;
  /** True only when the request is pinned to the Gemini free-tier profile. */
  zeroCost?: boolean;
  model?: string;
  summary?: string;
  priorities?: string[];
  error?: string;
}

export interface AnalysisResult {
  repo: RepoMeta;
  mode: "demo" | "github";
  generatedAt: string;
  summary: AnalysisSummary;
  findings: Finding[];
  ai: AiInsight;
  warnings: string[];
  limits: {
    maxFiles: number;
    maxFileBytes: number;
    maxTotalBytes: number;
    treeTruncated: boolean;
  };
}

export interface AnalyzeInput {
  repo: RepoMeta;
  files: RepoFile[];
  filesSkipped: number;
  treeTruncated: boolean;
  hasReadme: boolean;
  testFiles: number;
  warnings?: string[];
  limits?: Partial<AnalysisResult["limits"]>;
}
