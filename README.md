# DevPilot AI

A working, deployable repository-analysis MVP built with Next.js 16, TypeScript, and Tailwind CSS.

Paste a public GitHub URL and DevPilot fetches a bounded snapshot of the actual source, runs deterministic rules, and returns a prioritized report with file and line evidence. AI summaries are optional and run server-side.

> **What this is not:** a security audit, a proof of correctness, or an autonomous code-modifying agent. The analyzer is heuristic. It can produce false positives and miss real issues. Always run your tests and review changes.

---

## What is implemented

- **Landing page** with a live preview generated from the bundled sample repository (no mocked findings).
- **Dashboard** with repository URL input, demo mode, validation, loading state, error state, and results.
- **Real GitHub analysis** using the GitHub REST API:
  - repository metadata and default branch
  - recursive tree listing
  - bounded file fetching (24 files, 100 KB per file, 300 KB total)
  - ignores `node_modules`, build output, lockfiles, generated files, and binaries
- **Deterministic analyzer** for TypeScript, JavaScript, and Python:
  - hardcoded credentials and token patterns
  - private keys
  - `eval`, `new Function`, `exec`
  - `dangerouslySetInnerHTML`, `innerHTML`, `document.write`
  - Python `shell=True`, unsafe `pickle`
  - empty catch blocks, bare `except`, swallowed exceptions
  - `debugger`, `@ts-ignore`, `any` escape hatches
  - large files, high branching density, long lines
  - missing tests and missing README
- **Findings panel** with severity/category labels, filters, search, code snippets, and suggested fixes.
- **Report export**: copy a Markdown report or download JSON.
- **Optional AI summary** through any OpenAI-compatible chat-completions endpoint. The AI receives finding metadata only, never full source files.
- **Security basics**: strict GitHub URL validation, SSRF-resistant fetch targets, server-only secrets, input validation with Zod, a bounded request-body reader, best-effort in-memory rate limiting, and hardened security headers.
- **Tests** for URL parsing, request validation, AI response parsing, and the deterministic analyzer.
- **Responsive UI** with mobile navigation and accessible labels, focus states, and live regions.

---

## Quick start

Requirements: **Node.js 20.9+** (Node 22/24/26 recommended) and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables are required to run the app or the demo. Without `GITHUB_TOKEN`, public repositories use GitHub's unauthenticated rate limit. Without `AI_API_KEY`, AI summaries are disabled and the deterministic report is still complete.

### Useful commands

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # TypeScript, no emit
npm run lint       # ESLint
npm test           # Vitest suite
npm run test:watch # Vitest in watch mode
```

---

## Environment variables

Copy `.env.example` to `.env.local`. All secrets are server-side only. Never prefix a secret with `NEXT_PUBLIC_`.

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | No | Raises GitHub API limits from 60 to 5,000 requests/hour and enables private repositories. |
| `AI_API_KEY` | No | Enables optional AI summaries. Any OpenAI-compatible key works. |
| `AI_BASE_URL` | No | Chat-completions base URL. Default: `https://api.openai.com/v1`. |
| `AI_MODEL` | No | Model name. Default: `gpt-4o-mini`. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical site URL for metadata, `robots.txt`, and `sitemap.xml`. |

### GitHub token

1. Create a token at GitHub → Settings → Developer settings → Personal access tokens.
2. Classic token: `public_repo` for public repositories, `repo` for private repositories.
3. Fine-grained token: grant **Repository contents: Read-only** for the repositories you want to analyze.
4. Put it in `.env.local`:

```bash
GITHUB_TOKEN=ghp_your_token_here
```

Without a token, one analysis can use roughly `2 + number_of_files` GitHub API requests. With 24 files, that is about 26 requests. The unauthenticated limit is 60 requests/hour per IP, so a token is strongly recommended if you plan to run more than one or two analyses per hour.

### AI provider examples

OpenAI:

```bash
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

OpenRouter:

```bash
AI_API_KEY=sk-or-...
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=your-model-name
```

Ollama (local, no cloud key):

```bash
AI_API_KEY=ollama
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
```

If the AI request fails, the API returns the complete deterministic report plus an AI error notice. It never fails the whole analysis because of an optional summary.

> **Privacy note:** the AI request includes repository name, counts, languages, and up to 10 finding metadata entries (title, file, line, severity, suggestion). It does **not** include full file contents or code snippets. Verify your provider's data-retention policy before using it with sensitive code.

---

## How analysis works

```
GitHub URL
   │
   ├─ validate URL (github.com only, strict owner/repo grammar)
   ├─ fetch repo metadata + default branch
   ├─ fetch recursive tree
   ├─ select up to 24 supported files within size limits
   ├─ fetch contents through the GitHub contents API
   ├─ run deterministic line/file/global rules
   ├─ compute severity counts and a heuristic score
   └─ optionally request an AI summary (metadata only)
```

### Limits

| Limit | Value |
|---|---|
| Files analyzed per run | 24 |
| Max file size | 100 KB |
| Max total fetched source | 300 KB |
| Supported languages | TypeScript, JavaScript, Python |
| API timeout | 12 s per GitHub request |
| Analysis route max duration | 60 s |
| Best-effort rate limit | 8 analyses/minute per IP |

The UI and API report when a scan is truncated or files are skipped. A clean report does not prove the repository is clean.

### Heuristic score

The score starts at 100 and subtracts a weighted penalty based on finding severity and density:

- critical: 10
- high: 6
- medium: 2
- low: 0.5
- info: 0.1

The penalty combines findings per file and findings per 100 lines, capped so the score never goes below 5. Grades: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, F below 60. This is a prioritization aid, not a formal rating.

### Demo mode

Demo mode analyzes a bundled, intentionally flawed sample repository in `lib/demo.ts`. It runs the exact same analyzer as a real GitHub scan. There are no pre-written findings, and the landing page preview is generated from the real demo result at build time.

---

## API

### `POST /api/analyze`

Request:

```json
{ "mode": "demo" }
```

```json
{ "mode": "github", "repoUrl": "https://github.com/owner/repo" }
```

Success: `200` with an `AnalysisResult` JSON object containing `repo`, `summary`, `findings`, `ai`, `warnings`, and `limits`.

Errors: `400` for invalid input, `403`/`404` for GitHub access issues, `429` for the app or GitHub rate limit, `500` for unexpected failures, `502` for GitHub/network failures.

### `GET /api/health`

Returns service status and non-secret configuration flags:

```json
{
  "status": "ok",
  "service": "devpilot-ai",
  "aiEnabled": false,
  "githubTokenConfigured": false,
  "timestamp": "..."
}
```

---

## Security and privacy

- **No source code storage.** Files are fetched and analyzed in memory. There is no database, object store, or cache of repository contents.
- **Server-only secrets.** `GITHUB_TOKEN`, `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` are read only in server code. No secret is exposed to the client bundle.
- **SSRF resistance.** The server only fetches `api.github.com` endpoints after strict GitHub URL validation. It does not accept arbitrary URLs.
- **Input validation.** Request bodies are validated with Zod; GitHub owner/repo names use strict patterns; URL length is capped; malformed percent-encoding is rejected instead of throwing.
- **Bounded request bodies.** `POST /api/analyze` rejects bodies over 10 KB. The cap is enforced from `Content-Length` and while streaming, so a chunked request cannot force unbounded buffering.
- **Bounded work.** File count, file size, total size, timeouts, and concurrency are capped.
- **Best-effort rate limiting.** The in-memory limiter slows accidental abuse but is not shared across serverless instances. For production-scale protection, put the app behind a platform rate limiter or add Redis/Upstash.
- **Security headers.** A restrictive Content-Security-Policy (no third-party scripts, `frame-ancestors 'none'`, `object-src 'none'`), `nosniff`, `DENY` framing, strict referrer policy, permissions policy, same-origin opener policy, and HSTS. `unsafe-eval` is limited to the development server.
- **Configuration validation.** An invalid `NEXT_PUBLIC_SITE_URL` falls back to localhost instead of crashing the build; an invalid `AI_BASE_URL` produces an AI-disabled notice instead of an unsafe fetch target.
- **AI minimization.** The AI layer receives finding metadata, not source files or snippets. It is instructed not to invent findings, and its output is validated with Zod before display.

If you analyze private code, review your AI provider's terms. If you do not want code metadata leaving your infrastructure, leave `AI_API_KEY` unset.

---

## Tests and verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The test suite covers:

- GitHub URL parsing and rejection of non-GitHub/traversal/malformed-encoding inputs
- request validation for demo/GitHub modes
- AI response parsing and rejection of malformed/invented shapes
- AI base URL validation (http/https only)
- site URL normalization and safe fallback
- bounded JSON body reading (valid, malformed, oversized, declared-length abuse)
- demo analysis producing real rule IDs
- findings only referencing supplied files
- clean-code scoring
- missing-test detection
- common test filename detection
- secret and empty-catch detection
- truncation warnings

Verified locally during development:

- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm test` — 28 tests passed across 4 files
- `npm run build` — passed
- production server: `/`, `/dashboard`, `/api/health`, `/robots.txt`, `/sitemap.xml` returned 200
- `POST /api/analyze` demo mode returned 200 with real findings
- `POST /api/analyze` against `https://github.com/sindresorhus/p-limit` returned 200 with real GitHub findings
- `POST /api/analyze` with malformed percent-encoding returned 400, not 500
- `POST /api/analyze` with a 20 KB body returned 413
- CSP and HSTS headers present; dashboard rendered with zero console errors
- desktop (1440px) and mobile (390px) layouts had no horizontal overflow

The live AI provider path was **not** tested with a real key in this environment. It is implemented with graceful failure handling. Private-repository access with a token was also not tested because no token was available.

---

## Deploy to Vercel

### Prerequisites

- A GitHub repository containing this project (pushed by you).
- A Vercel account.
- Optional but recommended: a GitHub token and an AI provider key (see [Environment variables](#environment-variables)).
- No database, storage bucket, cron job, or background worker is required.

### Steps

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Framework preset: **Next.js**. Root directory: `.`. Install command: `npm ci` (uses the committed lockfile). Build command: `npm run build`. Output: default `.next`.
4. Add environment variables in **Project → Settings → Environment Variables**:
   - `GITHUB_TOKEN` (recommended)
   - `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (optional)
   - `NEXT_PUBLIC_SITE_URL` set to your final `https://...` domain
5. Deploy.
6. Verify:
   - `https://your-domain/api/health` returns `status: "ok"`
   - `https://your-domain/dashboard?demo=1` runs the demo
   - a public GitHub URL returns a report
7. If your Vercel plan has a shorter function limit than 60 seconds, reduce `maxDuration` in `app/api/analyze/route.ts` or analyze smaller repositories.

No database, storage bucket, cron job, or background worker is required.

### Deployment checklist

- [ ] `npm ci && npm run typecheck && npm run lint && npm test && npm run build` pass in a clean checkout
- [ ] No `.env*` file is committed (`.env.example` is the only committed template)
- [ ] `GITHUB_TOKEN` and `AI_API_KEY` are set only in Vercel project settings, never in source
- [ ] `NEXT_PUBLIC_SITE_URL` matches the production domain
- [ ] `/api/health` reports `status: "ok"` after deploy
- [ ] `/dashboard?demo=1` completes without credentials

### Local production check

```bash
npm run build
npm run start
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
app/
  api/analyze/route.ts       analysis endpoint + rate limiting
  api/health/route.ts        deployment health check
  dashboard/page.tsx         dashboard shell
  page.tsx                   landing page
  layout.tsx                 metadata and root layout
  globals.css                Tailwind theme and design system
  not-found.tsx              custom 404
  robots.ts / sitemap.ts     SEO routes
components/
  dashboard/                 client dashboard and results UI
  landing/hero-preview.tsx   real demo output preview
  site-header.tsx            responsive navigation
  site-footer.tsx
  severity-badge.tsx
  score-ring.tsx
  github-icon.tsx
lib/
  analysis/analyze.ts        deterministic engine
  analysis/rules.ts          rule definitions
  github.ts                  GitHub fetch + limits
  ai.ts                      optional OpenAI-compatible summary
  demo.ts                    bundled sample repository
  repo-url.ts                strict URL parsing
  request-body.ts            bounded JSON body reader
  site-url.ts                safe canonical URL resolution
  validation.ts              Zod request validation
  types.ts                   shared types
  format.ts                  report formatting
tests/                       28 Vitest tests
```

---

## Troubleshooting

### "GitHub API rate limit reached"

Add `GITHUB_TOKEN` to `.env.local` and restart the server.

### "Repository not found"

Check the URL is `https://github.com/owner/repo`. Private repositories require a token with contents read access.

### "No supported source files could be read"

The repository may contain only unsupported languages, or the files may be too large. Supported: TypeScript, JavaScript, Python.

### AI summary is missing

Set `AI_API_KEY` and restart. The deterministic report works without it. If the provider fails, the report still returns with an AI error notice.

### Too many analyses

The built-in limiter allows 8 requests per minute per IP. Wait and retry, or adjust the limiter in `app/api/analyze/route.ts`.

---

## License

No license has been added yet. Choose one before distributing or accepting external contributions.
