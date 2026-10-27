import type { Metadata } from "next";
import { resolveSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DevPilot AI — Repository analysis for real code",
    template: "%s · DevPilot AI",
  },
  description:
    "Analyze a GitHub repository for security and bug signals, maintainability risks, and missing tests. Deterministic results, optional AI summaries, no code stored.",
  applicationName: "DevPilot AI",
  keywords: [
    "code review",
    "static analysis",
    "GitHub repository analysis",
    "AI coding assistant",
    "developer tools",
  ],
  openGraph: {
    title: "DevPilot AI — Repository analysis for real code",
    description:
      "Paste a GitHub URL and get a prioritized, evidence-backed review. Deterministic analysis, optional AI summaries.",
    type: "website",
    url: siteUrl,
    siteName: "DevPilot AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevPilot AI",
    description:
      "Paste a GitHub URL and get a prioritized, evidence-backed review. Deterministic analysis, optional AI summaries.",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
