"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { toCents } from "@/lib/money";
import type { Currency, PaymentStatus, Subscription } from "@/lib/types";

// No Cash option — this business doesn't accept cash for subscription billing, every method here
// always produces some kind of transaction/reference code (see the now-required Reference field).
const PAYMENT_METHOD_OPTIONS = ["M-Pesa", "Bank Transfer", "Card", "Cheque", "PayPal", "Other"];

// Billing periods only ever run forward from when this billing feature shipped — no need to offer
// years before that. Extend the +10 window later if needed, same idea as the timezone list.
const BILLING_START_YEAR = 2026;
const BILLING_YEARS = Array.from({ length: 11 }, (_, i) => BILLING_START_YEAR + i);
const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Splits/joins the "YYYY-MM" or "YYYY" billingPeriod string the API expects into the separate
 * month/year selects the form actually shows. */
function defaultMonth(): string {
  return String(new Date().getMonth() + 1).padStart(2, "0");
}
function defaultYear(): number {
  return new Date().getFullYear();
}

export function RecordPaymentModal({
  open,
  tenantId,
  subscription,
  currency,
  onClose,
  onRecorded,
}: {
  open: boolean;
  tenantId: string;
  subscription: Subscription;
  currency: Currency;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState(() => (subscription.priceCents / 100).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD_OPTIONS[0]);
  const [reference, setReference] = useState("");
  const [billingMonth, setBillingMonth] = useState(defaultMonth);
  const [billingYear, setBillingYear] = useState(defaultYear);
  const [paymentDate, setPaymentDate] = useState(() => todayIso());
  const [status, setStatus] = useState<PaymentStatus>("PAID");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monthly payers pick a specific month+year ("2026-07"); yearly payers only ever pick a year
  // ("2026"); a one-time (ONCE) subscription has no recurring period to pick at all.
  const billingPeriod =
    subscription.billingCycle === "MONTHLY"
      ? `${billingYear}-${billingMonth}`
      : subscription.billingCycle === "YEARLY"
        ? String(billingYear)
        : "one-time";

  function nextDueDateAfter(): string | null {
    if (status !== "PAID") return null;
    const date = new Date(paymentDate);
    if (subscription.billingCycle === "MONTHLY") {
      date.setMonth(date.getMonth() + 1);
      return date.toISOString().slice(0, 10);
    }
    if (subscription.billingCycle === "YEARLY") {
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().slice(0, 10);
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.recordPayment(tenantId, {
        amountCents: toCents(amount),
        currency,
        paymentMethod,
        transactionReference: reference,
        billingPeriod,
        paymentDate,
        nextDueDateAfter: nextDueDateAfter(),
        status,
      });
      onRecorded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Amount ({currency})</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Payment Method</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Reference / Transaction Code</span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
            placeholder="e.g. M-Pesa code, bank transaction ID"
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        {subscription.billingCycle === "ONCE" ? (
          <div>
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Billing Period</span>
            <div className="mt-1.5 w-full border border-navy/20 bg-cream-dark px-3 py-2 text-sm text-navy/60">
              One-time — no recurring period
            </div>
          </div>
        ) : (
          <div className={subscription.billingCycle === "MONTHLY" ? "grid grid-cols-2 gap-3" : ""}>
            {subscription.billingCycle === "MONTHLY" && (
              <label className="block">
                <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Month</span>
                <select
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Year</span>
              <select
                value={billingYear}
                onChange={(e) => setBillingYear(Number(e.target.value))}
                className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
              >
                {BILLING_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Payment Date</span>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>

        <div className="flex justify-end gap-3 border-t border-navy/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-navy/20 px-4 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "SAVING…" : "RECORD PAYMENT"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
