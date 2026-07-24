"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OutletFormModal } from "@/components/outlets/OutletFormModal";
import { api, ApiError } from "@/lib/api";
import type { Outlet } from "@/lib/types";

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [deletingOutlet, setDeletingOutlet] = useState<Outlet | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      setOutlets(await api.listOutlets());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load outlets");
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount — the react.dev-endorsed pattern; this rule is stricter than the docs here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  function openCreateModal(): void {
    setEditingOutlet(null);
    setFormOpen(true);
  }

  async function handleSaved(): Promise<void> {
    setFormOpen(false);
    await loadAll();
  }

  async function handleDelete(): Promise<void> {
    if (!deletingOutlet) return;
    setDeleteBusy(true);
    setActionError(null);
    try {
      await api.deleteOutlet(deletingOutlet.id);
      setDeletingOutlet(null);
      await loadAll();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete outlet");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Teams</p>
          <h1 className="mt-1 font-display text-2xl">Outlets</h1>
          <p className="mt-1 text-sm text-navy/60">Every marketing team — each employee and client belongs to exactly one.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-blue px-4 py-2.5 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press"
        >
          <Plus className="size-4" aria-hidden="true" />
          NEW OUTLET
        </button>
      </div>

      {(loadError || actionError) && (
        <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError ?? actionError}</div>
      )}

      <div className="border border-navy/15 bg-white">
        {outlets === null ? (
          <div className="flex min-h-[240px] items-center justify-center text-navy/40">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
        ) : outlets.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-10 text-center">
            <Store className="size-8 text-navy/30" aria-hidden="true" />
            <p className="font-display text-lg">No outlets yet</p>
            <p className="text-sm text-navy/60">Create your first marketing team to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {outlets.map((outlet) => (
                  <tr key={outlet.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
                    <td className="px-4 py-3 font-bold">{outlet.name}</td>
                    <td className="px-4 py-3 text-navy/60">{outlet.location ?? "—"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-navy/60">{outlet.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOutlet(outlet);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${outlet.name}`}
                          className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-cream-dark hover:text-navy"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingOutlet(outlet)}
                          aria-label={`Delete ${outlet.name}`}
                          className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-red/10 hover:text-red"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OutletFormModal open={formOpen} editingOutlet={editingOutlet} onClose={() => setFormOpen(false)} onSaved={handleSaved} />

      <ConfirmDialog
        open={deletingOutlet !== null}
        title="Delete outlet?"
        message={`This removes "${deletingOutlet?.name}". Blocked if any account or client is still assigned to it.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeletingOutlet(null)}
      />
    </div>
  );
}
