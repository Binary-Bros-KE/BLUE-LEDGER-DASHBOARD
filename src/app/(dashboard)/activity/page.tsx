"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Laptop, Loader2, Moon, RefreshCw, Search, Users, Zap } from "lucide-react";
import { ActivityDetailPanel } from "@/components/activity/ActivityDetailPanel";
import { MiniBars, STATE_META, STATE_ORDER, StatePill, timeAgo, Trend } from "@/components/activity/activity-parts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCents } from "@/lib/money";
import type { ActivityOverview, ActivityState } from "@/lib/types";

/** Refreshes on its own so "online now" stays true while the page is open. */
const REFRESH_MS = 60_000;

function Tile({
  icon: Icon,
  label,
  value,
  caption,
  active,
  onClick,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  caption: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-start gap-3 border bg-white p-3 text-left transition sm:p-4 ${active ? "border-blue ring-2 ring-blue/20" : "border-navy/15"} ${onClick ? "hover:border-blue/50" : "cursor-default"}`}
    >
      <div className="hidden size-10 flex-none place-items-center bg-navy/5 text-navy sm:grid">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-wide text-navy/50 uppercase">{label}</p>
        <p className="font-display text-xl leading-tight sm:text-2xl">{value}</p>
        <p className="mt-0.5 text-[11px] text-navy/50">{caption}</p>
      </div>
    </button>
  );
}

/**
 * Who is actually using Blue Ledger — every business's activity state (online now → dormant), its
 * tills and versions, its people, and its sales over the last two weeks. Click a business for its
 * tills, people and 30-day chart. Data: SERVER activity-service.ts.
 */
export default function ActivityPage() {
  const { account } = useAuth();
  const isSuperAdmin = account?.role === "SUPER_ADMIN";
  const [data, setData] = useState<ActivityOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<ActivityState | "all" | "outdated">("all");
  const [outletFilter, setOutletFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await api.getActivity());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load activity");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount — the react.dev-endorsed pattern; this rule is stricter than the docs here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const tenants = useMemo(() => data?.tenants ?? [], [data]);
  const outlets = useMemo(
    () => [...new Map(tenants.map((t) => [t.outletId, t.outletName])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [tenants],
  );

  const stats = useMemo(() => {
    const count = (states: ActivityState[]) => tenants.filter((t) => states.includes(t.state)).length;
    return {
      devicesOnline: tenants.reduce((sum, t) => sum + t.devices.online, 0),
      devicesTotal: tenants.reduce((sum, t) => sum + t.devices.total, 0),
      activeToday: count(["online", "today"]),
      activeWeek: count(["online", "today", "week"]),
      dormant: count(["dormant", "never"]),
      usersActive: tenants.reduce((sum, t) => sum + t.users.active7d, 0),
      usersTotal: tenants.reduce((sum, t) => sum + t.users.total, 0),
      outdated: tenants.reduce((sum, t) => sum + t.devices.outdated, 0),
      salesToday: tenants.reduce((sum, t) => sum + t.sales.today, 0),
      sales7: tenants.reduce((sum, t) => sum + t.sales.last7, 0),
      sales7Value: tenants.reduce((sum, t) => sum + t.sales.last7ValueCents, 0),
    };
  }, [tenants]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenants.filter((t) => {
      if (outletFilter && t.outletId !== outletFilter) return false;
      if (stateFilter === "outdated" ? t.devices.outdated === 0 : stateFilter !== "all" && t.state !== stateFilter) return false;
      return !term || `${t.name} ${t.outletName} ${t.planName ?? ""}`.toLowerCase().includes(term);
    });
  }, [tenants, search, stateFilter, outletFilter]);

  const toggle = (state: ActivityState | "outdated") => setStateFilter((prev) => (prev === state ? "all" : state));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Usage</p>
          <h1 className="mt-1 font-display text-2xl">Activity</h1>
          <p className="mt-1 text-sm text-navy/60">
            Who is actually using Blue Ledger — tills online, people active and sales, per business.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 border border-navy/15 bg-white px-3 py-2 text-xs font-bold text-navy hover:bg-cream-dark"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {data ? `Updated ${timeAgo(data.generatedAt)}` : "Refresh"}
        </button>
      </div>

      {error && <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{error}</div>}

      {!data ? (
        <div className="flex min-h-[240px] items-center justify-center text-navy/40">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
            <Tile
              icon={Zap}
              label="Online now"
              value={`${stats.devicesOnline}`}
              caption={`of ${stats.devicesTotal} tills open right now`}
              active={stateFilter === "online"}
              onClick={() => toggle("online")}
            />
            <Tile
              icon={Activity}
              label="Active today"
              value={`${stats.activeToday}`}
              caption={`of ${tenants.length} businesses · ${stats.activeWeek} this week`}
              active={stateFilter === "today"}
              onClick={() => toggle("today")}
            />
            <Tile
              icon={Moon}
              label="Dormant"
              value={`${stats.dormant}`}
              caption="Unused for 30+ days, or never"
              active={stateFilter === "dormant"}
              onClick={() => toggle("dormant")}
            />
            <Tile
              icon={Users}
              label="People active"
              value={`${stats.usersActive}`}
              caption={`of ${stats.usersTotal} active employees, last 7 days`}
            />
            <Tile
              icon={Laptop}
              label="Sales (7 days)"
              value={stats.sales7.toLocaleString()}
              caption={`${formatCents(stats.sales7Value)} · ${stats.salesToday} today`}
            />
            <Tile
              icon={AlertTriangle}
              label="Outdated desktops"
              value={`${stats.outdated}`}
              caption={data.latestDesktopVersion ? `older than ${data.latestDesktopVersion}` : "latest version unknown"}
              active={stateFilter === "outdated"}
              onClick={() => toggle("outdated")}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="relative block w-full sm:w-auto">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy/40" aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business, outlet, plan"
                className="w-full border border-navy/20 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-blue sm:w-72"
              />
            </label>
            {isSuperAdmin && outlets.length > 1 && (
              <select
                value={outletFilter}
                onChange={(e) => setOutletFilter(e.target.value)}
                className="w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue sm:w-auto"
              >
                <option value="">All outlets</option>
                {outlets.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...STATE_ORDER] as const).map((state) => {
                const count = state === "all" ? tenants.length : tenants.filter((t) => t.state === state).length;
                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setStateFilter(state)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${stateFilter === state ? "border-navy bg-navy text-cream" : "border-navy/15 bg-white text-navy/70 hover:border-navy/40"}`}
                  >
                    {state === "all" ? "All" : STATE_META[state].label} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-navy/15 bg-white">
            {visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-navy/50">No businesses match.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1000px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-navy text-left text-[11px] font-bold tracking-wide text-cream uppercase">
                        <th className="px-4 py-3">Business</th>
                        <th className="px-4 py-3">Activity</th>
                        <th className="px-4 py-3">Tills</th>
                        <th className="px-4 py-3">People</th>
                        <th className="px-4 py-3">Sales · 14 days</th>
                        <th className="px-4 py-3 text-right">Last 7 days</th>
                        <th className="px-4 py-3">Last sale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((t) => (
                        <tr
                          key={t.tenantId}
                          onClick={() => setSelected(t.tenantId)}
                          className="cursor-pointer border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30 hover:bg-blue/5"
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold">{t.name}</p>
                            <p className="text-xs text-navy/50">
                              {t.planName ?? "No plan"}
                              {isSuperAdmin ? ` · ${t.outletName}` : ""}
                              {t.licenseStatus && t.licenseStatus !== "ACTIVE" ? ` · ${t.licenseStatus.toLowerCase()}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <StatePill state={t.state} />
                            <p className="mt-0.5 text-[11px] text-navy/50">{timeAgo(t.lastSeenAt)}</p>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <p className="font-bold">
                              {t.devices.online}/{t.devices.total} online
                            </p>
                            {t.devices.outdated > 0 ? (
                              <p className="text-red">{t.devices.outdated} outdated</p>
                            ) : (
                              <p className="text-navy/50">{t.devices.versions.map((v) => v.version).join(", ") || "no desktop"}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <p className="font-bold">
                              {t.users.active7d}/{t.users.total} active
                            </p>
                            <p className="text-navy/50">
                              {t.users.onDesktopNow > 0
                                ? `${t.users.onDesktopNow} on a till now`
                                : `${t.users.onPhone7d} on phone this week`}
                            </p>
                          </td>
                          <td className="w-40 px-4 py-3">
                            <MiniBars values={t.sales.daily14} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-bold tabular-nums">{t.sales.last7}</p>
                            <Trend current={t.sales.last7} previous={t.sales.prev7} />
                          </td>
                          <td className="px-4 py-3 text-xs text-navy/60">{timeAgo(t.sales.lastSaleAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-navy/10 md:hidden">
                  {visible.map((t) => (
                    <li key={t.tenantId}>
                      <button
                        type="button"
                        onClick={() => setSelected(t.tenantId)}
                        className="block w-full space-y-3 p-4 text-left hover:bg-blue/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold">{t.name}</p>
                            <p className="truncate text-xs text-navy/50">
                              {t.planName ?? "No plan"}
                              {isSuperAdmin ? ` · ${t.outletName}` : ""}
                              {t.licenseStatus && t.licenseStatus !== "ACTIVE" ? ` · ${t.licenseStatus.toLowerCase()}` : ""}
                            </p>
                          </div>
                          <div className="flex-none text-right">
                            <StatePill state={t.state} />
                            <p className="mt-0.5 text-[11px] text-navy/50">{timeAgo(t.lastSeenAt)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-[10px] font-bold tracking-wide text-navy/40 uppercase">Tills</p>
                            <p className="mt-0.5 font-bold">
                              {t.devices.online}/{t.devices.total} online
                            </p>
                            {t.devices.outdated > 0 && <p className="text-red">{t.devices.outdated} outdated</p>}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold tracking-wide text-navy/40 uppercase">People</p>
                            <p className="mt-0.5 font-bold">
                              {t.users.active7d}/{t.users.total} active
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold tracking-wide text-navy/40 uppercase">Sales 7d</p>
                            <p className="mt-0.5 font-bold tabular-nums">{t.sales.last7}</p>
                            <Trend current={t.sales.last7} previous={t.sales.prev7} />
                          </div>
                        </div>
                        <div>
                          <MiniBars values={t.sales.daily14} height={22} />
                          <p className="mt-1 text-[11px] text-navy/50">Last sale: {timeAgo(t.sales.lastSaleAt)}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}

      {selected && <ActivityDetailPanel tenantId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
