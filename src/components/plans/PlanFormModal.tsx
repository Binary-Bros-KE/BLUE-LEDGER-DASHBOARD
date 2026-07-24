"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { fromCents, toCents } from "@/lib/money";
import type { Outlet, Plan } from "@/lib/types";

type FeatureKey =
  | "featureInventory"
  | "featureSales"
  | "featureQuotations"
  | "featurePurchaseOrders"
  | "featureExpenses"
  | "featurePayroll"
  | "featureCrm"
  | "featureMultiStore"
  | "featureCloudSync";

const FEATURE_LABELS: Record<FeatureKey, string> = {
  featureInventory: "Inventory",
  featureSales: "Sales",
  featureQuotations: "Quotations",
  featurePurchaseOrders: "Purchase Orders",
  featureExpenses: "Expenses",
  featurePayroll: "Payroll",
  featureCrm: "CRM",
  featureMultiStore: "Multi Store",
  featureCloudSync: "Cloud Sync",
};

type FormState = {
  outletId: string;
  name: string;
  monthlyPrice: string;
  purchasePrice: string;
  annualMaintenance: string;
  maxBranches: string;
  maxUsers: string;
  maxDevices: string;
  supportLevel: string;
  description: string;
} & Record<FeatureKey, boolean>;

function emptyForm(ownOutletId: string): FormState {
  return {
    outletId: ownOutletId,
    name: "",
    monthlyPrice: "",
    purchasePrice: "",
    annualMaintenance: "",
    maxBranches: "1",
    maxUsers: "3",
    maxDevices: "1",
    supportLevel: "",
    description: "",
    featureInventory: true,
    featureSales: true,
    featureQuotations: false,
    featurePurchaseOrders: false,
    featureExpenses: false,
    featurePayroll: false,
    featureCrm: false,
    featureMultiStore: false,
    featureCloudSync: false,
  };
}

function toFormState(plan: Plan): FormState {
  return {
    outletId: plan.outletId,
    name: plan.name,
    monthlyPrice: fromCents(plan.monthlyPriceCents),
    purchasePrice: fromCents(plan.purchasePriceCents),
    annualMaintenance: fromCents(plan.annualMaintenanceCents),
    maxBranches: String(plan.maxBranches),
    maxUsers: String(plan.maxUsers),
    maxDevices: String(plan.maxDevices),
    supportLevel: plan.supportLevel ?? "",
    description: plan.description ?? "",
    featureInventory: plan.featureInventory,
    featureSales: plan.featureSales,
    featureQuotations: plan.featureQuotations,
    featurePurchaseOrders: plan.featurePurchaseOrders,
    featureExpenses: plan.featureExpenses,
    featurePayroll: plan.featurePayroll,
    featureCrm: plan.featureCrm,
    featureMultiStore: plan.featureMultiStore,
    featureCloudSync: plan.featureCloudSync,
  };
}

export function PlanFormModal({
  open,
  editingPlan,
  outlets,
  defaultOutletId,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingPlan: Plan | null;
  outlets: Outlet[];
  defaultOutletId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultOutletId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Resets the form to match the (possibly new) editingPlan whenever the modal opens — the
    // react.dev-endorsed "resetting state when a prop changes" pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(editingPlan ? toFormState(editingPlan) : emptyForm(defaultOutletId));
    setError(null);
  }, [open, editingPlan, defaultOutletId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const shared = {
        name: form.name,
        monthlyPriceCents: form.monthlyPrice.trim() ? toCents(form.monthlyPrice) : null,
        purchasePriceCents: form.purchasePrice.trim() ? toCents(form.purchasePrice) : null,
        annualMaintenanceCents: form.annualMaintenance.trim() ? toCents(form.annualMaintenance) : null,
        maxBranches: Number(form.maxBranches),
        maxUsers: Number(form.maxUsers),
        maxDevices: Number(form.maxDevices),
        supportLevel: form.supportLevel || null,
        description: form.description || null,
        featureInventory: form.featureInventory,
        featureSales: form.featureSales,
        featureQuotations: form.featureQuotations,
        featurePurchaseOrders: form.featurePurchaseOrders,
        featureExpenses: form.featureExpenses,
        featurePayroll: form.featurePayroll,
        featureCrm: form.featureCrm,
        featureMultiStore: form.featureMultiStore,
        featureCloudSync: form.featureCloudSync,
      };
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, shared);
      } else {
        await api.createPlan({ outletId: form.outletId, ...shared });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingPlan ? `Edit ${editingPlan.name}` : "New Plan"}
      description="Carries every pricing angle (monthly / one-time + maintenance) — a Subscription picks whichever the client actually agreed to."
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Outlet</span>
            <select
              value={form.outletId}
              onChange={(e) => updateField("outletId", e.target.value)}
              disabled={Boolean(editingPlan)}
              required
              className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-navy/50"
            >
              <option value="">Select outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Monthly Price</span>
            <input
              type="number"
              value={form.monthlyPrice}
              onChange={(e) => updateField("monthlyPrice", e.target.value)}
              placeholder="0.00"
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">One-Time Purchase Price</span>
            <input
              type="number"
              value={form.purchasePrice}
              onChange={(e) => updateField("purchasePrice", e.target.value)}
              placeholder="0.00"
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Annual Maintenance Fee</span>
            <input
              type="number"
              value={form.annualMaintenance}
              onChange={(e) => updateField("annualMaintenance", e.target.value)}
              placeholder="0.00"
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Support Level</span>
            <input
              type="text"
              value={form.supportLevel}
              onChange={(e) => updateField("supportLevel", e.target.value)}
              placeholder="e.g. Standard, Priority"
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Max Branches</span>
            <input
              type="number"
              value={form.maxBranches}
              onChange={(e) => updateField("maxBranches", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Max Users</span>
            <input
              type="number"
              value={form.maxUsers}
              onChange={(e) => updateField("maxUsers", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Max Devices</span>
            <input
              type="number"
              value={form.maxDevices}
              onChange={(e) => updateField("maxDevices", e.target.value)}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={2}
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <div>
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Features Included</span>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input type="checkbox" checked={form[key]} onChange={(e) => updateField(key, e.target.checked)} className="size-4" />
                {FEATURE_LABELS[key]}
              </label>
            ))}
          </div>
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
            {saving ? "SAVING…" : editingPlan ? "SAVE CHANGES" : "CREATE PLAN"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
