/** Money is always stored/transmitted as integer cents — never a float — to avoid rounding drift. */
export function formatCents(cents: number | null, currency: string = "KES"): string {
  if (cents === null) return "—";
  return `${currency} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toCents(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function fromCents(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2);
}
