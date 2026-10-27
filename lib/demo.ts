import { analyzeRepository } from "./analysis/analyze";
import { detectLanguage } from "./languages";
import type { AnalysisResult, RepoFile } from "./types";

/**
 * A deliberately flawed, bundled sample repository.
 *
 * Demo mode runs the exact same deterministic analyzer as a real GitHub
 * repository. It does not contain pre-written findings or fake results.
 */
const DEMO_FILES: Array<{ path: string; content: string }> = [
  {
    path: "src/api/users.ts",
    content: `import { db } from "../db";

const API_KEY = "sk-demo-not-a-real-token-1234567890";
const adminPassword = "SuperSecret123!";

export async function getUser(id: any) {
  console.log("fetching user", id);

  try {
    const response = await fetch(\`https://api.example.com/users/\${id}\`, {
      headers: { Authorization: \`Bearer \${API_KEY}\` },
    });
    return response.json();
  } catch (error) {}
}

export function parsePayload(raw: string) {
  // TODO: validate the payload before parsing it
  return eval("(" + raw + ")");
}

export const config = {
  adminPassword,
  debug: true,
};
`,
  },
  {
    path: "src/components/UserCard.tsx",
    content: `type User = {
  id: string;
  name: string;
  bio: string;
};

export function UserCard({ user }: { user: any }) {
  return (
    <article>
      <h2>{user.name}</h2>
      <div dangerouslySetInnerHTML={{ __html: user.bio }} />
      <button onClick={() => console.log("clicked", user.id)}>View</button>
    </article>
  );
}
`,
  },
  {
    path: "src/legacy/report.js",
    content: `var cache = {};

function buildReport(rows) {
  debugger;
  var total = 0;

  for (var i = 0; i < rows.length; i++) {
    total += rows[i].amount;
  }

  return { total: total, rows: rows };
}

module.exports = { buildReport };
`,
  },
  {
    path: "src/utils/format.ts",
    content: `export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
`,
  },
  {
    path: "scripts/cleanup.py",
    content: `import subprocess


def run(command):
    try:
        return subprocess.check_output(command, shell=True)
    except:
        pass


def inspect(value):
    print("value", value)
    return eval(value)
`,
  },
  {
    path: "README.md",
    content: `# DevPilot sample repository

This is an intentionally flawed sample used by the DevPilot AI demo.

It contains a mix of TypeScript, JavaScript, and Python so the deterministic
analyzer can demonstrate security, bug, and maintainability signals.
`,
  },
];

const DEMO_SOURCE_PATHS = new Set(DEMO_FILES.map((file) => file.path));

export function getDemoFiles(): RepoFile[] {
  return DEMO_FILES.flatMap((file) => {
    const language = detectLanguage(file.path);
    if (!language || !DEMO_SOURCE_PATHS.has(file.path)) return [];
    return [{ path: file.path, content: file.content, language }];
  });
}

export function getDemoResult(): AnalysisResult {
  return analyzeRepository({
    repo: {
      owner: "DevPilot",
      name: "sample-repository",
      fullName: "DevPilot / bundled sample repository",
      url: null,
      branch: null,
      description:
        "An intentionally flawed TypeScript, JavaScript, and Python sample used by demo mode.",
      stars: null,
      isDemo: true,
    },
    files: getDemoFiles(),
    filesSkipped: 0,
    treeTruncated: false,
    hasReadme: true,
    testFiles: 0,
    warnings: [
      "Demo mode analyzes a bundled sample repository. Real GitHub URLs are analyzed with the same rules.",
    ],
    limits: {
      maxFiles: 0,
      maxFileBytes: 0,
      maxTotalBytes: 0,
      treeTruncated: false,
    },
  });
}
