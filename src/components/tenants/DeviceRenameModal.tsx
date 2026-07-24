"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Device } from "@/lib/types";

export function DeviceRenameModal({
  open,
  tenantId,
  device,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  device: Device;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(device.deviceName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.renameDevice(tenantId, device.id, name.trim());
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to rename device");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Rename Device" widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}
        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Device Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            required
            className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          />
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
