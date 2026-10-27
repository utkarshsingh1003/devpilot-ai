import Link from "next/link";
import { ArrowUpRight, ShieldAlert, Sparkles } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { ScoreRing } from "@/components/score-ring";
import type { AnalysisResult } from "@/lib/types";

export function HeroPreview({ result }: { result: AnalysisResult }) {
  const topFindings = result.findings.slice(0, 3);

  return (
    <div className="relative animate-fade-up delay-2">
      <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-accent/20 via-transparent to-accent-2/15 blur-2xl" />
      <div className="card relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-bad/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-good/80" />
          </div>
          <span className="mono text-[10px] tracking-wider text-muted uppercase">
            live demo output
          </span>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-accent-2 uppercase">
                Bundled sample repository
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-fg">
                DevPilot / sample-repository
              </h3>
              <p className="mt-1 text-xs text-muted">
                TypeScript · JavaScript · Python · no tests
              </p>
            </div>
            <ScoreRing score={result.summary.score} grade={result.summary.grade} size={92} />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="card-soft px-3 py-2.5">
              <div className="text-lg font-semibold text-fg">
                {result.summary.filesAnalyzed}
              </div>
              <div className="text-[10px] text-muted">files</div>
            </div>
            <div className="card-soft px-3 py-2.5">
              <div className="text-lg font-semibold text-fg">
                {result.summary.findingsTotal}
              </div>
              <div className="text-[10px] text-muted">findings</div>
            </div>
            <div className="card-soft px-3 py-2.5">
              <div className="text-lg font-semibold text-critical">
                {result.summary.severityCounts.critical}
              </div>
              <div className="text-[10px] text-muted">critical</div>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {topFindings.map((finding) => (
              <div
                key={finding.id}
                className="rounded-xl border border-line bg-ink/60 px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <SeverityBadge severity={finding.severity} withDot={false} />
                    <span className="truncate text-xs font-medium text-fg">
                      {finding.title}
                    </span>
                  </div>
                  <span className="mono shrink-0 text-[10px] text-muted">
                    {finding.file.split("/").pop()}:{finding.line}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/5 px-3.5 py-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldAlert className="h-4 w-4 text-accent-2" aria-hidden="true" />
              Evidence-backed, rule-based findings
            </div>
            <Link
              href="/dashboard?demo=1"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-2 hover:text-white"
            >
              Try it
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Actual output from the bundled sample. No mocked findings.
          </p>
        </div>
      </div>
    </div>
  );
}
