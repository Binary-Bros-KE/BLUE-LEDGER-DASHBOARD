"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { SuspensionReason } from "@/lib/types";

const REASON_OPTIONS: { value: SuspensionReason; label: string }[] = [
  { value: "PAYMENT_OVERDUE", label: "Payment overdue" },
  { value: "FRAUD", label: "Fraud" },
  { value: "MANUAL", label: "Manual hold" },
  { value: "CUSTOMER_REQUESTED", label: "Requested by customer" },
];

export function SuspendLicenseModal({
  open,
  tenantId,
  onClose,
  onSuspended,
}: {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onSuspended: () => void;
}) {
  const [reason, setReason] = useState<SuspensionReason>("PAYMENT_OVERDUE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.suspendLicense(tenantId, reason);
      onSuspended();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to suspend license");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Suspend License" widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}
        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as SuspensionReason)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            {REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
            className="bg-red px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "SUSPENDING…" : "SUSPEND LICENSE"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
