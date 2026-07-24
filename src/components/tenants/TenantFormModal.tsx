"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toCents } from "@/lib/money";
import type { BillingCycle, BusinessType, Currency, Outlet, Plan, SubscriptionType, Tenant } from "@/lib/types";

// Matches the desktop app's own Business Profile screen exactly (reconciled 2026-07-24).
const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: "retail_shop", label: "Retail Shop" },
  { value: "wholesale_shop", label: "Wholesale Shop" },
  { value: "retail_and_wholesale", label: "Retail & Wholesale" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "electronics", label: "Electronics" },
  { value: "hardware", label: "Hardware" },
  { value: "general_store", label: "General Store" },
  { value: "supermarket", label: "Supermarket" },
  { value: "other", label: "Other" },
];
const CURRENCY_OPTIONS: Currency[] = ["KES", "UGX", "TZS", "USD"];
// Starter list of the markets we actually operate in — add more here as new countries onboard.
const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Africa/Nairobi", label: "Kenya (Africa/Nairobi)" },
  { value: "Africa/Kampala", label: "Uganda (Africa/Kampala)" },
  { value: "Africa/Dar_es_Salaam", label: "Tanzania (Africa/Dar_es_Salaam)" },
  { value: "Africa/Addis_Ababa", label: "Ethiopia (Africa/Addis_Ababa)" },
];

type FormState = {
  name: string;
  slug: string;
  outletId: string;
  businessType: BusinessType;
  timezone: string;
  currency: Currency;
  ownerName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  // Extended business-profile fields — edit-only (see toFormState/emptyForm below); normally kept
  // current by the desktop app's own push, this is just the other way in.
  businessRegistrationNumber: string;
  kraPin: string;
  email: string;
  alternativePhone: string;
  website: string;
  country: string;
  countyState: string;
  cityTown: string;
  physicalAddress: string;
  ownerPhone: string;
  ownerEmail: string;
  // Subscription setup — create only, hence not part of toFormState/editingTenant.
  planId: string;
  subscriptionType: SubscriptionType;
  billingCycle: BillingCycle;
  price: string;
  maintenanceFee: string;
};

function emptyForm(ownOutletId: string): FormState {
  return {
    name: "",
    slug: "",
    outletId: ownOutletId,
    businessType: "other",
    timezone: "Africa/Nairobi",
    currency: "KES",
    ownerName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    businessRegistrationNumber: "",
    kraPin: "",
    email: "",
    alternativePhone: "",
    website: "",
    country: "",
    countyState: "",
    cityTown: "",
    physicalAddress: "",
    ownerPhone: "",
    ownerEmail: "",
    planId: "",
    subscriptionType: "MONTHLY",
    billingCycle: "MONTHLY",
    price: "",
    maintenanceFee: "",
  };
}

function toFormState(tenant: Tenant): FormState {
  return {
    name: tenant.name,
    slug: tenant.slug,
    outletId: tenant.outletId,
    businessType: tenant.businessType,
    timezone: tenant.timezone,
    currency: tenant.currency,
    ownerName: tenant.ownerName ?? "",
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone ?? "",
    notes: tenant.notes ?? "",
    businessRegistrationNumber: tenant.businessRegistrationNumber ?? "",
    kraPin: tenant.kraPin ?? "",
    email: tenant.email ?? "",
    alternativePhone: tenant.alternativePhone ?? "",
    website: tenant.website ?? "",
    country: tenant.country ?? "",
    countyState: tenant.countyState ?? "",
    cityTown: tenant.cityTown ?? "",
    physicalAddress: tenant.physicalAddress ?? "",
    ownerPhone: tenant.ownerPhone ?? "",
    ownerEmail: tenant.ownerEmail ?? "",
    // Not editable here — subscription lives on its own action, see the tenant detail page.
    planId: "",
    subscriptionType: "MONTHLY",
    billingCycle: "MONTHLY",
    price: "",
    maintenanceFee: "",
  };
}

/** Auto-suggests a slug from the business name — still a normal editable field, just prefilled so
 * nobody has to think up a URL-safe identifier by hand. Only applies while creating. */
function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function TenantFormModal({
  open,
  editingTenant,
  outlets,
  plans,
  isSuperAdmin,
  ownOutletName,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingTenant: Tenant | null;
  outlets: Outlet[];
  plans: Plan[];
  isSuperAdmin: boolean;
  ownOutletName: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { account } = useAuth();
  const [form, setForm] = useState<FormState>(() => emptyForm(account?.outletId ?? ""));
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    // Resets the form to match the (possibly new) editingTenant whenever the modal opens — the
    // react.dev-endorsed "resetting state when a prop changes" pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(editingTenant ? toFormState(editingTenant) : emptyForm(account?.outletId ?? ""));
    setSlugTouched(false);
    setError(null);
    setFieldErrors({});
  }, [open, editingTenant, account?.outletId]);

  // Only plans belonging to whichever outlet is currently selected — the effective outlet is
  // forced to the marketer's own on the server regardless, but the picker should still only ever
  // offer that outlet's own catalog.
  const availablePlans = useMemo(() => plans.filter((plan) => plan.outletId === form.outletId), [plans, form.outletId]);
  const selectedPlan = availablePlans.find((plan) => plan.id === form.planId) ?? null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNameChange(value: string): void {
    updateField("name", value);
    if (!editingTenant && !slugTouched) {
      updateField("slug", slugify(value));
    }
  }

  function handlePlanChange(planId: string): void {
    updateField("planId", planId);
    const plan = availablePlans.find((p) => p.id === planId);
    if (!plan) return;
    // Prefill price/maintenance from the plan's own list price — still editable, e.g. for a
    // negotiated discount.
    if (plan.monthlyPriceCents !== null) {
      updateField("subscriptionType", "MONTHLY");
      updateField("billingCycle", "MONTHLY");
      updateField("price", (plan.monthlyPriceCents / 100).toFixed(2));
    } else if (plan.purchasePriceCents !== null) {
      updateField("subscriptionType", "LIFETIME");
      updateField("billingCycle", plan.annualMaintenanceCents !== null ? "YEARLY" : "ONCE");
      updateField("price", (plan.purchasePriceCents / 100).toFixed(2));
      updateField("maintenanceFee", plan.annualMaintenanceCents !== null ? (plan.annualMaintenanceCents / 100).toFixed(2) : "");
    }
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      if (editingTenant) {
        await api.updateTenant(editingTenant.id, {
          name: form.name,
          outletId: form.outletId,
          businessType: form.businessType,
          timezone: form.timezone,
          currency: form.currency,
          ownerName: form.ownerName || null,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || null,
          notes: form.notes || null,
          businessRegistrationNumber: form.businessRegistrationNumber || null,
          kraPin: form.kraPin || null,
          email: form.email || null,
          alternativePhone: form.alternativePhone || null,
          website: form.website || null,
          country: form.country || null,
          countyState: form.countyState || null,
          cityTown: form.cityTown || null,
          physicalAddress: form.physicalAddress || null,
          ownerPhone: form.ownerPhone || null,
          ownerEmail: form.ownerEmail || null,
        });
      } else {
        await api.createTenant({
          name: form.name,
          slug: form.slug,
          outletId: form.outletId,
          businessType: form.businessType,
          timezone: form.timezone,
          currency: form.currency,
          ownerName: form.ownerName || null,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || null,
          notes: form.notes || null,
          planId: form.planId,
          subscriptionType: form.subscriptionType,
          billingCycle: form.billingCycle,
          priceCents: toCents(form.price),
          maintenanceFeeCents: form.maintenanceFee.trim() ? toCents(form.maintenanceFee) : null,
        });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError("Something went wrong. Check the API is running.");
      }
    } finally {
      setSaving(false);
    }
  }

  function fieldError(name: string): string | null {
    return fieldErrors[name]?.[0] ?? null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingTenant ? `Edit ${editingTenant.name}` : "New Tenant"}
      description={
        editingTenant
          ? "Core profile fields only — subscription and license live on the tenant's own detail page."
          : "Name, slug, contact email, and a plan are required — everything else can be filled in later."
      }
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business Name" value={form.name} onChange={handleNameChange} required error={fieldError("name")} />
          <div>
            <Field
              label="Slug"
              value={form.slug}
              onChange={(value) => {
                setSlugTouched(true);
                updateField("slug", value);
              }}
              required
              disabled={Boolean(editingTenant)}
              error={fieldError("slug")}
            />
            {editingTenant && <p className="mt-1 text-[11px] text-navy/50">Can&apos;t be changed after creation.</p>}
          </div>

          {isSuperAdmin ? (
            <Select
              label="Outlet"
              value={form.outletId}
              onChange={(v) => updateField("outletId", v)}
              options={[{ value: "", label: "Select outlet" }, ...outlets.map((o) => ({ value: o.id, label: o.name }))]}
            />
          ) : (
            <ReadOnlyField label="Outlet" value={ownOutletName ?? "No outlet assigned"} />
          )}

          <Select
            label="Business Type"
            value={form.businessType}
            onChange={(v) => updateField("businessType", v as BusinessType)}
            options={BUSINESS_TYPE_OPTIONS}
          />
          <Select
            label="Timezone"
            value={form.timezone}
            onChange={(v) => updateField("timezone", v)}
            options={TIMEZONE_OPTIONS}
          />
          <Select
            label="Currency"
            value={form.currency}
            onChange={(v) => updateField("currency", v as Currency)}
            options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))}
          />
          <Field label="Owner Name" value={form.ownerName} onChange={(v) => updateField("ownerName", v)} />
          <Field
            label="Contact Email"
            type="email"
            value={form.contactEmail}
            onChange={(v) => updateField("contactEmail", v)}
            required
            error={fieldError("contactEmail")}
          />
          <Field label="Contact Phone" value={form.contactPhone} onChange={(v) => updateField("contactPhone", v)} />
        </div>

        <div>
          <label className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={2}
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </div>

        {editingTenant && (
          <div className="space-y-4 border-t border-navy/10 pt-4">
            <p className="text-[11px] font-bold tracking-wide text-green uppercase">
              Extended Business Profile
            </p>
            <p className="text-[11px] text-navy/50">
              Normally kept current by the tenant&apos;s own desktop app — this is just the other way in.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Business Registration No."
                value={form.businessRegistrationNumber}
                onChange={(v) => updateField("businessRegistrationNumber", v)}
              />
              <Field label="KRA PIN" value={form.kraPin} onChange={(v) => updateField("kraPin", v)} />
              <Field label="Business Email" type="email" value={form.email} onChange={(v) => updateField("email", v)} />
              <Field label="Alternative Phone" value={form.alternativePhone} onChange={(v) => updateField("alternativePhone", v)} />
              <Field label="Website" value={form.website} onChange={(v) => updateField("website", v)} />
              <Field label="Country" value={form.country} onChange={(v) => updateField("country", v)} />
              <Field label="County / State" value={form.countyState} onChange={(v) => updateField("countyState", v)} />
              <Field label="City / Town" value={form.cityTown} onChange={(v) => updateField("cityTown", v)} />
              <Field
                label="Physical Address"
                value={form.physicalAddress}
                onChange={(v) => updateField("physicalAddress", v)}
              />
              <Field label="Owner Phone" value={form.ownerPhone} onChange={(v) => updateField("ownerPhone", v)} />
              <Field label="Owner Email" type="email" value={form.ownerEmail} onChange={(v) => updateField("ownerEmail", v)} />
            </div>
          </div>
        )}

        {!editingTenant && (
          <div className="space-y-4 border-t border-navy/10 pt-4">
            <p className="text-[11px] font-bold tracking-wide text-green uppercase">Subscription Setup</p>

            <Select
              label="Plan"
              value={form.planId}
              onChange={handlePlanChange}
              options={[
                { value: "", label: availablePlans.length === 0 ? "No plans for this outlet yet" : "Select plan" },
                ...availablePlans.map((plan) => ({ value: plan.id, label: plan.name })),
              ]}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Subscription Type"
                value={form.subscriptionType}
                onChange={(v) => updateField("subscriptionType", v as SubscriptionType)}
                options={[
                  { value: "MONTHLY", label: "Monthly" },
                  { value: "LIFETIME", label: "Lifetime" },
                  { value: "CUSTOM", label: "Custom" },
                ]}
              />
              <Select
                label="Billing Cycle"
                value={form.billingCycle}
                onChange={(v) => updateField("billingCycle", v as BillingCycle)}
                options={[
                  { value: "MONTHLY", label: "Monthly" },
                  { value: "YEARLY", label: "Yearly" },
                  { value: "ONCE", label: "Once" },
                ]}
              />
              <Field
                label={form.subscriptionType === "LIFETIME" ? "Purchase Price" : "Price"}
                type="number"
                value={form.price}
                onChange={(v) => updateField("price", v)}
                required
                error={fieldError("priceCents")}
              />
              {form.subscriptionType === "LIFETIME" && (
                <Field
                  label="Annual Maintenance Fee (optional)"
                  type="number"
                  value={form.maintenanceFee}
                  onChange={(v) => updateField("maintenanceFee", v)}
                />
              )}
            </div>
            {selectedPlan && (
              <p className="text-[11px] text-navy/50">
                {selectedPlan.maxBranches} branch{selectedPlan.maxBranches === 1 ? "" : "es"} &middot; {selectedPlan.maxUsers} users
                &middot; {selectedPlan.maxDevices} devices included with this plan.
              </p>
            )}
          </div>
        )}

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
            {saving ? "SAVING…" : editingTenant ? "SAVE CHANGES" : "CREATE TENANT"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-navy/50"
      />
      {error && <span className="mt-1 block text-[11px] font-semibold text-red">{error}</span>}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">{label}</span>
      <div className="mt-1.5 w-full border border-navy/20 bg-cream-dark px-3 py-2 text-sm text-navy/60">{value}</div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
