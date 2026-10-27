"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FlaskConical,
  GitBranch,
  Info,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { SeverityBadge, SeverityDot } from "@/components/severity-badge";
import { ScoreRing } from "@/components/score-ring";
import {
  categoryLabel,
  formatBytes,
  formatDate,
  formatNumber,
  severityLabel,
  toMarkdownReport,
} from "@/lib/format";
import type { AnalysisResult, Finding, Severity } from "@/lib/types";
import { SEVERITIES } from "@/lib/types";

const SEVERITY_FILTERS: Array<Severity | "all"> = ["all", ...SEVERITIES];

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-[#3178c6]",
  JavaScript: "bg-[#f7df1e]",
  Python: "bg-[#3776ab]",
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof FileCode2;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-fg">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

function FindingCard({ finding, defaultOpen }: { finding: Finding; defaultOpen?: boolean }) {
  return (
    <details
      className="group card overflow-hidden transition open:border-line-strong"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3.5 transition hover:bg-white/[0.025] sm:px-5">
        <SeverityBadge severity={finding.severity} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold text-fg">{finding.title}</h3>
            <span className="text-[10px] font-medium tracking-wide text-muted uppercase">
              {categoryLabel(finding.category)}
            </span>
          </div>
          <p className="mono mt-1 truncate text-[11px] text-muted">
            {finding.file}
            {finding.line > 0 ? `:${finding.line}` : ""}
          </p>
        </div>
        <span className="mt-0.5 hidden shrink-0 text-[11px] text-muted transition group-open:rotate-180 sm:block">
          ▾
        </span>
      </summary>

      <div className="border-t border-line/70 px-4 py-4 sm:px-5">
        <p className="text-sm leading-6 text-muted">{finding.description}</p>

        {finding.snippet && (
          <pre className="code-block mt-3 whitespace-pre-wrap">
            <code>{finding.snippet}</code>
          </pre>
        )}

        <div className="mt-3 rounded-xl border border-good/20 bg-good/[0.04] p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-good uppercase">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Suggested fix
          </div>
          <p className="mt-1.5 text-sm leading-6 text-fg/90">{finding.suggestion}</p>
          {finding.fix && (
            <pre className="code-block mt-2.5">
              <code>{finding.fix}</code>
            </pre>
          )}
        </div>
      </div>
    </details>
  );
}

export function AnalysisResults({
  result,
  onReset,
}: {
  result: AnalysisResult;
  onReset: () => void;
}) {
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return result.findings.filter((finding) => {
      if (severityFilter !== "all" && finding.severity !== severityFilter) return false;
      if (!normalizedQuery) return true;
      return (
        finding.title.toLowerCase().includes(normalizedQuery) ||
        finding.file.toLowerCase().includes(normalizedQuery) ||
        finding.category.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [result.findings, severityFilter, query]);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `devpilot-${result.repo.name.replace(/[^a-z0-9-_]/gi, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoking immediately can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(toMarkdownReport(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const counts = result.summary.severityCounts;

  return (
    <section className="animate-fade-up space-y-5" aria-live="polite">
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-fg">{result.repo.fullName}</h2>
              {result.mode === "demo" ? (
                <span className="badge border-accent/30 bg-accent/10 text-accent-2">
                  Bundled demo
                </span>
              ) : (
                <span className="badge border-good/30 bg-good/10 text-good">GitHub</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
              {result.repo.url && (
                <a
                  href={result.repo.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 hover:text-fg"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  View on GitHub
                </a>
              )}
              {result.repo.branch && (
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3" aria-hidden="true" />
                  {result.repo.branch}
                </span>
              )}
              {typeof result.repo.stars === "number" && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" aria-hidden="true" />
                  {formatNumber(result.repo.stars)} stars
                </span>
              )}
              <span>Analyzed {formatDate(result.generatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyMarkdown} className="btn-secondary !px-3 !py-2 text-xs">
              {copied ? (
                <Check className="h-3.5 w-3.5 text-good" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy report"}
            </button>
            <button type="button" onClick={downloadJson} className="btn-secondary !px-3 !py-2 text-xs">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              JSON
            </button>
            <button type="button" onClick={onReset} className="btn-ghost !px-3 !py-2 text-xs">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              New analysis
            </button>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex items-center gap-5">
            <ScoreRing score={result.summary.score} grade={result.summary.grade} />
            <div className="max-w-[13rem]">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                Heuristic health score
              </p>
              <p className="mt-1 text-sm leading-6 text-fg">
                Based on finding severity and density, not a formal security rating.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatCard
              icon={FileCode2}
              label="Files"
              value={formatNumber(result.summary.filesAnalyzed)}
              hint={`${formatBytes(result.summary.totalBytes)} fetched`}
            />
            <StatCard
              icon={Search}
              label="Lines"
              value={formatNumber(result.summary.totalLines)}
              hint={`${result.summary.languages.length} language${result.summary.languages.length === 1 ? "" : "s"}`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Findings"
              value={formatNumber(result.summary.findingsTotal)}
              hint={`${counts.critical + counts.high} high priority`}
            />
            <StatCard
              icon={FlaskConical}
              label="Tests"
              value={result.summary.hasTests ? formatNumber(result.summary.testFiles) : "None"}
              hint={result.summary.hasTests ? "test files detected" : "coverage gap"}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div
          className={clsx(
            "card p-5 sm:p-6",
            result.ai.status === "ok" && "border-accent/25 bg-accent/[0.04]",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles
                className={clsx(
                  "h-4 w-4",
                  result.ai.status === "ok" ? "text-accent-2" : "text-muted",
                )}
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-fg">AI summary</h3>
            </div>
            {result.ai.status === "ok" && (
              <span className="mono text-[10px] text-muted">
                {result.ai.provider === "gemini" ? "Gemini" : "AI"}
                {result.ai.model ? ` · ${result.ai.model}` : ""}
                {result.ai.zeroCost ? " · free tier" : ""}
              </span>
            )}
          </div>

          {result.ai.status === "ok" ? (
            <div className="mt-3">
              <p className="text-sm leading-6 text-fg/90">{result.ai.summary}</p>
              {result.ai.priorities && result.ai.priorities.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {result.ai.priorities.map((priority) => (
                    <li key={priority} className="flex gap-2 text-sm leading-6 text-muted">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" />
                      {priority}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[10px] text-muted">
                AI-generated from finding metadata only. Verify before acting.
                {result.ai.zeroCost
                  ? " Gemini free tier: prompts may be used to improve Google products, and no source code is sent."
                  : ""}
              </p>
            </div>
          ) : result.ai.status === "error" ? (
            <div className="mt-3 flex gap-2 rounded-xl border border-warn/20 bg-warn/5 p-3 text-sm leading-6 text-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
              {result.ai.error}
            </div>
          ) : (
            <div className="mt-3 flex gap-2 rounded-xl border border-line bg-ink/40 p-3 text-sm leading-6 text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <span>
                AI summaries are off. Deterministic analysis is complete. Set{" "}
                <span className="mono text-fg">GEMINI_API_KEY</span> on the server to add
                a plain-language briefing from the Gemini free tier.
              </span>
            </div>
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-fg">Languages</h3>
          <div className="mt-4 space-y-3">
            {result.summary.languages.length === 0 && (
              <p className="text-sm text-muted">No supported source files were analyzed.</p>
            )}
            {result.summary.languages.map((language) => (
              <div key={language.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg">{language.name}</span>
                  <span className="mono text-muted">{language.percent}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={clsx(
                      "h-full rounded-full",
                      LANGUAGE_COLORS[language.name] ?? "bg-accent",
                    )}
                    style={{ width: `${Math.max(2, language.percent)}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-muted">
                  {language.files} file{language.files === 1 ? "" : "s"} ·{" "}
                  {formatNumber(language.lines)} lines
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="card border-warn/20 bg-warn/[0.03] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-warn">
            <Info className="h-4 w-4" aria-hidden="true" />
            Analysis notes
          </div>
          <ul className="mt-2 space-y-1.5">
            {result.warnings.map((warning) => (
              <li key={warning} className="text-xs leading-5 text-muted">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fg">Findings</h3>
              <p className="mt-0.5 text-[11px] text-muted">
                {result.summary.findingsTotal === 0
                  ? "No rule-based findings in the analyzed files."
                  : `${result.summary.findingsReturned} of ${result.summary.findingsTotal} shown, sorted by severity.`}
              </p>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by file, title, category"
                className="input-base !py-2 !pl-9 text-xs sm:w-64"
                aria-label="Filter findings"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_FILTERS.map((filter) => {
              const count =
                filter === "all" ? result.summary.findingsTotal : counts[filter];
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSeverityFilter(filter)}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                    severityFilter === filter
                      ? "border-accent/50 bg-accent/15 text-white"
                      : "border-line bg-ink/40 text-muted hover:border-line-strong hover:text-fg",
                  )}
                  aria-pressed={severityFilter === filter}
                >
                  {filter !== "all" && <SeverityDot severity={filter} />}
                  {filter === "all" ? "All" : severityLabel(filter)}
                  <span className="mono text-[10px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5 p-4 sm:p-5">
          {filtered.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
              <FlaskConical className="h-8 w-8 text-muted" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-fg">
                {result.summary.findingsTotal === 0
                  ? "No rule-based findings detected."
                  : "No findings match this filter."}
              </p>
              <p className="mt-1 max-w-md text-xs leading-5 text-muted">
                {result.summary.findingsTotal === 0
                  ? "That is not proof the code is correct. Run your tests, type checks, and a human review before shipping."
                  : "Try a different severity or clear the search text."}
              </p>
            </div>
          ) : (
            filtered.map((finding, index) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                defaultOpen={index === 0 && severityFilter === "all" && !query}
              />
            ))
          )}

          {result.summary.findingsTruncated && (
            <p className="pt-1 text-center text-[11px] text-muted">
              Additional findings were detected but omitted from this view. Download the
              JSON report for the returned set, or narrow the scan.
            </p>
          )}
        </div>
      </div>

      <p className="px-1 text-center text-[11px] leading-5 text-muted">
        DevPilot fetches a bounded snapshot and analyzes it in memory. It does not store
        source code or create a database record. Results are heuristic and may be
        incomplete.
      </p>
    </section>
  );
}
