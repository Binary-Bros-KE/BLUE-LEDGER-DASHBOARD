"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Account, AccountRole, Outlet } from "@/lib/types";

type FormState = {
  name: string;
  email: string;
  password: string;
  role: AccountRole;
  outletId: string;
  isActive: boolean;
};

function emptyForm(): FormState {
  return { name: "", email: "", password: "", role: "MARKETER", outletId: "", isActive: true };
}

function toFormState(account: Account): FormState {
  return {
    name: account.name,
    email: account.email,
    password: "",
    role: account.role,
    outletId: account.outletId ?? "",
    isActive: account.isActive,
  };
}

export function AccountFormModal({
  open,
  editingAccount,
  outlets,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingAccount: Account | null;
  outlets: Outlet[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    // Resets the form to match the (possibly new) editingAccount whenever the modal opens — the
    // react.dev-endorsed "resetting state when a prop changes" pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(editingAccount ? toFormState(editingAccount) : emptyForm());
    setError(null);
    setFieldErrors({});
  }, [open, editingAccount]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      if (editingAccount) {
        await api.updateAccount(editingAccount.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          outletId: form.role === "MARKETER" ? form.outletId : null,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await api.createAccount({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          outletId: form.role === "MARKETER" ? form.outletId : null,
          isActive: form.isActive,
        });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError("Something went wrong. Check the API is running.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingAccount ? `Edit ${editingAccount.name}` : "New Account"}
      description="An employee of Blue Ledger itself — not a client's own staff. Only a Super Admin can see this tab."
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
            {fieldErrors.name && <span className="mt-1 block text-[11px] font-semibold text-red">{fieldErrors.name[0]}</span>}
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
            {fieldErrors.email && <span className="mt-1 block text-[11px] font-semibold text-red">{fieldErrors.email[0]}</span>}
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">
              Password {editingAccount && <span className="normal-case text-navy/40">(leave blank to keep current)</span>}
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              required={!editingAccount}
              minLength={8}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            />
            {fieldErrors.password && <span className="mt-1 block text-[11px] font-semibold text-red">{fieldErrors.password[0]}</span>}
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Role</span>
            <select
              value={form.role}
              onChange={(e) => updateField("role", e.target.value as AccountRole)}
              className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="MARKETER">Marketer</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </label>

          {form.role === "MARKETER" && (
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Outlet</span>
              <select
                value={form.outletId}
                onChange={(e) => updateField("outletId", e.target.value)}
                required
                className="mt-1.5 w-full border border-navy/20 bg-white px-3 py-2 text-sm outline-none focus:border-blue"
              >
                <option value="">Select outlet</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
              {fieldErrors.outletId && <span className="mt-1 block text-[11px] font-semibold text-red">{fieldErrors.outletId[0]}</span>}
            </label>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-sm font-semibold text-navy">
          <input type="checkbox" checked={form.isActive} onChange={(e) => updateField("isActive", e.target.checked)} className="size-4" />
          Active (unchecking blocks login immediately)
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
            {saving ? "SAVING…" : editingAccount ? "SAVE CHANGES" : "CREATE ACCOUNT"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
