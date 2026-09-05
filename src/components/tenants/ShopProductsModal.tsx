"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/money";
import type { PublishableProduct } from "@/lib/types";

export function ShopProductsModal({
  open,
  tenantId,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [products, setProducts] = useState<PublishableProduct[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await api.listShopProducts(tenantId);
      setProducts(rows);
      const live = new Set(rows.filter((p) => p.publishedOnline).map((p) => p.id));
      setSelected(new Set(live));
      setInitial(new Set(live));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load products");
    }
  }, [tenantId]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProducts(null);
    setSearch("");
    setSaveError(null);
    void load();
  }, [open, load]);

  const visible = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.categoryName ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const dirty = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const id of selected) if (!initial.has(id)) return true;
    return false;
  }, [selected, initial]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setVisible(publish: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of visible) {
        if (publish) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  async function save(): Promise<void> {
    setSaving(true);
    setSaveError(null);
    try {
      const toPublish = [...selected].filter((id) => !initial.has(id));
      const toUnpublish = [...initial].filter((id) => !selected.has(id));
      if (toUnpublish.length) await api.publishShopProducts(tenantId, { productIds: toUnpublish, published: false });
      if (toPublish.length) await api.publishShopProducts(tenantId, { productIds: toPublish, published: true });
      onSaved();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish products"
      description="Tick the products that should appear in the online catalogue."
      widthClassName="max-w-2xl"
    >
      <div className="space-y-3">
        {loadError && (
          <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{loadError}</div>
        )}
        {saveError && (
          <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{saveError}</div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[180px] flex-1 items-center border border-navy/20 bg-white px-2 focus-within:border-blue">
            <Search className="size-3.5 flex-none text-navy/30" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, category…"
              className="min-w-0 flex-1 px-2 py-1.5 text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setVisible(true)}
            className="border border-navy/20 px-3 py-1.5 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
          >
            PUBLISH {search.trim() ? "MATCHES" : "ALL"}
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="border border-navy/20 px-3 py-1.5 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
          >
            UNPUBLISH {search.trim() ? "MATCHES" : "ALL"}
          </button>
        </div>

        <p className="text-xs text-navy/50">
          {selected.size} of {products?.length ?? 0} selected
          {products && products.length >= 500 && " · showing the first 500 — use search to narrow"}
        </p>

        <div className="max-h-[42vh] overflow-y-auto border border-navy/10">
          {!products ? (
            <div className="flex min-h-[160px] items-center justify-center text-navy/40">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            </div>
          ) : visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-navy/50">
              {products.length === 0
                ? "No active products have synced from this tenant's POS yet."
                : "No products match that search."}
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {visible.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30 hover:bg-blue/5"
                    onClick={() => toggle(p.id)}
                  >
                    <td className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 accent-blue"
                        aria-label={`Publish ${p.name}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-navy">{p.name}</p>
                      <p className="text-xs text-navy/50">
                        {p.sku}
                        {p.categoryName ? ` · ${p.categoryName}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-xs text-navy/70">
                      {formatCents(p.onlinePriceCents ?? p.sellingPriceCents, currency)}
                      {p.onlinePriceCents !== null && <span className="text-navy/40"> (online)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-navy/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-navy/20 px-4 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
          >
            CLOSE
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "SAVING…" : "SAVE"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
