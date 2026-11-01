"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Pause, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { DropshipConnection, DropshipLink, DropshipOverview, DropshipResyncResult, Location } from "@/lib/types";

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function describeResync(result: DropshipResyncResult): string {
  const { linked, imported, skipped } = result.catalog;
  const parts = [`${linked} matched`, `${imported} imported`, `${result.adjusted} stock level${result.adjusted === 1 ? "" : "s"} updated`];
  if (skipped.length > 0) parts.push(`${skipped.length} skipped`);
  return parts.join(" · ");
}

function AddSupplierModal({
  open,
  tenantId,
  overview,
  locations,
  onClose,
  onCreated,
}: {
  open: boolean;
  tenantId: string;
  overview: DropshipOverview;
  locations: Location[];
  onClose: () => void;
  onCreated: (next: DropshipOverview, connectionId: string | null, autoImport: boolean) => void;
}) {
  const connectedIds = new Set(overview.connections.map((c) => c.supplierTenantId));
  const supplierOptions = overview.supplierOptions.filter((s) => !connectedIds.has(s.id));
  const activeLocations = locations.filter((l) => l.status === "active");

  const [supplierTenantId, setSupplierTenantId] = useState("");
  const [targetLocationId, setTargetLocationId] = useState(activeLocations[0]?.id ?? "");
  const [autoImport, setAutoImport] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const next = await api.createDropshipConnection(tenantId, { supplierTenantId, targetLocationId, autoImport });
      const created = next.connections.find((c) => c.supplierTenantId === supplierTenantId) ?? null;
      onCreated(next, created?.id ?? null, autoImport);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to connect supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Supplier Store"
      description="This store's stock will always show the supplier's live total across all of its branches and Main Store. The supplier's own stock is only ever read, never changed."
      widthClassName="max-w-md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}
        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Supplier store</span>
          <select
            required
            value={supplierTenantId}
            onChange={(e) => setSupplierTenantId(e.target.value)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            <option value="">Choose a store…</option>
            {supplierOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.slug})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Holds the supplier&apos;s stock</span>
          <select
            required
            value={targetLocationId}
            onChange={(e) => setTargetLocationId(e.target.value)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            {activeLocations.length === 0 && <option value="">No storefronts have synced yet</option>}
            {activeLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.locationName} ({l.locationType})
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-navy/50">Pick the storefront this store sells from.</span>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-navy">
          <input type="checkbox" checked={autoImport} onChange={(e) => setAutoImport(e.target.checked)} className="size-4" />
          Import the supplier&apos;s products automatically (including new ones they add later)
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
            disabled={saving || !supplierTenantId || !targetLocationId}
            className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "CONNECTING…" : "CONNECT"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LinksTable({
  tenantId,
  connection,
  isSuperAdmin,
}: {
  tenantId: string;
  connection: DropshipConnection;
  isSuperAdmin: boolean;
}) {
  const [links, setLinks] = useState<DropshipLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLinks(await api.listDropshipLinks(tenantId, connection.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load linked products");
    }
  }, [tenantId, connection.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, connection.lastMirroredAt]);

  async function unlink(link: DropshipLink): Promise<void> {
    try {
      await api.deleteDropshipLink(tenantId, connection.id, link.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to unlink product");
    }
  }

  if (error) return <p className="mt-3 text-sm font-semibold text-red">{error}</p>;
  if (!links) return <Loader2 className="mt-3 size-4 animate-spin text-navy/40" aria-hidden="true" />;
  if (links.length === 0) return <p className="mt-3 text-sm text-navy/50">No products linked yet — run a resync to match or import them.</p>;

  return (
    <div className="mt-3 max-h-[420px] overflow-auto border border-navy/10">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="sticky top-0">
          <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
            <th className="px-4 py-2.5">Product</th>
            <th className="px-4 py-2.5 text-right">Supplier stock</th>
            <th className="px-4 py-2.5 text-right">This store</th>
            <th className="px-4 py-2.5">Last change</th>
            {isSuperAdmin && <th className="px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
              <td className="px-4 py-2">
                <p className="font-bold">{link.name ?? "(product not synced yet)"}</p>
                <p className="text-xs text-navy/50">{link.sku ?? link.resellerProductId}</p>
              </td>
              <td className="px-4 py-2 text-right font-mono">{link.supplierQty ?? "—"}</td>
              <td className={`px-4 py-2 text-right font-mono ${link.supplierQty !== null && link.supplierQty !== link.resellerQty ? "text-gold-text" : ""}`}>
                {link.resellerQty}
              </td>
              <td className="px-4 py-2 text-navy/60">{formatDateTime(link.lastMirroredAt)}</td>
              {isSuperAdmin && (
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => void unlink(link)}
                    className="text-xs font-bold tracking-wide text-navy/50 uppercase transition hover:text-red"
                  >
                    UNLINK
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Dashboard Dropshipping panel: switch the tenant's dropshipping on/off and manage which supplier
 * stores' stock it reflects. Self-contained (fetches its own overview), like ShopSection. */
export function DropshipSection({
  tenantId,
  locations,
  isSuperAdmin,
  onTenantChanged,
}: {
  tenantId: string;
  locations: Location[];
  isSuperAdmin: boolean;
  onTenantChanged: () => void;
}) {
  const [overview, setOverview] = useState<DropshipOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [removing, setRemoving] = useState<DropshipConnection | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setOverview(await api.getDropshipOverview(tenantId));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load dropshipping");
    }
  }, [tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(key: string, action: () => Promise<void>, failure: string): Promise<void> {
    setActionError(null);
    setNotice(null);
    setBusy(key);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusy(null);
    }
  }

  const toggleEnabled = () =>
    run(
      "toggle",
      async () => {
        await api.updateTenant(tenantId, { dropshippingEnabled: !overview?.dropshippingEnabled });
        await load();
        onTenantChanged();
      },
      "Failed to update dropshipping",
    );

  const resync = (connectionId: string, importMissing: boolean) =>
    run(
      `resync:${connectionId}`,
      async () => {
        const result = await api.resyncDropshipConnection(tenantId, connectionId, importMissing);
        setNotice(describeResync(result));
        await load();
      },
      "Resync failed",
    );

  const setStatus = (connection: DropshipConnection, status: "active" | "paused") =>
    run(`status:${connection.id}`, async () => setOverview(await api.updateDropshipConnection(tenantId, connection.id, { status })), "Failed to update supplier");

  const setAutoImport = (connection: DropshipConnection, autoImport: boolean) =>
    run(`import:${connection.id}`, async () => setOverview(await api.updateDropshipConnection(tenantId, connection.id, { autoImport })), "Failed to update supplier");

  const confirmRemove = () =>
    run(
      "remove",
      async () => {
        if (!removing) return;
        setOverview(await api.deleteDropshipConnection(tenantId, removing.id));
        setRemoving(null);
      },
      "Failed to remove supplier",
    );

  if (loadError) {
    return <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError}</div>;
  }
  if (!overview) return null;
  // A MARKETER sees nothing for a tenant that has never used dropshipping — there's nothing to show.
  if (!isSuperAdmin && !overview.dropshippingEnabled && overview.connections.length === 0) return null;

  const locationName = (id: string) => locations.find((l) => l.id === id)?.locationName ?? null;

  return (
    <section className="border border-navy/15 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Dropshipping</h2>
          <p className="mt-1 text-sm text-navy/60">
            {overview.dropshippingEnabled
              ? "On — the products linked below always show the supplier's live stock (all branches + Main Store). Sales, customers and prices stay this store's own; the supplier's stock is never changed."
              : "Off — this store tracks its own stock like every other store. Turn it on to reflect a supplier store's live stock."}
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            {overview.dropshippingEnabled && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 bg-blue px-3 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                ADD SUPPLIER
              </button>
            )}
            <button
              type="button"
              onClick={() => void toggleEnabled()}
              disabled={busy === "toggle"}
              className="inline-flex items-center gap-1.5 border border-navy/20 px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "toggle" ? "SAVING…" : overview.dropshippingEnabled ? "DISABLE DROPSHIPPING" : "ENABLE DROPSHIPPING"}
            </button>
          </div>
        )}
      </div>

      {actionError && <div className="mt-4 border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{actionError}</div>}
      {notice && <div className="mt-4 border border-green/30 bg-green/10 px-4 py-2.5 text-sm font-semibold text-green">{notice}</div>}

      {overview.connections.length > 0 && (
        <div className="mt-5 space-y-3">
          {overview.connections.map((connection) => (
            <div key={connection.id} className="border border-navy/10 bg-cream-dark/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link2 className="size-4 flex-none text-navy/40" aria-hidden="true" />
                    <p className="font-bold text-navy">{connection.supplierName}</p>
                    <Badge tone={!overview.dropshippingEnabled ? "muted" : connection.status === "active" ? "green" : "gold"}>
                      {!overview.dropshippingEnabled ? "OFF" : connection.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-navy/60">
                    {connection.linkCount} linked product{connection.linkCount === 1 ? "" : "s"} · stock held at{" "}
                    {connection.targetLocationName ?? locationName(connection.targetLocationId) ?? "an unknown location"} · last checked{" "}
                    {formatDateTime(connection.lastMirroredAt)}
                  </p>
                  {connection.lastError && <p className="mt-1 text-xs font-semibold text-red">Last error: {connection.lastError}</p>}
                  {isSuperAdmin && (
                    <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-navy/70">
                      <input
                        type="checkbox"
                        className="size-3.5"
                        checked={connection.autoImport}
                        disabled={busy === `import:${connection.id}`}
                        onChange={(e) => void setAutoImport(connection, e.target.checked)}
                      />
                      Auto-import new supplier products
                    </label>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === connection.id ? null : connection.id)}
                    className="border border-navy/20 bg-white px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
                  >
                    {expanded === connection.id ? "HIDE PRODUCTS" : "VIEW PRODUCTS"}
                  </button>
                  {isSuperAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => void resync(connection.id, true)}
                        disabled={busy !== null}
                        title="Match and import the supplier's products, then update stock now"
                        className="inline-flex items-center gap-1.5 border border-navy/20 bg-white px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCw className={`size-3.5 ${busy === `resync:${connection.id}` ? "animate-spin" : ""}`} aria-hidden="true" />
                        RESYNC NOW
                      </button>
                      <button
                        type="button"
                        onClick={() => void setStatus(connection, connection.status === "active" ? "paused" : "active")}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 border border-navy/20 bg-white px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {connection.status === "active" ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
                        {connection.status === "active" ? "PAUSE" : "RESUME"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoving(connection)}
                        disabled={busy !== null}
                        aria-label={`Remove ${connection.supplierName}`}
                        className="inline-flex items-center border border-red/30 bg-red/10 px-3 py-2 text-red transition hover:bg-red/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {expanded === connection.id && <LinksTable tenantId={tenantId} connection={connection} isSuperAdmin={isSuperAdmin} />}
            </div>
          ))}
        </div>
      )}

      {overview.dropshippingEnabled && overview.connections.length === 0 && (
        <p className="mt-5 text-sm text-navy/50">No supplier connected yet — add one to start reflecting its stock.</p>
      )}

      {addOpen && (
        <AddSupplierModal
          open={addOpen}
          tenantId={tenantId}
          overview={overview}
          locations={locations}
          onClose={() => setAddOpen(false)}
          onCreated={(next, connectionId, autoImport) => {
            setAddOpen(false);
            setOverview(next);
            // Match existing products right away (and import the rest when auto-import is on —
            // the background worker would otherwise do it within a few seconds anyway).
            if (connectionId) void resync(connectionId, autoImport);
          }}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Remove supplier?"
        message={`This store stops following ${removing?.supplierName ?? "this supplier"}'s stock. Its products and their current quantities stay as they are.`}
        confirmLabel="Remove"
        danger
        busy={busy === "remove"}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
