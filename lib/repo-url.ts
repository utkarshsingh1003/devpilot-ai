export interface ParsedRepoUrl {
  owner: string;
  repo: string;
  branch?: string;
}

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

function validOwner(owner: string): boolean {
  return OWNER_RE.test(owner);
}

function decodeSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function validRepo(repo: string): boolean {
  return REPO_RE.test(repo) && repo !== "." && repo !== "..";
}

/**
 * Parses a GitHub repository reference without making any network request.
 *
 * Accepted forms:
 *   owner/repo
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch
 *   git@github.com:owner/repo.git
 *
 * Anything else (including non-GitHub hosts) is rejected. Keeping this strict
 * prevents the server from being used as a general-purpose URL fetcher.
 */
export function parseRepoUrl(input: string): ParsedRepoUrl | null {
  const value = input.trim();
  if (!value || value.length > 300) return null;

  // SSH form: git@github.com:owner/repo.git
  const sshMatch = value.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    const owner = sshMatch[1];
    const repo = sshMatch[2].replace(/\.git$/i, "");
    return validOwner(owner) && validRepo(repo) ? { owner, repo } : null;
  }

  // Shorthand: owner/repo
  if (!value.includes("://") && !value.includes("github.com")) {
    const parts = value.split("/").filter(Boolean);
    if (parts.length === 2) {
      const [owner, rawRepo] = parts;
      const repo = rawRepo.replace(/\.git$/i, "");
      return validOwner(owner) && validRepo(repo) ? { owner, repo } : null;
    }
    return null;
  }

  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "github.com") return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = decodeSegment(segments[0]);
  const rawRepo = decodeSegment(segments[1]);
  if (!owner || !rawRepo) return null;

  const repo = rawRepo.replace(/\.git$/i, "");
  if (!validOwner(owner) || !validRepo(repo)) return null;

  let branch: string | undefined;
  if (segments[2] === "tree" && segments[3]) {
    // Branches can contain slashes, but a /tree/ URL also contains a file path.
    // Using the first segment is the common, predictable case.
    const decodedBranch = decodeSegment(segments[3]);
    if (!decodedBranch) return null;
    branch = decodedBranch;
  }

  return { owner, repo, ...(branch ? { branch } : {}) };
}

export function repoKey(parsed: ParsedRepoUrl): string {
  return `${parsed.owner}/${parsed.repo}`.toLowerCase();
}
