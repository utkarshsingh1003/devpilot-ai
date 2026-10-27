import Link from "next/link";
import {
  ArrowRight,
  Bug,
  Check,
  Code2,
  FileText,
  FlaskConical,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { GithubIcon } from "@/components/github-icon";
import { HeroPreview } from "@/components/landing/hero-preview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDemoResult } from "@/lib/demo";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Security signals",
    copy: "Hardcoded credentials, unsafe eval, shell injection patterns, and unescaped HTML — each tied to a file and line.",
  },
  {
    icon: Bug,
    title: "Bug risk review",
    copy: "Empty catch blocks, bare excepts, debugger statements, and other patterns that hide failures in production.",
  },
  {
    icon: FlaskConical,
    title: "Testing gaps",
    copy: "Detects whether the repository has recognizable tests, so you know where confidence is missing.",
  },
  {
    icon: FileText,
    title: "Maintainability",
    copy: "Large files, high branching density, long lines, and type escape hatches that make future changes expensive.",
  },
];

const STEPS = [
  {
    icon: GithubIcon,
    title: "Paste a repository URL",
    copy: "Use a public GitHub URL or configure a token for private repositories. Demo mode analyzes a bundled sample.",
  },
  {
    icon: Search,
    title: "Scan real source files",
    copy: "DevPilot fetches a bounded snapshot and runs deterministic rules locally on the server. Nothing is invented.",
  },
  {
    icon: Sparkles,
    title: "Read a prioritized report",
    copy: "See severity, evidence, and suggested fixes. Add an optional AI summary for a plain-language briefing.",
  },
];

const LIMITS = [
  {
    title: "Not a security audit",
    copy: "The analyzer uses heuristics. It can produce false positives and cannot prove that code is secure.",
  },
  {
    title: "Bounded by design",
    copy: "A run fetches up to 24 supported files (TypeScript, JavaScript, Python) within a size budget.",
  },
  {
    title: "No fake findings",
    copy: "Every finding comes from source text that was actually analyzed. The AI layer summarizes results; it does not invent them.",
  },
  {
    title: "You stay in control",
    copy: "No source code is stored. AI is optional, server-side, and receives finding metadata rather than full files.",
  },
];

export default function HomePage() {
  const demo = getDemoResult();

  return (
    <div className="min-h-screen">
      <AmbientBackground />
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="container-page grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
            <div className="animate-fade-up">
              <div className="badge border-accent/30 bg-accent/10 text-accent-2">
                <span className="h-1.5 w-1.5 rounded-full bg-good" />
                Working MVP · deterministic analysis + optional AI
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
                A second pair of eyes for <span className="text-gradient">every repository.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
                Paste a GitHub URL. DevPilot scans the actual source for security,
                bug, testing, and maintainability signals — then gives you a prioritized
                report with file and line evidence.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard" className="btn-primary group">
                  Analyze a repository
                  <ArrowRight
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link href="/dashboard?demo=1" className="btn-secondary">
                  <Terminal className="h-4 w-4" aria-hidden="true" />
                  Run the live demo
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-good" aria-hidden="true" />
                  No source code stored
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-good" aria-hidden="true" />
                  Keys stay on the server
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-good" aria-hidden="true" />
                  Works without an AI key
                </span>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/60 px-3 py-1.5">
                  <Code2 className="h-3.5 w-3.5 text-accent-2" aria-hidden="true" />
                  TypeScript
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/60 px-3 py-1.5">
                  <Code2 className="h-3.5 w-3.5 text-accent-2" aria-hidden="true" />
                  JavaScript
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/60 px-3 py-1.5">
                  <Code2 className="h-3.5 w-3.5 text-accent-2" aria-hidden="true" />
                  Python
                </span>
              </div>
            </div>

            <HeroPreview result={demo} />
          </div>
        </section>

        <section id="features" className="border-t border-line/60">
          <div className="container-page py-20 sm:py-24">
            <div className="max-w-2xl">
              <p className="eyebrow">What it looks for</p>
              <h2 className="section-title mt-3">
                Practical signals, not a wall of noise.
              </h2>
              <p className="section-copy">
                Every rule is explainable. You can see the exact line, understand why it
                matters, and decide what to do next.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="card group p-5 transition hover:-translate-y-1 hover:border-accent/40"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-ink/70 text-accent-2 transition group-hover:border-accent/40 group-hover:text-accent">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-fg">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{feature.copy}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="card p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warn" aria-hidden="true" />
                  <h3 className="font-semibold text-fg">Built for a useful first run</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  The MVP runs with no database, no background workers, and no paid
                  service required. Add a GitHub token for higher rate limits and a
                  model key only when you want AI summaries.
                </p>
              </div>
              <div className="card p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-good" aria-hidden="true" />
                  <h3 className="font-semibold text-fg">Secrets never reach the browser</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  GitHub and AI credentials are read only in server-side route handlers.
                  No secret is prefixed with <span className="mono text-fg">NEXT_PUBLIC_</span>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-line/60 bg-panel/20">
          <div className="container-page py-20 sm:py-24">
            <div className="max-w-2xl">
              <p className="eyebrow">How it works</p>
              <h2 className="section-title mt-3">Three steps, one clear report.</h2>
              <p className="section-copy">
                DevPilot keeps the pipeline small and inspectable: fetch, analyze,
                explain. No hidden agents modifying your code.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <article key={step.title} className="card relative p-6">
                  <div className="absolute top-5 right-5 text-5xl font-semibold text-white/[0.04]">
                    0{index + 1}
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent-2">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-semibold text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="limits" className="border-t border-line/60">
          <div className="container-page grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="eyebrow">Honest by design</p>
              <h2 className="section-title mt-3">What DevPilot does not claim.</h2>
              <p className="section-copy">
                Trust is more useful than hype. This tool is a fast first pass that helps
                you prioritize review, not a replacement for tests, type checking, or a
                human security review.
              </p>
              <div className="mt-8 flex items-center gap-3 rounded-xl border border-warn/20 bg-warn/5 px-4 py-3 text-sm text-muted">
                <ShieldCheck className="h-5 w-5 shrink-0 text-warn" aria-hidden="true" />
                Treat every result as a prompt to investigate, not a verdict.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {LIMITS.map((limit) => (
                <div key={limit.title} className="card-soft p-5">
                  <h3 className="text-sm font-semibold text-fg">{limit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{limit.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line/60">
          <div className="container-page py-20 sm:py-24">
            <div className="card relative overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-16">
              <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative">
                <p className="eyebrow">Ready when you are</p>
                <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  Find the first three things worth fixing.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted">
                  Start with the bundled demo, then point DevPilot at a repository you
                  actually maintain.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/dashboard" className="btn-primary">
                    Open the dashboard
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href="/dashboard?demo=1" className="btn-secondary">
                    <Terminal className="h-4 w-4" aria-hidden="true" />
                    Try the demo first
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
