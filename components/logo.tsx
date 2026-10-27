import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="DevPilot AI home">
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-line-strong bg-panel shadow-lg shadow-accent/10">
        <span className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent-2/20 opacity-80" />
        <svg
          viewBox="0 0 32 32"
          className="relative h-5 w-5"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 10.5 15.5 16 8 21.5"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M17.5 22H24" stroke="#67e8f9" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-fg">
        DevPilot <span className="text-muted">AI</span>
      </span>
    </Link>
  );
}
