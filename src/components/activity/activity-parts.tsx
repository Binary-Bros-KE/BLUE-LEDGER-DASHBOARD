import type { ActivityState } from "@/lib/types";

/** Label + colour for each activity bucket (SERVER lib/activity-status.ts decides the bucket). */
export const STATE_META: Record<ActivityState, { label: string; dot: string; pill: string; hint: string }> = {
  online: { label: "Online", dot: "bg-green", pill: "border-green text-green bg-green/10", hint: "A till is open right now" },
  today: { label: "Today", dot: "bg-blue", pill: "border-blue text-blue bg-blue/10", hint: "Used in the last 24 hours" },
  week: { label: "This week", dot: "bg-blue/50", pill: "border-blue/40 text-blue bg-blue/5", hint: "Used in the last 7 days" },
  idle: { label: "Idle", dot: "bg-gold", pill: "border-gold text-gold-text bg-gold/10", hint: "Last used 8–30 days ago" },
  dormant: { label: "Dormant", dot: "bg-red", pill: "border-red text-red bg-red/10", hint: "Not used for over 30 days" },
  never: { label: "Never", dot: "bg-navy/30", pill: "border-navy/25 text-navy/60 bg-navy/5", hint: "No device, phone or sale yet" },
};

export const STATE_ORDER: ActivityState[] = ["online", "today", "week", "idle", "dormant", "never"];

export function StatePill({ state }: { state: ActivityState }) {
  const meta = STATE_META[state];
  return (
    <span title={meta.hint} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${meta.pill}`}>
      <span className={`size-1.5 rounded-full ${meta.dot} ${state === "online" ? "animate-pulse" : ""}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** "just now", "12 min ago", "3 h ago", "yesterday", "5 days ago", or a date. */
export function timeAgo(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Never";
  const ms = now.getTime() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** A tiny bar chart (no chart library) — one bar per day, oldest first, today highlighted. */
export function MiniBars({ values, height = 28, labels }: { values: number[]; height?: number; labels?: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }} aria-hidden="true">
      {values.map((value, i) => (
        <div
          key={i}
          title={labels ? `${labels[i]}: ${value}` : String(value)}
          className={`w-full min-w-[3px] ${i === values.length - 1 ? "bg-blue" : value > 0 ? "bg-navy/40" : "bg-navy/10"}`}
          style={{ height: value > 0 ? `${Math.max(12, (value / max) * 100)}%` : "8%" }}
        />
      ))}
    </div>
  );
}

/** "↑ 40%" / "↓ 12%" / "new" — this week's sales against the week before. */
export function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-[11px] text-navy/40">—</span>;
  if (previous === 0) return <span className="text-[11px] font-bold text-green">new</span>;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return <span className="text-[11px] font-bold text-navy/50">±0%</span>;
  return <span className={`text-[11px] font-bold ${change > 0 ? "text-green" : "text-red"}`}>{change > 0 ? "↑" : "↓"} {Math.abs(change)}%</span>;
}
