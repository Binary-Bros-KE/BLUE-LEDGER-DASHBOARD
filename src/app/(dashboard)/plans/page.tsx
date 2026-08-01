"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PlanFormModal } from "@/components/plans/PlanFormModal";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCents } from "@/lib/money";
import type { Outlet, Plan } from "@/lib/types";

export default function PlansPage() {
  const { account } = useAuth();
  const isSuperAdmin = account?.role === "SUPER_ADMIN";

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [planList, outletList] = await Promise.all([api.listPlans(), isSuperAdmin ? api.listOutlets() : Promise.resolve([])]);
      setPlans(planList);
      setOutlets(outletList);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load plans");
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    // Fetch-on-mount — the react.dev-endorsed pattern; this rule is stricter than the docs here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  function openCreateModal(): void {
    setEditingPlan(null);
    setFormOpen(true);
  }

  async function handleSaved(): Promise<void> {
    setFormOpen(false);
    await loadAll();
  }

  async function handleDelete(): Promise<void> {
    if (!deletingPlan) return;
    setDeleteBusy(true);
    setActionError(null);
    try {
      await api.deletePlan(deletingPlan.id);
      setDeletingPlan(null);
      await loadAll();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete plan");
    } finally {
      setDeleteBusy(false);
    }
  }

  function outletName(outletId: string): string {
    return outlets.find((o) => o.id === outletId)?.name ?? outletId;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Pricing</p>
          <h1 className="mt-1 font-display text-2xl">Plans</h1>
          <p className="mt-1 text-sm text-navy/60">
            {isSuperAdmin ? "Every pricing package, per outlet." : `Plans available to ${account?.outlet?.name ?? "your outlet"}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-blue px-4 py-2.5 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press"
        >
          <Plus className="size-4" aria-hidden="true" />
          NEW PLAN
        </button>
      </div>

      {(loadError || actionError) && (
        <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError ?? actionError}</div>
      )}

      <div className="border border-navy/15 bg-white">
        {plans === null ? (
          <div className="flex min-h-[240px] items-center justify-center text-navy/40">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-10 text-center">
            <Package className="size-8 text-navy/30" aria-hidden="true" />
            <p className="font-display text-lg">No plans yet</p>
            <p className="text-sm text-navy/60">Create at least one plan before onboarding a client.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
                  <th className="px-4 py-3">Plan</th>
                  {isSuperAdmin && <th className="px-4 py-3">Outlet</th>}
                  <th className="px-4 py-3">Pricing</th>
                  <th className="px-4 py-3">Limits</th>
                  <th className="px-4 py-3">Status</th>
                  {isSuperAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
                    <td className="px-4 py-3">
                      <p className="font-bold">{plan.name}</p>
                      {plan.supportLevel && <p className="text-xs text-navy/50">{plan.supportLevel} support</p>}
                    </td>
                    {isSuperAdmin && <td className="px-4 py-3 text-navy/60">{outletName(plan.outletId)}</td>}
                    <td className="px-4 py-3 text-xs text-navy/70">
                      {plan.monthlyPriceCents !== null && <p>{formatCents(plan.monthlyPriceCents)} / mo</p>}
                      {plan.purchasePriceCents !== null && <p>{formatCents(plan.purchasePriceCents)} once</p>}
                      {plan.annualMaintenanceCents !== null && <p>{formatCents(plan.annualMaintenanceCents)} / yr maintenance</p>}
                      {plan.monthlyPriceCents === null && plan.purchasePriceCents === null && "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-navy/60 tabular-nums">
                      {plan.maxBranches} branch{plan.maxBranches === 1 ? "" : "es"} &middot; {plan.maxUsers} users &middot;{" "}
                      {plan.maxDevices} devices
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={plan.status === "ACTIVE" ? "green" : "muted"}>{plan.status}</Badge>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlan(plan);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${plan.name}`}
                            className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-cream-dark hover:text-navy"
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPlan(plan)}
                            aria-label={`Delete ${plan.name}`}
                            className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-red/10 hover:text-red"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanFormModal
        open={formOpen}
        editingPlan={editingPlan}
        outlets={outlets}
        isSuperAdmin={isSuperAdmin}
        ownOutletName={account?.outlet?.name ?? null}
        defaultOutletId={isSuperAdmin ? (outlets[0]?.id ?? "") : (account?.outletId ?? "")}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      {isSuperAdmin && (
        <ConfirmDialog
          open={deletingPlan !== null}
          title="Delete plan?"
          message={`This removes "${deletingPlan?.name}". Blocked if any client is subscribed to it — set it to Inactive instead.`}
          confirmLabel="Delete"
          danger
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => setDeletingPlan(null)}
        />
      )}
    </div>
  );
}
