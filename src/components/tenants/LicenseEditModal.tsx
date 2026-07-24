"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { License, LicenseStatus, SuspensionReason } from "@/lib/types";

const REASON_OPTIONS: { value: SuspensionReason; label: string }[] = [
  { value: "PAYMENT_OVERDUE", label: "Payment overdue" },
  { value: "FRAUD", label: "Fraud" },
  { value: "MANUAL", label: "Manual hold" },
  { value: "CUSTOMER_REQUESTED", label: "Requested by customer" },
];

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function LicenseEditModal({
  open,
  tenantId,
  license,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  license: License;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<LicenseStatus>(license.status);
  const [suspensionReason, setSuspensionReason] = useState<SuspensionReason>(license.suspensionReason ?? "MANUAL");
  const [trialEndsAt, setTrialEndsAt] = useState(() => toDateInput(license.trialEndsAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(license.status);
    setSuspensionReason(license.suspensionReason ?? "MANUAL");
    setTrialEndsAt(toDateInput(license.trialEndsAt));
    setError(null);
  }, [open, license]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateLicense(tenantId, {
        status,
        suspensionReason: status === "SUSPENDED" ? suspensionReason : null,
        trialEndsAt: trialEndsAt || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update license");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit License"
      description="Sets the status directly — e.g. moving Trial straight to Active without going through Suspend/Reactivate."
      widthClassName="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LicenseStatus)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>

        {status === "SUSPENDED" && (
          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Suspension Reason</span>
            <select
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value as SuspensionReason)}
              className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            >
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Trial Ends</span>
          <input
            type="date"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
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
            {saving ? "SAVING…" : "SAVE CHANGES"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
