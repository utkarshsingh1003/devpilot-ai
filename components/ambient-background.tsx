export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-ink" />
      <div className="bg-grid mask-fade absolute inset-0 opacity-60" />
      <div className="absolute -top-40 left-1/2 h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />
      <div className="absolute top-[30rem] -right-40 h-[28rem] w-[28rem] rounded-full bg-accent-2/10 blur-[120px]" />
      <div className="absolute bottom-0 -left-40 h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-[120px]" />
    </div>
  );
}
