"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Loader2, Monitor, Pencil, Plus, ShieldCheck, ShieldOff, Store } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DeviceLimitEditModal } from "@/components/tenants/DeviceLimitEditModal";
import { DeviceRenameModal } from "@/components/tenants/DeviceRenameModal";
import { LicenseEditModal } from "@/components/tenants/LicenseEditModal";
import { PaymentCalendar } from "@/components/tenants/PaymentCalendar";
import { RecordPaymentModal } from "@/components/tenants/RecordPaymentModal";
import { ShopSection } from "@/components/tenants/ShopSection";
import { SubscriptionEditModal } from "@/components/tenants/SubscriptionEditModal";
import { SuspendLicenseModal } from "@/components/tenants/SuspendLicenseModal";
import { TenantFormModal } from "@/components/tenants/TenantFormModal";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCents } from "@/lib/money";
import type { Device, LicenseStatus, Outlet, Plan, SubscriptionPayment, Tenant } from "@/lib/types";

const LICENSE_TONE: Record<LicenseStatus, "blue" | "green" | "red" | "muted"> = {
  TRIAL: "blue",
  ACTIVE: "green",
  SUSPENDED: "red",
  CANCELLED: "muted",
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

/** Date AND time — used only for the Devices table's Registered/Last Seen columns, where knowing
 * roughly what time a device last checked in actually matters. Left as a separate function rather
 * than changing formatDate itself, since that one's shared by License/Subscription/Payment dates
 * elsewhere on this page where a bare date is enough. */
function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function InfoTile({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — nothing to recover into.
    }
  }

  return (
    <div className="border border-navy/10 bg-cream-dark px-4 py-3">
      <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p
          className={`text-sm font-bold text-navy ${mono ? "truncate font-mono text-xs" : ""}`}
          title={mono ? value : undefined}
        >
          {value}
        </p>
        {copyable && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label={`Copy ${label}`}
            title={copied ? "Copied!" : `Copy ${label}`}
            className="flex-none cursor-pointer text-navy/40 transition hover:text-navy"
          >
            {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { account } = useAuth();
  const isSuperAdmin = account?.role === "SUPER_ADMIN";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[] | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [tenantEditOpen, setTenantEditOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [reactivateBusy, setReactivateBusy] = useState(false);
  const [licenseEditOpen, setLicenseEditOpen] = useState(false);
  const [subscriptionEditOpen, setSubscriptionEditOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [deviceLimitEditOpen, setDeviceLimitEditOpen] = useState(false);
  const [renamingDevice, setRenamingDevice] = useState<Device | null>(null);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [tenantResult, paymentList, deviceList, planList, outletList] = await Promise.all([
        api.getTenant(params.id),
        api.listPayments(params.id),
        api.listDevices(params.id),
        api.listPlans(),
        // A MARKETER can't call GET /outlets at all (403) — they never need the full list since
        // reassigning a tenant's outlet is a SUPER_ADMIN-only action anyway.
        isSuperAdmin ? api.listOutlets() : Promise.resolve([]),
      ]);
      setTenant(tenantResult);
      setPayments(paymentList);
      setDevices(deviceList);
      setPlans(planList);
      setOutlets(outletList);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load tenant");
    }
  }, [params.id, isSuperAdmin]);

  useEffect(() => {
    // Fetch-on-mount — the react.dev-endorsed pattern; this rule is stricter than the docs here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  async function handleReactivate(): Promise<void> {
    setReactivateBusy(true);
    setActionError(null);
    try {
      await api.reactivateLicense(params.id);
      setReactivateConfirmOpen(false);
      await loadAll();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to reactivate license");
    } finally {
      setReactivateBusy(false);
    }
  }

  if (loadError) {
    return <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError}</div>;
  }

  if (!tenant || payments === null) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-navy/40">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  const { license, subscription } = tenant;
  const planDefaultMaxDevices = subscription?.plan.maxDevices ?? 1;
  const effectiveMaxDevices = tenant.maxDevicesOverride ?? planDefaultMaxDevices;
  const activeDeviceCount = devices.filter((device) => device.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/tenants")}
        className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-navy/60 uppercase transition hover:text-navy"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to Tenants
      </button>

      <div>
        <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">{tenant.outlet.name}</p>
        <h1 className="mt-1 font-display text-2xl">{tenant.name}</h1>
        <p className="mt-1 text-sm text-navy/60">{tenant.slug} &middot; {tenant.contactEmail}</p>
      </div>

      {actionError && <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{actionError}</div>}

      {/* Profile */}
      <section className="border border-navy/15 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg">Profile</h2>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setTenantEditOpen(true)}
              className="inline-flex items-center gap-1.5 border border-navy/20 px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              EDIT
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoTile label="Tenant ID" value={tenant.id} mono />
          <InfoTile label="Business Type" value={tenant.businessType} />
          <InfoTile label="Timezone" value={tenant.timezone} />
          <InfoTile label="Currency" value={tenant.currency} />
          <InfoTile label="Owner" value={tenant.ownerName ?? "—"} />
          <InfoTile label="Contact Phone" value={tenant.contactPhone ?? "—"} />
          <InfoTile label="Storefronts" value={String(tenant.locations.length)} />
          <InfoTile label="Last Cloud Sync" value={formatDate(tenant.lastCloudSync)} />
          <InfoTile label="Pending Sync Records" value={String(tenant.pendingSyncRecords)} />
        </div>

        <p className="mt-5 text-[11px] font-bold tracking-wide text-navy/50 uppercase">
          Extended Business Profile
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoTile label="Business Reg. No." value={tenant.businessRegistrationNumber ?? "—"} />
          <InfoTile label="KRA PIN" value={tenant.kraPin ?? "—"} mono />
          <InfoTile label="Business Email" value={tenant.email ?? "—"} />
          <InfoTile label="Alternative Phone" value={tenant.alternativePhone ?? "—"} />
          <InfoTile label="Website" value={tenant.website ?? "—"} />
          <InfoTile label="Country" value={tenant.country ?? "—"} />
          <InfoTile label="County / State" value={tenant.countyState ?? "—"} />
          <InfoTile label="City / Town" value={tenant.cityTown ?? "—"} />
          <InfoTile label="Physical Address" value={tenant.physicalAddress ?? "—"} />
          <InfoTile label="Owner Phone" value={tenant.ownerPhone ?? "—"} />
          <InfoTile label="Owner Email" value={tenant.ownerEmail ?? "—"} />
        </div>
      </section>

      {/* License */}
      {license && (
        <section className="border border-navy/15 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg">License</h2>
            {isSuperAdmin && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLicenseEditOpen(true)}
                  className="inline-flex items-center gap-1.5 border border-navy/20 px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  EDIT
                </button>
                {license.status === "SUSPENDED" ? (
                  <button
                    type="button"
                    onClick={() => setReactivateConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 border border-green/30 bg-green/10 px-3 py-2 text-xs font-bold tracking-wide text-green transition hover:bg-green/15"
                  >
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    REACTIVATE
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSuspendOpen(true)}
                    className="inline-flex items-center gap-1.5 border border-red/30 bg-red/10 px-3 py-2 text-xs font-bold tracking-wide text-red transition hover:bg-red/15"
                  >
                    <ShieldOff className="size-3.5" aria-hidden="true" />
                    SUSPEND
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="border border-navy/10 bg-cream-dark px-4 py-3">
              <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">Status</p>
              <div className="mt-1.5">
                <Badge tone={LICENSE_TONE[license.status]}>{license.status}</Badge>
              </div>
            </div>
            <InfoTile label="License Key" value={license.licenseKey} mono copyable />
            <InfoTile label="Trial Ends" value={formatDate(license.trialEndsAt)} />
            <InfoTile label="Suspension Reason" value={license.suspensionReason ?? "—"} />
          </div>
        </section>
      )}

      {/* Subscription */}
      {subscription && (
        <section className="border border-navy/15 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg">Subscription</h2>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setSubscriptionEditOpen(true)}
                className="inline-flex items-center gap-1.5 border border-navy/20 px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                EDIT
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoTile label="Plan" value={subscription.plan.name} />
            <InfoTile label="Type" value={subscription.subscriptionType} />
            <InfoTile label="Billing Cycle" value={subscription.billingCycle} />
            <div className="border border-navy/10 bg-cream-dark px-4 py-3">
              <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">Billing Status</p>
              <div className="mt-1.5">
                <Badge tone={subscription.status === "ACTIVE" ? "green" : subscription.status === "PAST_DUE" ? "gold" : "muted"}>
                  {subscription.status}
                </Badge>
              </div>
            </div>
            <InfoTile label="Price" value={formatCents(subscription.priceCents, tenant.currency)} />
            <InfoTile label="Maintenance Fee" value={formatCents(subscription.maintenanceFeeCents, tenant.currency)} />
            <InfoTile label="Subscription Start" value={formatDate(subscription.startDate)} />
            <InfoTile label="Next Due Date" value={formatDate(subscription.nextDueDate)} />
            <InfoTile label="Maintenance Expiry" value={formatDate(subscription.maintenanceExpiry)} />
            <InfoTile label="Support Expiry" value={formatDate(subscription.supportExpiry)} />
            <div className="border border-navy/10 bg-cream-dark px-4 py-3">
              <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">Support Status</p>
              <div className="mt-1.5">
                <Badge tone={subscription.supportStatus === "EXPIRED" ? "red" : "green"}>{subscription.supportStatus}</Badge>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Online Store — e-commerce onboarding: provision the storefront, connect a domain, publish
          products, go live. Self-contained (fetches its own overview). */}
      <ShopSection
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        tenantCurrency={tenant.currency}
        locations={tenant.locations}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Storefronts — real synced location data from the tenant's own desktop app, not the stale
          never-populated storefrontCount counter. Each row's own devices are cross-referenced by
          Device.storefrontId, so an admin can see at a glance which till belongs to which branch. */}
      <section className="border border-navy/15 bg-white p-5">
        <div>
          <h2 className="font-display text-lg">Storefronts</h2>
          <p className="mt-1 text-sm text-navy/60">
            Every branch, warehouse, and distribution center this tenant has registered, synced from their own
            desktop app.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto border border-navy/10">
          {tenant.locations.length === 0 ? (
            <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 p-6 text-center">
              <Store className="size-6 text-navy/30" aria-hidden="true" />
              <p className="text-sm text-navy/50">No storefronts have synced from this tenant yet.</p>
            </div>
          ) : (
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Manager</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">City / County</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Devices</th>
                </tr>
              </thead>
              <tbody>
                {tenant.locations.map((location) => {
                  const locationDevices = devices.filter((device) => device.storefrontId === location.id);
                  return (
                    <tr key={location.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
                      <td className="px-4 py-2.5">
                        <p className="font-bold">{location.locationName}</p>
                        <p className="text-xs text-navy/50">{location.locationCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-navy/60">{location.locationType}</td>
                      <td className="px-4 py-2.5 text-navy/60">{location.managerName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-navy/60">{location.phone ?? "—"}</td>
                      <td className="px-4 py-2.5 text-navy/60">
                        {[location.city, location.county].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={location.status === "active" ? "green" : "muted"}>{location.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {locationDevices.length === 0 ? (
                          <span className="text-navy/40">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {locationDevices.map((device) => (
                              <span
                                key={device.id}
                                className="border border-navy/15 bg-cream-dark px-2 py-0.5 text-xs font-semibold text-navy"
                              >
                                {device.deviceName}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {(() => {
          const locationIds = new Set(tenant.locations.map((l) => l.id));
          const unassignedCount = devices.filter((d) => !d.storefrontId || !locationIds.has(d.storefrontId)).length;
          return unassignedCount > 0 ? (
            <p className="mt-3 text-xs text-navy/50">
              {unassignedCount} device{unassignedCount === 1 ? "" : "s"} not yet tied to a specific storefront.
            </p>
          ) : null;
        })()}
      </section>

      {/* Devices */}
      <section className="border border-navy/15 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg">Devices</h2>
            <p className="mt-1 text-sm text-navy/60">
              Every install that has activated against this license &middot; {activeDeviceCount} of {effectiveMaxDevices} device
              {effectiveMaxDevices === 1 ? "" : "s"} in use
              {tenant.maxDevicesOverride !== null && <span className="text-navy/40"> (override — plan default is {planDefaultMaxDevices})</span>}.
            </p>
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setDeviceLimitEditOpen(true)}
              className="inline-flex items-center gap-1.5 border border-navy/20 px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              EDIT DEVICE LIMIT
            </button>
          )}
        </div>

        <div className="mt-5 overflow-x-auto border border-navy/10">
          {devices.length === 0 ? (
            <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 p-6 text-center">
              <Monitor className="size-6 text-navy/30" aria-hidden="true" />
              <p className="text-sm text-navy/50">No devices have activated against this license yet.</p>
            </div>
          ) : (
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
                  <th className="px-4 py-2.5">Device</th>
                  <th className="px-4 py-2.5">OS</th>
                  <th className="px-4 py-2.5">App Version</th>
                  <th className="px-4 py-2.5">Registered</th>
                  <th className="px-4 py-2.5">Last Seen</th>
                  <th className="px-4 py-2.5">Status</th>
                  {isSuperAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
                    <td className="px-4 py-2.5">
                      <p className="font-bold">{device.deviceName}</p>
                      <p className="text-xs text-navy/50">{device.deviceType}</p>
                    </td>
                    <td className="px-4 py-2.5 text-navy/60">{device.osName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-navy/60">{device.appVersion ?? "—"}</td>
                    <td className="px-4 py-2.5 text-navy/60">{formatDateTime(device.registeredAt)}</td>
                    <td className="px-4 py-2.5 text-navy/60">{formatDateTime(device.lastSeen)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={device.status === "ACTIVE" ? "green" : device.status === "REVOKED" ? "red" : "muted"}>
                        {device.status}
                      </Badge>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setRenamingDevice(device)}
                          className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-navy/60 uppercase transition hover:text-navy"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          RENAME
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Payment History */}
      <section className="border border-navy/15 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg">Payment History</h2>
            <p className="mt-1 text-sm text-navy/60">Append-only — a correction is a new row, never an edit.</p>
          </div>
          {isSuperAdmin && subscription && (
            <button
              type="button"
              onClick={() => setRecordPaymentOpen(true)}
              className="inline-flex items-center gap-1.5 bg-blue px-3 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              RECORD PAYMENT
            </button>
          )}
        </div>

        {(subscription?.billingCycle === "MONTHLY" || subscription?.billingCycle === "YEARLY") && (
          <div className="mt-5">
            <PaymentCalendar tenantId={tenant.id} onPaid={() => void loadAll()} />
          </div>
        )}

        <div className="mt-5 overflow-x-auto border border-navy/10">
          {payments.length === 0 ? (
            <p className="p-6 text-center text-sm text-navy/50">No payments recorded yet.</p>
          ) : (
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Period</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
                    <td className="px-4 py-2.5">{formatDateTime(payment.paymentDate)}</td>
                    <td className="px-4 py-2.5">{payment.billingPeriod}</td>
                    <td className="px-4 py-2.5 font-bold">{formatCents(payment.amountCents, payment.currency)}</td>
                    <td className="px-4 py-2.5">{payment.paymentMethod}</td>
                    <td className="px-4 py-2.5 text-navy/60">{payment.transactionReference ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={payment.status === "PAID" ? "green" : payment.status === "PENDING" ? "gold" : "red"}>
                        {payment.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <TenantFormModal
        open={tenantEditOpen}
        editingTenant={tenant}
        outlets={outlets}
        plans={plans}
        isSuperAdmin={isSuperAdmin}
        ownOutletName={account?.outlet?.name ?? null}
        onClose={() => setTenantEditOpen(false)}
        onSaved={() => {
          setTenantEditOpen(false);
          void loadAll();
        }}
      />

      {license && (
        <LicenseEditModal
          open={licenseEditOpen}
          tenantId={tenant.id}
          license={license}
          onClose={() => setLicenseEditOpen(false)}
          onSaved={() => {
            setLicenseEditOpen(false);
            void loadAll();
          }}
        />
      )}

      <SuspendLicenseModal
        open={suspendOpen}
        tenantId={tenant.id}
        onClose={() => setSuspendOpen(false)}
        onSuspended={() => {
          setSuspendOpen(false);
          void loadAll();
        }}
      />

      <ConfirmDialog
        open={reactivateConfirmOpen}
        title="Reactivate license?"
        message={`"${tenant.name}"'s license will be marked Active again immediately.`}
        confirmLabel="Reactivate"
        busy={reactivateBusy}
        onConfirm={handleReactivate}
        onCancel={() => setReactivateConfirmOpen(false)}
      />

      {subscription && (
        <SubscriptionEditModal
          open={subscriptionEditOpen}
          tenantId={tenant.id}
          subscription={subscription}
          plans={plans}
          onClose={() => setSubscriptionEditOpen(false)}
          onSaved={() => {
            setSubscriptionEditOpen(false);
            void loadAll();
          }}
        />
      )}

      {subscription && (
        <RecordPaymentModal
          open={recordPaymentOpen}
          tenantId={tenant.id}
          subscription={subscription}
          currency={tenant.currency}
          onClose={() => setRecordPaymentOpen(false)}
          onRecorded={() => {
            setRecordPaymentOpen(false);
            void loadAll();
          }}
        />
      )}

      <DeviceLimitEditModal
        open={deviceLimitEditOpen}
        tenantId={tenant.id}
        currentOverride={tenant.maxDevicesOverride}
        planDefault={planDefaultMaxDevices}
        onClose={() => setDeviceLimitEditOpen(false)}
        onSaved={() => {
          setDeviceLimitEditOpen(false);
          void loadAll();
        }}
      />

      {renamingDevice && (
        <DeviceRenameModal
          key={renamingDevice.id}
          open={renamingDevice !== null}
          tenantId={tenant.id}
          device={renamingDevice}
          onClose={() => setRenamingDevice(null)}
          onSaved={() => {
            setRenamingDevice(null);
            void loadAll();
          }}
        />
      )}
    </div>
  );
}
