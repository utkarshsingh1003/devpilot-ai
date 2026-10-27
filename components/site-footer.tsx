import Link from "next/link";
import { GithubIcon } from "@/components/github-icon";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-ink/60">
      <div className="container-page py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-6 text-muted">
              Evidence-backed repository review for developers who want signal, not
              guesses. Deterministic analysis first, optional AI summaries second.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <p className="font-semibold text-fg">Product</p>
              <div className="mt-3 flex flex-col gap-2 text-muted">
                <Link href="/dashboard" className="hover:text-fg">
                  Dashboard
                </Link>
                <Link href="/#features" className="hover:text-fg">
                  Features
                </Link>
                <Link href="/#limits" className="hover:text-fg">
                  Limitations
                </Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-fg">Developers</p>
              <div className="mt-3 flex flex-col gap-2 text-muted">
                <a
                  href="https://github.com/utkarshsingh1003/devpilot-ai"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 hover:text-fg"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  Source code
                </a>
                <Link href="/dashboard" className="hover:text-fg">
                  Run an analysis
                </Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-fg">Trust</p>
              <div className="mt-3 flex flex-col gap-2 text-muted">
                <span>No code stored</span>
                <span>Secrets stay server-side</span>
                <span>Heuristic, not a security audit</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line/70 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} DevPilot AI. Built with Next.js.</p>
          <p>
            Results are heuristic and may contain false positives or miss issues. Always
            run your tests and review changes.
          </p>
        </div>
      </div>
    </footer>
  );
}
