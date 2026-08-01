"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { AccountFormModal } from "@/components/accounts/AccountFormModal";
import { Badge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Account, Outlet } from "@/lib/types";

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function AccountsPage() {
  const { account: currentAccount } = useAuth();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [accountList, outletList] = await Promise.all([api.listAccounts(), api.listOutlets()]);
      setAccounts(accountList);
      setOutlets(outletList);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load accounts");
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount — the react.dev-endorsed pattern; this rule is stricter than the docs here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  function openCreateModal(): void {
    setEditingAccount(null);
    setFormOpen(true);
  }

  async function handleSaved(): Promise<void> {
    setFormOpen(false);
    await loadAll();
  }

  async function handleDelete(): Promise<void> {
    if (!deletingAccount) return;
    setDeleteBusy(true);
    setActionError(null);
    try {
      await api.deleteAccount(deletingAccount.id);
      setDeletingAccount(null);
      await loadAll();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete account");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Team</p>
          <h1 className="mt-1 font-display text-2xl">Accounts</h1>
          <p className="mt-1 text-sm text-navy/60">Every Blue Ledger employee. Only Super Admins can see this tab.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-blue px-4 py-2.5 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press"
        >
          <Plus className="size-4" aria-hidden="true" />
          NEW ACCOUNT
        </button>
      </div>

      {(loadError || actionError) && (
        <div className="border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError ?? actionError}</div>
      )}

      <div className="border border-navy/15 bg-white">
        {accounts === null ? (
          <div className="flex min-h-[240px] items-center justify-center text-navy/40">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-10 text-center">
            <Users className="size-8 text-navy/30" aria-hidden="true" />
            <p className="font-display text-lg">No accounts yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy/15 bg-cream-dark text-left text-[11px] font-bold tracking-wide text-navy/60 uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Outlet</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id} className="border-b border-navy/10 last:border-0 odd:bg-white even:bg-cream-dark/30">
                    <td className="px-4 py-3">
                      <p className="font-bold">{acc.name}</p>
                      <p className="text-xs text-navy/50">{acc.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={acc.role === "SUPER_ADMIN" ? "gold" : "blue"}>
                        {acc.role === "SUPER_ADMIN" ? "SUPER ADMIN" : acc.role === "DISTRIBUTOR" ? "DISTRIBUTOR" : "MARKETER"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-navy/60">{acc.outlet?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={acc.isActive ? "green" : "red"}>{acc.isActive ? "ACTIVE" : "DISABLED"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy/60">{formatDate(acc.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccount(acc);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${acc.name}`}
                          className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-cream-dark hover:text-navy"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAccount(acc)}
                          disabled={acc.id === currentAccount?.id}
                          aria-label={`Delete ${acc.name}`}
                          title={acc.id === currentAccount?.id ? "You can't delete your own account" : undefined}
                          className="grid size-8 place-items-center border border-navy/15 text-navy/60 transition hover:bg-red/10 hover:text-red disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy/60"
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

      <AccountFormModal
        open={formOpen}
        editingAccount={editingAccount}
        outlets={outlets}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deletingAccount !== null}
        title="Delete account?"
        message={`This removes "${deletingAccount?.name}"'s access immediately. This can't be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeletingAccount(null)}
      />
    </div>
  );
}
