import { CheckCircle2, Clock } from "lucide-react";
import type { SubscriptionPayment } from "@/lib/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type CellStatus = "paid" | "pending" | "future";

function cellStatus(year: number, month: number, currentYear: number, currentMonth: number, paidPeriods: Set<string>): CellStatus {
  if (year > currentYear || (year === currentYear && month > currentMonth)) return "future";
  const key = `${year}-${String(month).padStart(2, "0")}`;
  return paidPeriods.has(key) ? "paid" : "pending";
}

/** Only meaningful for a MONTHLY billing cycle — "Jan ✅ Feb ✅ Mar ❌" the way the client
 * originally asked for it. Mirrors the desktop app's own salary-payment matrix pattern (same
 * problem: did a recurring obligation get paid for a given period, month by month, year by year). */
export function PaymentCalendar({ payments, startYear }: { payments: SubscriptionPayment[]; startYear: number }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const paidPeriods = new Set(payments.filter((p) => p.status === "PAID").map((p) => p.billingPeriod));

  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="bg-navy text-cream">
            <th className="w-16 px-3 py-2 text-left text-[10px] font-extrabold tracking-wide uppercase">Year</th>
            {MONTH_LABELS.map((label) => (
              <th key={label} className="px-2 py-2 text-center text-[10px] font-extrabold tracking-wide uppercase">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year} className="border-t border-navy/10 odd:bg-white even:bg-cream-dark/40">
              <td className="px-3 py-2 font-bold text-navy">{year}</td>
              {MONTH_LABELS.map((_, index) => {
                const month = index + 1;
                const status = cellStatus(year, month, currentYear, currentMonth, paidPeriods);
                return (
                  <td key={month} className="px-2 py-2 text-center">
                    {status === "paid" && <CheckCircle2 className="inline size-4 text-green" aria-label="Paid" />}
                    {status === "pending" && <Clock className="inline size-4 text-navy/30" aria-label="Pending" />}
                    {status === "future" && <span className="text-navy/20">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
