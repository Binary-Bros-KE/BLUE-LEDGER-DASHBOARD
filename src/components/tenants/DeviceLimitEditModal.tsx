"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";

export function DeviceLimitEditModal({
  open,
  tenantId,
  currentOverride,
  planDefault,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  currentOverride: number | null;
  planDefault: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [useOverride, setUseOverride] = useState(currentOverride !== null);
  const [value, setValue] = useState(String(currentOverride ?? planDefault));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    const parsed = useOverride ? Number(value) : null;
    if (useOverride && (!Number.isFinite(parsed) || (parsed as number) < 1)) {
      setError("Enter a whole number of at least 1");
      return;
    }

    setSaving(true);
    try {
      await api.updateTenant(tenantId, { maxDevicesOverride: parsed });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update device limit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Device Limit" widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}
        <p className="text-sm text-navy/60">
          This tenant&apos;s plan normally allows <strong>{planDefault}</strong> device{planDefault === 1 ? "" : "s"}. Set a
          per-tenant override to raise (or lower) it without changing their plan — this never affects any other tenant.
        </p>
        <label className="flex items-center gap-2 text-sm font-semibold text-navy">
          <input
            type="checkbox"
            checked={useOverride}
            onChange={(e) => setUseOverride(e.target.checked)}
            className="size-4"
          />
          Override this tenant&apos;s device limit
        </label>
        {useOverride && (
          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Device Limit</span>
            <input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
        )}
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
            disabled={saving}
            className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "SAVING…" : "SAVE"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
