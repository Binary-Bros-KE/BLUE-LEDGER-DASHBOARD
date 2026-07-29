"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, CreditCard, Loader2 } from "lucide-react";
import { AdminPayNowModal } from "@/components/tenants/AdminPayNowModal";
import { api, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/money";
import type { BillingPeriodEntry, PaymentScheduleResult } from "@/lib/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_STYLE: Record<BillingPeriodEntry["status"], string> = {
  paid: "text-green",
  overdue: "text-red",
  due: "text-amber-600",
  future: "text-navy/20",
};

/** Fetches the REAL computed schedule from SERVER's own computePaymentSchedule (billing-periods.ts)
 * — the exact same function DESKTOP's own port of this calendar uses, and the same one the
 * platform-billing STK flow uses to price a payment. Replaces this component's OWN previous
 * calculation, which used tenant.createdAt instead of the subscription's real startDate and had no
 * month-level start gate — a tenant who started in May would see January through April marked
 * "pending" as if they already owed for months before they were even a customer. */
export function PaymentCalendar({ tenantId, onPaid }: { tenantId: string; onPaid: () => void }) {
  const [schedule, setSchedule] = useState<PaymentScheduleResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSchedule(null);
    setLoadError(null);
    void api
      .getPaymentSchedule(tenantId)
      .then((result) => {
        if (!cancelled) setSchedule(result);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load payment schedule");
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (loadError) {
    return <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError}</div>;
  }

  if (!schedule) {
    return (
      <div className="flex min-h-[120px] items-center justify-center text-navy/40">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  const owed = schedule.periods.filter((entry) => entry.status === "overdue" || entry.status === "due");
  const totalOwedCents = schedule.pricePerPeriodCents ? schedule.pricePerPeriodCents * owed.length : 0;

  // Keyed lookup, NOT positional — schedule.periods starts at the tenant's real start month (e.g.
  // May), so entries[0] is May's entry, not January's. Indexing the grid by array position instead
  // of by actual "YYYY-MM" key silently shifted every month's status left by however many months
  // the tenant started into the year — May's own unpaid status rendered under the January column.
  const entryByKey = new Map(schedule.periods.map((entry) => [entry.key, entry]));
  const years = new Set(
    schedule.periods.map((entry) => (schedule.billingCycle === "MONTHLY" ? entry.key.slice(0, 4) : entry.key)),
  );

  return (
    <div>
      {owed.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-red/30 bg-red/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold tracking-wide text-red uppercase">
              {owed.some((e) => e.status === "overdue") ? "Overdue" : "Due Now"}
            </p>
            <p className="mt-1 text-sm font-bold text-navy">
              {owed.map((entry) => entry.label).join(", ")} — Total {schedule.currency} {formatCents(totalOwedCents)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPayOpen(true)}
            className="inline-flex items-center gap-1.5 bg-navy px-3 py-2 text-xs font-bold tracking-wide text-cream transition hover:bg-navy-deep"
          >
            <CreditCard className="size-3.5" aria-hidden="true" />
            PAY NOW
          </button>
        </div>
      )}

      {schedule.billingCycle === "MONTHLY" ? (
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
              {[...years].map((year) => (
                <tr key={year} className="border-t border-navy/10 odd:bg-white even:bg-cream-dark/40">
                  <td className="px-3 py-2 font-bold text-navy">{year}</td>
                  {MONTH_LABELS.map((_, index) => {
                    const month = index + 1;
                    const entry = entryByKey.get(`${year}-${String(month).padStart(2, "0")}`);
                    return (
                      <td key={index} className="px-2 py-2 text-center" title={entry?.label}>
                        {!entry ? (
                          <span className="text-navy/20">—</span>
                        ) : entry.status === "paid" ? (
                          <CheckCircle2 className={`inline size-4 ${STATUS_STYLE.paid}`} aria-label="Paid" />
                        ) : entry.status === "future" ? (
                          <span className="text-navy/20">—</span>
                        ) : (
                          <Clock className={`inline size-4 ${STATUS_STYLE[entry.status]}`} aria-label={entry.status} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {schedule.periods.map((entry) => (
            <span
              key={entry.key}
              className={`border px-3 py-1.5 text-xs font-bold ${
                entry.status === "paid"
                  ? "border-green/30 bg-green/10 text-green"
                  : entry.status === "future"
                    ? "border-navy/10 bg-cream-dark/40 text-navy/30"
                    : "border-red/30 bg-red/10 text-red"
              }`}
            >
              {entry.label}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] font-semibold text-navy/50">
        Green is paid, amber is due now, red is overdue, grey hasn&apos;t come due yet.
      </p>

      <AdminPayNowModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        tenantId={tenantId}
        schedule={schedule}
        onPaid={() => {
          setPayOpen(false);
          onPaid();
        }}
      />
    </div>
  );
}
