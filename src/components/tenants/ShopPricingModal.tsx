"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { ShopOverview, WebStore } from "@/lib/types";

export const ROUND_TO_OPTIONS = [1, 5, 10, 50, 100] as const;

export type WebPricing = { markupPercent: number; roundTo: number };

/** Defensive read of web_stores.pricingJson — mirrors SERVER lib/web-pricing.ts ({} = no markup). */
export function readPricing(json: unknown): WebPricing {
  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const markupPercent = typeof o.markupPercent === "number" && o.markupPercent >= 0 ? o.markupPercent : 0;
  const roundTo = typeof o.roundTo === "number" && (ROUND_TO_OPTIONS as readonly number[]).includes(o.roundTo) ? o.roundTo : 1;
  return { markupPercent, roundTo };
}

/** Same formula as the server — used for the live example only. */
export function markUp(amount: number, p: WebPricing): number {
  if (!p.markupPercent) return amount;
  return Math.round((amount * (1 + p.markupPercent / 100)) / p.roundTo) * p.roundTo;
}

export function ShopPricingModal({
  open,
  tenantId,
  store,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  store: WebStore;
  onClose: () => void;
  onSaved: (result?: ShopOverview) => void;
}) {
  const current = readPricing(store.pricingJson);
  const [percent, setPercent] = useState(String(current.markupPercent));
  const [roundTo, setRoundTo] = useState(current.roundTo === 1 && !current.markupPercent ? 10 : current.roundTo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const p = readPricing(store.pricingJson);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPercent(String(p.markupPercent));
    setRoundTo(p.roundTo === 1 && !p.markupPercent ? 10 : p.roundTo);
    setError(null);
  }, [open, store]);

  const value = Number(percent);
  const valid = percent.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= 500;
  const preview: WebPricing = { markupPercent: valid ? value : 0, roundTo };

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.updateShop(tenantId, { pricing: { markupPercent: value, roundTo } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save website pricing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Website pricing" widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

        <p className="text-sm text-navy/70">
          Website prices are the POS selling price plus this markup, rounded. A product with its own website price (set in
          the POS Online Store tab) keeps that price exactly. Applies to variants, bulk prices and online orders. Set 0 to
          turn it off.
        </p>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Markup</span>
          <div className="mt-1.5 flex items-center border border-navy/20 bg-white focus-within:border-blue">
            <input
              value={percent}
              onChange={(e) => setPercent(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
            />
            <span className="flex-none border-l border-navy/15 bg-cream-dark px-3 py-2 font-mono text-xs text-navy/50">%</span>
          </div>
          {!valid && <span className="mt-1 block text-xs font-semibold text-red">Enter a percentage from 0 to 500</span>}
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Round to the nearest</span>
          <select
            value={roundTo}
            onChange={(e) => setRoundTo(Number(e.target.value))}
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            {ROUND_TO_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 (no rounding)" : n}
              </option>
            ))}
          </select>
        </label>

        <div className="border border-navy/10 bg-cream-dark px-4 py-3 text-sm text-navy">
          <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">Example</p>
          {[1437, 1600, 17000].map((n) => (
            <p key={n} className="mt-1 font-mono text-xs">
              {store.currency} {n.toLocaleString()} → {store.currency} {markUp(n, preview).toLocaleString()}
            </p>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="border border-navy/20 px-4 py-2 text-xs font-bold tracking-wide text-navy hover:bg-cream-dark">
            CANCEL
          </button>
          <button
            type="submit"
            disabled={saving || !valid}
            className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "SAVING…" : "SAVE PRICING"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
