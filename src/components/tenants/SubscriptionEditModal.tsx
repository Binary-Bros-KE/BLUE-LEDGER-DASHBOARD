"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { fromCents, toCents } from "@/lib/money";
import type { BillingCycle, Plan, Subscription, SubscriptionBillingStatus, SubscriptionType } from "@/lib/types";

type FormState = {
  planId: string;
  subscriptionType: SubscriptionType;
  billingCycle: BillingCycle;
  status: SubscriptionBillingStatus;
  price: string;
  maintenanceFee: string;
  nextDueDate: string;
  maintenanceExpiry: string;
  supportExpiry: string;
};

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function toFormState(subscription: Subscription): FormState {
  return {
    planId: subscription.planId,
    subscriptionType: subscription.subscriptionType,
    billingCycle: subscription.billingCycle,
    status: subscription.status,
    price: fromCents(subscription.priceCents),
    maintenanceFee: fromCents(subscription.maintenanceFeeCents),
    nextDueDate: toDateInput(subscription.nextDueDate),
    maintenanceExpiry: toDateInput(subscription.maintenanceExpiry),
    supportExpiry: toDateInput(subscription.supportExpiry),
  };
}

export function SubscriptionEditModal({
  open,
  tenantId,
  subscription,
  plans,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  subscription: Subscription;
  plans: Plan[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(subscription));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(toFormState(subscription));
    setError(null);
  }, [open, subscription]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateSubscription(tenantId, {
        planId: form.planId,
        subscriptionType: form.subscriptionType,
        billingCycle: form.billingCycle,
        status: form.status,
        priceCents: toCents(form.price),
        maintenanceFeeCents: form.maintenanceFee.trim() ? toCents(form.maintenanceFee) : null,
        nextDueDate: form.nextDueDate || null,
        maintenanceExpiry: form.maintenanceExpiry || null,
        supportExpiry: form.supportExpiry || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update subscription");
    } finally {
      setSaving(false);
    }
  }

  const plansForOutlet = plans.filter((plan) => plan.outletId === subscription.plan.outletId);

  return (
    <Modal open={open} onClose={onClose} title="Edit Subscription" widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Plan</span>
            <select
              value={form.planId}
              onChange={(e) => updateField("planId", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            >
              {plansForOutlet.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Type</span>
            <select
              value={form.subscriptionType}
              onChange={(e) => updateField("subscriptionType", e.target.value as SubscriptionType)}
              className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="LIFETIME">Lifetime</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Billing Cycle</span>
            <select
              value={form.billingCycle}
              onChange={(e) => updateField("billingCycle", e.target.value as BillingCycle)}
              className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
              <option value="ONCE">Once</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Billing Status</span>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value as SubscriptionBillingStatus)}
              className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="ACTIVE">Active</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Price</span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Maintenance Fee</span>
            <input
              type="number"
              value={form.maintenanceFee}
              onChange={(e) => updateField("maintenanceFee", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Next Due Date</span>
            <input
              type="date"
              value={form.nextDueDate}
              onChange={(e) => updateField("nextDueDate", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Maintenance Expiry</span>
            <input
              type="date"
              value={form.maintenanceExpiry}
              onChange={(e) => updateField("maintenanceExpiry", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Support Expiry</span>
            <input
              type="date"
              value={form.supportExpiry}
              onChange={(e) => updateField("supportExpiry", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
        </div>

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
