import { detectLanguage, isAnalyzablePath, isReadme, isTestFile } from "./languages";
import { parseRepoUrl } from "./repo-url";
import type { AnalyzeInput, RepoFile } from "./types";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "devpilot-ai/0.1";
const MAX_FILES = 24;
const MAX_FILE_BYTES = 100_000;
const MAX_TOTAL_BYTES = 300_000;
const FETCH_TIMEOUT_MS = 12_000;

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  html_url: string;
  private: boolean;
  owner: { login: string };
}

interface GitHubTreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

interface GitHubContentResponse {
  type: string;
  encoding?: string;
  content?: string;
  size?: number;
}

export class GitHubError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

function githubHeaders(token?: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubFetch(url: string, token?: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: githubHeaders(token),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "[devpilot] GitHub request failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : "unknown error",
    );
    throw new GitHubError(
      "Could not reach GitHub. Check your network connection and try again.",
      502,
    );
  }

  if (response.ok) return response;

  if (response.status === 404) {
    throw new GitHubError(
      "Repository not found. Check the URL, or configure GITHUB_TOKEN if the repository is private.",
      404,
    );
  }

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new GitHubError(
        "GitHub API rate limit reached. Add a GITHUB_TOKEN to .env.local for a much higher limit.",
        429,
      );
    }
    throw new GitHubError(
      "GitHub denied the request. If this is a private repository, configure GITHUB_TOKEN.",
      403,
    );
  }

  throw new GitHubError(
    `GitHub returned an unexpected response (${response.status}).`,
    502,
  );
}

async function fetchJson<T>(url: string, token?: string): Promise<T> {
  const response = await githubFetch(url, token);
  try {
    return (await response.json()) as T;
  } catch {
    throw new GitHubError("GitHub returned an unreadable response.", 502);
  }
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  token?: string,
): Promise<string> {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`;
  const data = await fetchJson<GitHubContentResponse>(url, token);

  if (data.type !== "file" || typeof data.content !== "string") {
    throw new Error("Not a regular file");
  }

  const content =
    data.encoding === "base64"
      ? Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8")
      : data.content;

  if (content.includes("\u0000")) {
    throw new Error("Binary file");
  }
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
    throw new Error("File is too large");
  }

  return content;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function priority(path: string): number {
  if (/^(src|app|lib|packages|apps|server|components)\//i.test(path)) return 0;
  if (isTestFile(path)) return 2;
  return 1;
}

/**
 * Fetches and validates a GitHub repository, then returns a snapshot for the
 * deterministic analyzer. Only github.com API endpoints are contacted.
 */
export async function loadGitHubRepository(input: string): Promise<AnalyzeInput> {
  const parsed = parseRepoUrl(input);
  if (!parsed) {
    throw new GitHubError(
      "Enter a valid GitHub repository URL, for example https://github.com/owner/repo.",
      400,
    );
  }

  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  const { owner, repo } = parsed;
  const base = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  const metadata = await fetchJson<GitHubRepoResponse>(base, token);
  const branch = parsed.branch || metadata.default_branch;
  if (!branch) {
    throw new GitHubError("Could not determine the repository's default branch.", 502);
  }

  const tree = await fetchJson<GitHubTreeResponse>(
    `${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    token,
  );

  const paths = tree.tree.filter((entry) => entry.type === "blob");
  const candidates = paths
    .filter(
      (entry) =>
        isAnalyzablePath(entry.path) &&
        (entry.size === undefined || entry.size <= MAX_FILE_BYTES),
    )
    .sort((a, b) => {
      const priorityDelta = priority(a.path) - priority(b.path);
      return priorityDelta !== 0 ? priorityDelta : a.path.localeCompare(b.path);
    });

  const selected: GitHubTreeEntry[] = [];
  let plannedBytes = 0;
  for (const entry of candidates) {
    if (selected.length >= MAX_FILES) break;
    const size = entry.size ?? 0;
    if (size > 0 && plannedBytes + size > MAX_TOTAL_BYTES) continue;
    selected.push(entry);
    plannedBytes += size;
  }

  const warnings: string[] = [];
  const contents = await mapWithConcurrency(selected, 4, async (entry) => {
    try {
      return {
        path: entry.path,
        content: await fetchFileContent(owner, repo, branch, entry.path, token),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      warnings.push(`Could not read ${entry.path}: ${reason}.`);
      return null;
    }
  });

  const files: RepoFile[] = [];
  for (const item of contents) {
    if (!item) continue;
    const language = detectLanguage(item.path);
    if (!language) continue;
    files.push({ path: item.path, content: item.content, language });
  }

  if (files.length === 0) {
    throw new GitHubError(
      "No supported source files could be read from this repository. DevPilot analyzes TypeScript, JavaScript, and Python files.",
      422,
    );
  }

  // Files that failed to download already produce a specific warning, so this
  // count only reflects files excluded by the file-count and size budgets.
  const skippedByLimits = Math.max(0, candidates.length - selected.length);

  return {
    repo: {
      owner: metadata.owner.login,
      name: metadata.name,
      fullName: metadata.full_name,
      url: metadata.html_url,
      branch,
      description: metadata.description,
      stars: metadata.stargazers_count,
      isDemo: false,
    },
    files,
    filesSkipped: skippedByLimits,
    treeTruncated: tree.truncated,
    hasReadme: paths.some((entry) => isReadme(entry.path)),
    testFiles: paths.filter((entry) => isTestFile(entry.path)).length,
    warnings,
    limits: {
      maxFiles: MAX_FILES,
      maxFileBytes: MAX_FILE_BYTES,
      maxTotalBytes: MAX_TOTAL_BYTES,
      treeTruncated: tree.truncated,
    },
  };
}

export const GITHUB_LIMITS = {
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
};
