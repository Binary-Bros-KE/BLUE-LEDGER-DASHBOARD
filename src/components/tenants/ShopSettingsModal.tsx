"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Location, WebStore, WebStoreStatus } from "@/lib/types";

const CURRENCIES = ["KES", "KSH", "UGX", "TZS", "USD"];

export function ShopSettingsModal({
  open,
  tenantId,
  store,
  storefrontBaseDomain,
  locations,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  store: WebStore;
  storefrontBaseDomain: string;
  locations: Location[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subdomain, setSubdomain] = useState(store.subdomain);
  const [currency, setCurrency] = useState(store.currency);
  const [fulfilmentLocationId, setFulfilmentLocationId] = useState(store.fulfilmentLocationId ?? "");
  const [status, setStatus] = useState<WebStoreStatus>(store.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubdomain(store.subdomain);
    setCurrency(store.currency);
    setFulfilmentLocationId(store.fulfilmentLocationId ?? "");
    setStatus(store.status);
    setError(null);
  }, [open, store]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateShop(tenantId, {
        subdomain: subdomain.trim().toLowerCase(),
        currency: currency.trim().toUpperCase(),
        fulfilmentLocationId: fulfilmentLocationId || null,
        status,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save store settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Store settings" widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>
        )}

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Store address</span>
          <div className="mt-1.5 flex items-center border border-navy/20 bg-white focus-within:border-blue">
            <input
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
            />
            <span className="flex-none border-l border-navy/15 bg-cream-dark px-3 py-2 font-mono text-xs text-navy/50">
              .{storefrontBaseDomain}
            </span>
          </div>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            {[...new Set([currency, ...CURRENCIES])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Fulfilment storefront</span>
          <select
            value={fulfilmentLocationId}
            onChange={(e) => setFulfilmentLocationId(e.target.value)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            <option value="">— not set (stock shows as made-to-order) —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.locationName} ({l.locationType}){l.canSellStock ? "" : " — cannot sell stock"}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as WebStoreStatus)}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            <option value="DRAFT">Draft — not served publicly</option>
            <option value="LIVE">Live — served publicly</option>
            <option value="SUSPENDED">Suspended — taken offline</option>
          </select>
          <span className="mt-1 block text-xs text-navy/50">
            Live still requires the add-on on and the license usable — checked on every request.
          </span>
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
            disabled={saving || !subdomain.trim()}
            className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "SAVING…" : "SAVE CHANGES"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
