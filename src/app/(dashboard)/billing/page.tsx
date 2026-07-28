"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Eye, Loader2, ShieldAlert, Wallet } from "lucide-react";
import { Badge } from "@/components/Badge";
import { api, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/money";
import type { Tenant } from "@/lib/types";

type Row = {
  tenant: Tenant;
  daysOverdue: number | null;
};

function daysOverdue(nextDueDate: string | null): number | null {
  if (!nextDueDate) return null;
  const ms = Date.now() - new Date(nextDueDate).getTime();
  if (ms <= 0) return null;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/** Cross-tenant view — the per-tenant Payment History / Record Payment / paid-vs-pending calendar
 * all already live on each tenant's own detail page (see PaymentCalendar.tsx there); this page's
 * job is purely "who's overdue, at a glance, across every client," reusing the SAME already-fetched
 * Tenant rows (license + subscription embedded) rather than a new endpoint. No new SERVER surface
 * needed for this page at all. */
export default function BillingPage() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(true);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      setTenants(await api.listTenants());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load billing data — is the API running?");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  const rows: Row[] = useMemo(() => {
    if (!tenants) return [];
    return tenants
      .map((tenant) => ({ tenant, daysOverdue: daysOverdue(tenant.subscription?.nextDueDate ?? null) }))
      .sort((a, b) => (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1));
  }, [tenants]);

  const overdueCount = rows.filter((r) => r.daysOverdue !== null).length;
  const suspendedCount = rows.filter((r) => r.tenant.license?.status === "SUSPENDED").length;
  const visibleRows = showOnlyOverdue ? rows.filter((r) => r.daysOverdue !== null || r.tenant.license?.status === "SUSPENDED") : rows;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Billing</p>
          <h1 className="mt-1 font-display text-2xl">Who&apos;s overdue</h1>
          <p className="mt-1 text-sm text-navy/60">
            Every tenant, sorted by how overdue they are. Open a tenant for full payment history and
            to record a payment.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold tracking-wide text-navy/60 uppercase">
          <input
            type="checkbox"
            checked={showOnlyOverdue}
            onChange={(e) => setShowOnlyOverdue(e.target.checked)}
            className="size-4"
          />
          Overdue only
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={Wallet} label="Total Tenants" value={String(rows.length)} tone="blue" />
        <SummaryCard icon={AlertTriangle} label="Currently Overdue" value={String(overdueCount)} tone="gold" />
        <SummaryCard icon={ShieldAlert} label="Suspended" value={String(suspendedCount)} tone="red" />
      </div>

      {loadError && <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError}</div>}

      <div className="border border-navy/15 bg-white">
        {tenants === null ? (
          <div className="flex min-h-[240px] items-center justify-center text-navy/40">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-10 text-center">
            <Wallet className="size-8 text-navy/30" aria-hidden="true" />
            <p className="font-display text-lg">Nobody&apos;s overdue</p>
            <p className="text-sm text-navy/60">Every tenant is current on their subscription.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3">Next Due</th>
                  <th className="px-4 py-3">Overdue By</th>
                  <th className="px-4 py-3">Owed</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ tenant, daysOverdue: overdue }) => (
                  <tr key={tenant.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
                    <td className="px-4 py-3 font-bold">{tenant.name}</td>
                    <td className="px-4 py-3">
                      {tenant.license && (
                        <Badge tone={tenant.license.status === "ACTIVE" ? "green" : tenant.license.status === "TRIAL" ? "blue" : "red"}>
                          {tenant.license.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-navy/60">
                      {tenant.subscription ? (
                        <Badge tone={tenant.subscription.status === "ACTIVE" ? "green" : tenant.subscription.status === "PAST_DUE" ? "gold" : "muted"}>
                          {tenant.subscription.status}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-navy/60">
                      {tenant.subscription?.nextDueDate ? new Date(tenant.subscription.nextDueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {overdue !== null ? (
                        <span className="font-bold text-red">
                          {overdue} day{overdue === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-navy/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-navy/60">
                      {tenant.subscription
                        ? `${tenant.currency} ${formatCents(
                            tenant.subscription.billingCycle === "MONTHLY"
                              ? tenant.subscription.priceCents
                              : (tenant.subscription.maintenanceFeeCents ?? 0),
                          )}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          aria-label={`View ${tenant.name}`}
                          className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-cream-dark hover:text-navy"
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: "blue" | "gold" | "red";
}) {
  const toneClass = tone === "blue" ? "text-blue" : tone === "gold" ? "text-gold-text" : "text-red";
  return (
    <div className="flex items-center gap-3 border border-navy/15 bg-white p-4">
      <div className={`grid size-10 flex-none place-items-center rounded-full bg-navy/5 ${toneClass}`}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-wide text-navy/50 uppercase">{label}</p>
        <p className="font-display text-xl">{value}</p>
      </div>
    </div>
  );
}
