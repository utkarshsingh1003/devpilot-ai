import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <AmbientBackground />
      <SiteHeader />
      <main className="container-page grid min-h-[60vh] place-items-center py-20">
        <div className="max-w-lg text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line bg-panel text-accent-2">
            <Search className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="eyebrow mt-6">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg">
            That page is not in the repository.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            The link may be outdated. Head back to the landing page or run a new
            repository analysis.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back home
            </Link>
            <Link href="/dashboard" className="btn-primary">
              Open dashboard
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
