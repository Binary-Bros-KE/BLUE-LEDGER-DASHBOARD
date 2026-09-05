"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Location } from "@/lib/types";

const CURRENCIES = ["KES", "KSH", "UGX", "TZS", "USD"];

export function ShopSetupModal({
  open,
  tenantId,
  defaultSubdomain,
  defaultCurrency,
  storefrontBaseDomain,
  storefrontPublicHost,
  locations,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  defaultSubdomain: string;
  defaultCurrency: string;
  storefrontBaseDomain: string;
  storefrontPublicHost: string | null;
  locations: Location[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subdomain, setSubdomain] = useState(defaultSubdomain);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [fulfilmentLocationId, setFulfilmentLocationId] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubdomain(defaultSubdomain);
    setCurrency(defaultCurrency);
    setFulfilmentLocationId(locations.find((l) => l.canSellStock)?.id ?? locations[0]?.id ?? "");
    setCustomDomain("");
    setError(null);
  }, [open, defaultSubdomain, defaultCurrency, locations]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.provisionShop(tenantId, {
        subdomain: subdomain.trim().toLowerCase(),
        currency: currency.trim().toUpperCase(),
        fulfilmentLocationId: fulfilmentLocationId || null,
        ...(customDomain.trim() ? { customDomain: customDomain.trim().toLowerCase() } : {}),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to set up the online store");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set up online store"
      description="Turns on the e-commerce add-on for this tenant and creates their store (starts as a draft)."
      widthClassName="max-w-md"
    >
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
              placeholder="trylist"
              className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
            />
            <span className="flex-none border-l border-navy/15 bg-cream-dark px-3 py-2 font-mono text-xs text-navy/50">
              .{storefrontBaseDomain}
            </span>
          </div>
          <span className="mt-1 block text-xs text-navy/50">
            The preview URL. Lowercase letters, digits and hyphens.
          </span>
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
          <span className="mt-1 block text-xs text-navy/50">Prices show as e.g. &ldquo;{currency} 4,500&rdquo;.</span>
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
          <span className="mt-1 block text-xs text-navy/50">
            Online orders draw stock and prices from this branch.
            {locations.length === 0 && " No branches have synced from this tenant's POS yet."}
          </span>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">
            Custom domain <span className="font-normal normal-case text-navy/40">(optional — add later too)</span>
          </span>
          <input
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
            placeholder="shop.trylistsolutions.co.ke"
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
          {customDomain.trim() && (
            <span className="mt-1 block text-xs text-navy/50">
              After saving, point a CNAME record for this domain at{" "}
              <span className="font-mono text-navy/70">{storefrontPublicHost ?? "your storefront host"}</span>, then
              verify it.
            </span>
          )}
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
            {saving ? "SETTING UP…" : "CREATE STORE"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
