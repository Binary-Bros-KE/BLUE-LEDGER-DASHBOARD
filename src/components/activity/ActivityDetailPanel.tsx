"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Laptop, Loader2, Smartphone, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/money";
import type { TenantActivityDetail } from "@/lib/types";
import { MiniBars, StatePill, timeAgo } from "./activity-parts";

/** One business in detail — slides in from the right: its tills, its people, 30 days of sales. */
export function ActivityDetailPanel({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TenantActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getTenantActivity(tenantId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load this business.");
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const total30 = detail?.daily30.reduce((sum, day) => sum + day.count, 0) ?? 0;
  const value30 = detail?.daily30.reduce((sum, day) => sum + day.valueCents, 0) ?? 0;
  const activeDays = detail?.daily30.filter((day) => day.count > 0).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/40" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-cream p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Activity</p>
            <h2 className="mt-1 font-display text-xl">{detail?.name ?? "Loading…"}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/tenants/${tenantId}`}
              className="inline-flex items-center gap-1 border border-navy/15 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-cream-dark"
            >
              Tenant page <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center text-navy/50 hover:bg-cream-dark hover:text-navy">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {error && <p className="mt-4 border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{error}</p>}
        {!detail && !error && (
          <div className="flex min-h-[200px] items-center justify-center text-navy/40">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
        )}

        {detail && (
          <div className="mt-5 space-y-5">
            <section className="border border-navy/15 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[11px] font-bold tracking-wide text-navy/50 uppercase">Sales, last 30 days</p>
                <p className="text-xs text-navy/60">
                  <span className="font-bold text-navy">{total30}</span> sales · {formatCents(value30)} · active {activeDays}/30 days
                </p>
              </div>
              <div className="mt-3">
                <MiniBars values={detail.daily30.map((day) => day.count)} labels={detail.daily30.map((day) => day.day)} height={64} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-navy/40">
                <span>{detail.daily30[0]?.day}</span>
                <span>Today</span>
              </div>
            </section>

            <section className="border border-navy/15 bg-white">
              <p className="border-b border-navy/10 px-4 py-3 text-[11px] font-bold tracking-wide text-navy/50 uppercase">Tills ({detail.devices.length})</p>
              {detail.devices.length === 0 ? (
                <p className="px-4 py-4 text-sm text-navy/50">No desktop has been activated yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy text-left text-[10px] font-bold tracking-wide text-cream uppercase">
                      <th className="px-4 py-2">Device</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Signed in now</th>
                      <th className="px-4 py-2">Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.devices.map((device) => (
                      <tr key={device.id} className="border-t border-navy/10">
                        <td className="px-4 py-2.5">
                          <p className="flex items-center gap-1.5 font-bold">
                            <Laptop className="size-3.5 text-navy/40" aria-hidden="true" />
                            {device.name}
                          </p>
                          <p className="text-[11px] text-navy/50">{device.status === "ACTIVE" ? "" : `${device.status.toLowerCase()} · `}since {new Date(device.registeredAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatePill state={device.state} />
                          <p className="mt-0.5 text-[11px] text-navy/50">{timeAgo(device.lastSeenAt)}</p>
                        </td>
                        <td className="px-4 py-2.5 text-navy/70">{device.currentEmployeeName ?? <span className="text-navy/30">—</span>}</td>
                        <td className="px-4 py-2.5">
                          <span className={device.outdated ? "font-bold text-red" : "text-navy/70"}>{device.appVersion ?? "unknown"}</span>
                          {device.outdated && <p className="text-[11px] text-red">update to {detail.latestDesktopVersion}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="border border-navy/15 bg-white">
              <p className="border-b border-navy/10 px-4 py-3 text-[11px] font-bold tracking-wide text-navy/50 uppercase">
                People ({detail.users.filter((user) => user.status === "active").length} active)
              </p>
              {detail.users.length === 0 ? (
                <p className="px-4 py-4 text-sm text-navy/50">No employees yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy text-left text-[10px] font-bold tracking-wide text-cream uppercase">
                      <th className="px-4 py-2">Person</th>
                      <th className="px-4 py-2">Last active</th>
                      <th className="px-4 py-2">Desktop / Phone</th>
                      <th className="px-4 py-2 text-right">Sales 30d</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.users.map((user) => (
                      <tr key={user.id} className={`border-t border-navy/10 ${user.status === "active" ? "" : "opacity-50"}`}>
                        <td className="px-4 py-2.5">
                          <p className="font-bold">{user.name}</p>
                          <p className="text-[11px] text-navy/50">
                            {user.roleName ?? "No role"} · {user.employeeCode}
                            {user.status !== "active" ? ` · ${user.status}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatePill state={user.state} />
                          <p className="mt-0.5 text-[11px] text-navy/50">{timeAgo(user.lastSeenAt)}</p>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-navy/60">
                          <p className="flex items-center gap-1">
                            <Laptop className="size-3 text-navy/40" aria-hidden="true" />
                            {timeAgo(user.lastDesktopSeenAt)}
                          </p>
                          <p className="flex items-center gap-1">
                            <Smartphone className="size-3 text-navy/40" aria-hidden="true" />
                            {timeAgo(user.lastMobileSeenAt)}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <p className="font-bold tabular-nums">{user.sales30d}</p>
                          <p className="text-[11px] text-navy/50">{user.sales30d > 0 ? formatCents(user.sales30dValueCents) : `last: ${timeAgo(user.lastSaleAt)}`}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <p className="text-[11px] text-navy/40">
              Desktop last-seen and &ldquo;signed in now&rdquo; come from desktop 2.0.3 and later; older versions still show device and sales activity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
