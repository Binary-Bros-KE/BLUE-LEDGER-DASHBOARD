const TONE_CLASSES = {
  gold: "border-gold text-gold-text bg-gold/10",
  green: "border-green text-green bg-green/10",
  blue: "border-blue text-blue bg-blue/10",
  red: "border-red text-red bg-red/10",
  muted: "border-navy/25 text-navy/60 bg-navy/5",
} as const;

export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: keyof typeof TONE_CLASSES }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
