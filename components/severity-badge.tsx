import { clsx } from "clsx";
import type { Severity } from "@/lib/types";
import { severityLabel } from "@/lib/format";

const STYLES: Record<Severity, string> = {
  critical: "border-critical/35 bg-critical/10 text-critical",
  high: "border-high/35 bg-high/10 text-high",
  medium: "border-medium/35 bg-medium/10 text-medium",
  low: "border-low/35 bg-low/10 text-low",
  info: "border-info/35 bg-info/10 text-info",
};

const DOTS: Record<Severity, string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
  info: "bg-info",
};

export function SeverityBadge({
  severity,
  className,
  withDot = true,
}: {
  severity: Severity;
  className?: string;
  withDot?: boolean;
}) {
  return (
    <span className={clsx("badge", STYLES[severity], className)}>
      {withDot && <span className={clsx("h-1.5 w-1.5 rounded-full", DOTS[severity])} />}
      {severityLabel(severity)}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  return <span className={clsx("h-2 w-2 rounded-full", DOTS[severity])} />;
}
