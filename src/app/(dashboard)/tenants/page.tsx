"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TenantFormModal } from "@/components/tenants/TenantFormModal";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCents } from "@/lib/money";
import type { LicenseStatus, Outlet, Plan, Tenant } from "@/lib/types";

const LICENSE_TONE: Record<LicenseStatus, "blue" | "green" | "red" | "muted"> = {
  TRIAL: "blue",
  ACTIVE: "green",
  SUSPENDED: "red",
  CANCELLED: "muted",
};

export default function TenantsPage() {
  const { account } = useAuth();
  const isSuperAdmin = account?.role === "SUPER_ADMIN";

  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [tenantList, outletList, planList] = await Promise.all([
        api.listTenants(),
        // A MARKETER can't call GET /outlets at all (403) — they never need the full list since
        // their own outlet is fixed/hidden in the create form anyway.
        isSuperAdmin ? api.listOutlets() : Promise.resolve([]),
        api.listPlans(),
      ]);
      setTenants(tenantList);
      setOutlets(outletList);
      setPlans(planList);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load tenants — is the API running?");
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    // Fetch-on-mount — the react.dev-endorsed pattern; this rule is stricter than the docs here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  const filteredTenants = useMemo(() => {
    if (!tenants) return null;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tenants;
    return tenants.filter((tenant) =>
      `${tenant.name} ${tenant.slug} ${tenant.contactEmail} ${tenant.ownerName ?? ""}`.toLowerCase().includes(term),
    );
  }, [tenants, searchTerm]);

  function openCreateModal(): void {
    setEditingTenant(null);
    setFormOpen(true);
  }

  function openEditModal(tenant: Tenant): void {
    setEditingTenant(tenant);
    setFormOpen(true);
  }

  async function handleSaved(): Promise<void> {
    setFormOpen(false);
    await loadAll();
  }

  async function handleDelete(): Promise<void> {
    if (!deletingTenant) return;
    setDeleteBusy(true);
    setActionError(null);
    try {
      await api.deleteTenant(deletingTenant.id);
      setDeletingTenant(null);
      await loadAll();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete tenant");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Clients</p>
          <h1 className="mt-1 font-display text-2xl">Tenants</h1>
          <p className="mt-1 text-sm text-navy/60">
            {isSuperAdmin
              ? "Every Blue Ledger customer and their subscription, in one place."
              : `Clients onboarded by ${account?.outlet?.name ?? "your outlet"}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-blue px-4 py-2.5 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press"
        >
          <Plus className="size-4" aria-hidden="true" />
          NEW TENANT
        </button>
      </div>

      {(loadError || actionError) && (
        <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError ?? actionError}</div>
      )}

      <label className="block max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy/40" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, slug, or email"
            className="w-full border border-navy/20 bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-blue"
          />
        </div>
      </label>

      <div className="border border-navy/15 bg-white">
        {tenants === null ? (
          <div className="flex min-h-[240px] items-center justify-center text-navy/40">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
        ) : filteredTenants && filteredTenants.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-10 text-center">
            <p className="font-display text-lg">{tenants.length === 0 ? "No tenants yet" : "No matches"}</p>
            <p className="text-sm text-navy/60">
              {tenants.length === 0 ? "Create the first tenant to get started." : "Try a different search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
                  <th className="px-4 py-3">Tenant</th>
                  {isSuperAdmin && <th className="px-4 py-3">Outlet</th>}
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Next Due</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(filteredTenants ?? []).map((tenant) => (
                  <tr key={tenant.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
                    <td className="px-4 py-3">
                      <p className="font-bold">{tenant.name}</p>
                      <p className="text-xs text-navy/50">{tenant.slug}</p>
                    </td>
                    {isSuperAdmin && <td className="px-4 py-3 text-navy/60">{tenant.outlet.name}</td>}
                    <td className="px-4 py-3">
                      <p>{tenant.contactEmail}</p>
                      <p className="text-xs text-navy/50">{tenant.ownerName ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy/70">
                      {tenant.subscription ? (
                        <>
                          <p className="font-bold text-navy">{tenant.subscription.plan.name}</p>
                          <p>{formatCents(tenant.subscription.priceCents, tenant.currency)}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tenant.license && <Badge tone={LICENSE_TONE[tenant.license.status]}>{tenant.license.status}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-navy/60">
                      {tenant.subscription?.nextDueDate ? new Date(tenant.subscription.nextDueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          aria-label={`View ${tenant.name}`}
                          className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-cream-dark hover:text-navy"
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                        </Link>
                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(tenant)}
                              aria-label={`Edit ${tenant.name}`}
                              className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-cream-dark hover:text-navy"
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTenant(tenant)}
                              aria-label={`Delete ${tenant.name}`}
                              className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-red/10 hover:text-red"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TenantFormModal
        open={formOpen}
        editingTenant={editingTenant}
        outlets={outlets}
        plans={plans}
        isSuperAdmin={isSuperAdmin}
        ownOutletName={account?.outlet?.name ?? null}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deletingTenant !== null}
        title="Delete tenant?"
        message={`This removes "${deletingTenant?.name}" from the registry. This can't be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeletingTenant(null)}
      />
    </div>
  );
}
