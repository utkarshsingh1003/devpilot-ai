"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
  Loader2,
  Lock,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { AnalysisResults } from "@/components/dashboard/analysis-results";
import { GithubIcon } from "@/components/github-icon";
import { parseRepoUrl } from "@/lib/repo-url";
import type { AnalysisResult } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

export function DashboardClient({
  aiEnabled,
  aiProvider,
  aiModel,
  aiZeroCost,
  githubTokenConfigured,
}: {
  aiEnabled: boolean;
  aiProvider: "gemini" | "openai-compatible" | null;
  aiModel: string | null;
  aiZeroCost: boolean;
  githubTokenConfigured: boolean;
}) {
  const [repoUrl, setRepoUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const autoDemoStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const runAnalysis = useCallback(async (mode: "github" | "demo", url: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 90_000);

    setStatus("loading");
    setError(null);
    setInputError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "demo" ? { mode: "demo" } : { mode: "github", repoUrl: url }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => null)) as
        | AnalysisResult
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Analysis failed. Check the repository URL and try again.";
        throw new Error(message);
      }

      if (!data || !("summary" in data) || !("findings" in data)) {
        throw new Error("The server returned an unexpected response.");
      }

      setResult(data);
      setStatus("success");
    } catch (caught) {
      if (controller.signal.aborted && !timedOut) return;
      const message =
        timedOut
          ? "The analysis took too long and was stopped. Try a smaller repository or try again."
          : caught instanceof Error
            ? caught.message
            : "Analysis failed unexpectedly. Try again, or use the demo repository.";
      setError(message);
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1" && !autoDemoStarted.current) {
      autoDemoStarted.current = true;
      const timer = window.setTimeout(() => {
        void runAnalysis("demo", "");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [runAnalysis]);

  useEffect(() => {
    if (status === "success" && resultsRef.current) {
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [status]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = repoUrl.trim();
    if (!trimmed) {
      setInputError("Enter a GitHub repository URL, or use demo mode.");
      return;
    }
    if (!parseRepoUrl(trimmed)) {
      setInputError(
        "That does not look like a GitHub repository. Try https://github.com/owner/repo.",
      );
      return;
    }
    setInputError(null);
    void runAnalysis("github", trimmed);
  }

  function reset() {
    abortRef.current?.abort();
    setStatus("idle");
    setResult(null);
    setError(null);
    setInputError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span
          className={clsx(
            "badge",
            githubTokenConfigured
              ? "border-good/30 bg-good/10 text-good"
              : "border-warn/30 bg-warn/10 text-warn",
          )}
        >
          <GithubIcon className="h-3.5 w-3.5" />
          {githubTokenConfigured
            ? "GitHub token configured"
            : "Public GitHub limits — no token"}
        </span>
        <span
          className={clsx(
            "badge",
            aiEnabled
              ? "border-accent/30 bg-accent/10 text-accent-2"
              : "border-line bg-ink/50 text-muted",
          )}
          title={
            aiEnabled
              ? `${aiProvider === "gemini" ? "Google Gemini" : "OpenAI-compatible provider"}${
                  aiModel ? ` · ${aiModel}` : ""
                }${aiZeroCost ? " · free tier only" : ""}`
              : "Set GEMINI_API_KEY on the server to enable summaries"
          }
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {aiEnabled
            ? aiZeroCost
              ? "Gemini free tier"
              : "AI summaries enabled"
            : "AI summaries off"}
        </span>
        <span className="badge border-line bg-ink/50 text-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Secrets server-side only
        </span>
      </div>

      <section className="card relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                Analyze a repository
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Paste a public GitHub URL. DevPilot fetches a bounded snapshot, runs
                deterministic rules, and returns evidence with file and line references.
              </p>
            </div>
            <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent-2 sm:grid">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <label htmlFor="repo-url" className="text-xs font-semibold text-fg">
              GitHub repository URL
            </label>
            <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <GithubIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="repo-url"
                  name="repoUrl"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={repoUrl}
                  onChange={(event) => {
                    setRepoUrl(event.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="https://github.com/owner/repo"
                  className={clsx("input-base !pl-10", inputError && "!border-bad/60")}
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={inputError ? "repo-url-error" : "repo-url-hint"}
                  disabled={status === "loading"}
                />
              </div>
              <button type="submit" className="btn-primary shrink-0" disabled={status === "loading"}>
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Zap className="h-4 w-4" aria-hidden="true" />
                )}
                {status === "loading" ? "Analyzing…" : "Analyze repository"}
              </button>
            </div>

            {inputError ? (
              <p id="repo-url-error" className="mt-2 text-xs text-bad" role="alert">
                {inputError}
              </p>
            ) : (
              <p id="repo-url-hint" className="mt-2 text-xs text-muted">
                Also accepts <span className="mono text-fg">owner/repo</span>. Private
                repositories need a server-side <span className="mono text-fg">GITHUB_TOKEN</span>.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setRepoUrl("");
                  void runAnalysis("demo", "");
                }}
                className="btn-secondary !px-3.5 !py-2 text-xs"
                disabled={status === "loading"}
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Run bundled demo
              </button>
              <span className="text-[11px] text-muted">
                Demo analyzes real, intentionally flawed sample files with the same rules.
              </span>
            </div>
          </form>
        </div>
      </section>

      {status === "error" && error && (
        <div
          className="card flex gap-3 border-bad/30 bg-bad/[0.04] p-4 sm:p-5"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-bad" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-fg">Analysis could not run</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{error}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-good" aria-hidden="true" />
                Check the URL is public or configure GITHUB_TOKEN
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-good" aria-hidden="true" />
                Try the bundled demo instead
              </span>
            </div>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="card p-6 sm:p-8" role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-accent/25 bg-accent/10">
              <Loader2 className="h-5 w-5 animate-spin text-accent-2" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg">Fetching and analyzing source files</h2>
              <p className="mt-0.5 text-xs text-muted">
                This usually takes 5–30 seconds for a public repository.
              </p>
            </div>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="animate-shimmer h-full w-2/3 rounded-full bg-gradient-to-r from-accent via-accent-2 to-accent" />
          </div>
          <div className="mt-5 grid gap-2 text-xs text-muted sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-2" />
              Fetching repository snapshot
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-2 [animation-delay:200ms]" />
              Running deterministic rules
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-2 [animation-delay:400ms]" />
              Building prioritized report
            </span>
          </div>
        </div>
      )}

      {status === "success" && result && (
        <div ref={resultsRef} className="scroll-mt-24">
          <AnalysisResults result={result} onReset={reset} />
        </div>
      )}

      {status === "idle" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card p-6 sm:p-7">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-ink/60 text-accent-2">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-fg">What you will get</h2>
            <ul className="mt-4 space-y-3">
              {[
                "A heuristic health score with a transparent severity breakdown.",
                "Findings tied to a real file and line, not a generic checklist.",
                "A concrete suggested fix for every finding.",
                "Clear warnings when a scan is truncated or incomplete.",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-6 text-muted">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-good" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6 sm:p-7">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-ink/60 text-accent-2">
              <Terminal className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-fg">What gets analyzed</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p>
                Security patterns such as hardcoded credentials, <span className="mono text-fg">eval</span>,
                shell injection, and unsafe HTML.
              </p>
              <p>
                Bug signals such as empty catch blocks, bare Python excepts, and debugger
                statements.
              </p>
              <p>
                Maintainability signals such as large files, high branching density, type
                escape hatches, and missing tests.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runAnalysis("demo", "")}
              className="btn-secondary mt-5 !px-3.5 !py-2 text-xs"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              See the bundled demo
            </button>
          </div>

          <div className="card border-accent/20 bg-accent/[0.035] p-5 sm:col-span-2 sm:p-6">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-2" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-fg">No analysis yet</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Paste a GitHub URL above to start. The app is stateless: source files are
                  fetched and analyzed in memory, and no repository content is stored. AI
                  summaries are optional and receive finding metadata rather than full
                  source files.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col items-center justify-between gap-2 px-1 text-[11px] text-muted sm:flex-row">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          API keys never leave the server
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          Heuristic analysis, not a security audit
        </span>
      </div>
    </div>
  );
}
