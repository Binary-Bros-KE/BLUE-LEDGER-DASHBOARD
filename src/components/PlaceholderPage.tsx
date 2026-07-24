export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Coming soon</p>
      <h1 className="font-display text-2xl">{title}</h1>
      <p className="max-w-lg text-sm text-navy/60">{description}</p>
      <div className="mt-8 flex min-h-[200px] items-center justify-center border border-dashed border-navy/20 bg-white text-sm text-navy/40">
        Not built yet
      </div>
    </div>
  );
}
