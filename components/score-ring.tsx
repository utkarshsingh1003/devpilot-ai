import { clsx } from "clsx";

function colorFor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  return "#fb7185";
}

export function ScoreRing({
  score,
  grade,
  size = 132,
  className,
}: {
  score: number;
  grade: string;
  size?: number;
  className?: string;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = colorFor(score);

  return (
    <div
      className={clsx("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      aria-label={`Heuristic health score ${score} out of 100, grade ${grade}`}
      role="img"
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-semibold tracking-tight text-fg">{score}</div>
          <div className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
            Grade {grade}
          </div>
        </div>
      </div>
    </div>
  );
}
