import type { Metadata } from "next";
import { AmbientBackground } from "@/components/ambient-background";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAiStatus } from "@/lib/ai-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Repository dashboard",
  description:
    "Analyze a GitHub repository for security, bug, testing, and maintainability signals with file and line evidence.",
};

export default function DashboardPage() {
  const ai = getAiStatus();
  const githubTokenConfigured = Boolean(process.env.GITHUB_TOKEN?.trim());

  return (
    <div className="min-h-screen">
      <AmbientBackground />
      <SiteHeader />
      <main className="container-page py-10 sm:py-14">
        <DashboardClient
          aiEnabled={ai.enabled}
          aiProvider={ai.provider}
          aiModel={ai.model}
          aiZeroCost={ai.zeroCost}
          githubTokenConfigured={githubTokenConfigured}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
