"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Outlet } from "@/lib/types";

type FormState = { name: string; location: string; notes: string };

function emptyForm(): FormState {
  return { name: "", location: "", notes: "" };
}

function toFormState(outlet: Outlet): FormState {
  return { name: outlet.name, location: outlet.location ?? "", notes: outlet.notes ?? "" };
}

export function OutletFormModal({
  open,
  editingOutlet,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingOutlet: Outlet | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Resets the form to match the (possibly new) editingOutlet whenever the modal opens — the
    // react.dev-endorsed "resetting state when a prop changes" pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(editingOutlet ? toFormState(editingOutlet) : emptyForm());
    setError(null);
  }, [open, editingOutlet]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { name: form.name, location: form.location || null, notes: form.notes || null };
      if (editingOutlet) {
        await api.updateOutlet(editingOutlet.id, payload);
      } else {
        await api.createOutlet(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingOutlet ? `Edit ${editingOutlet.name}` : "New Outlet"}
      description="A marketing team — each employee Account and client Tenant belongs to exactly one."
      widthClassName="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Location</span>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
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
            {saving ? "SAVING…" : editingOutlet ? "SAVE CHANGES" : "CREATE OUTLET"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
