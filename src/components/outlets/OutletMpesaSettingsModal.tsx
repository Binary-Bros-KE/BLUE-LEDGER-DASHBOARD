"use client";

import { useEffect, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Outlet, OutletMpesaSettingsSaveInput } from "@/lib/types";

type FormState = OutletMpesaSettingsSaveInput;

function emptyForm(): FormState {
  return { environment: "sandbox", consumerKey: "", consumerSecret: "", passkey: "", shortcode: "", tillNumber: "", accountReference: "" };
}

/** The Till this outlet's own tenants pay their SOFTWARE subscription/maintenance into — separate
 * from (and never touched by) each tenant's own per-storefront sales Till, which lives entirely on
 * DESKTOP/SERVER's mpesa-till-settings, not here. Same "fetch fresh every open, never cache" caution
 * as that feature, even though this admin session already holds a JWT — no reason to keep secrets
 * in memory longer than the panel is actually open. */
export function OutletMpesaSettingsModal({
  open,
  outlet,
  onClose,
}: {
  open: boolean;
  outlet: Outlet | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !outlet) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSavedAt(null);
    void api
      .getOutletMpesaSettings(outlet.id)
      .then((settings) => {
        if (cancelled) return;
        setForm(
          settings
            ? {
                environment: settings.environment as "sandbox" | "production",
                consumerKey: settings.consumerKey,
                consumerSecret: settings.consumerSecret,
                passkey: settings.passkey,
                shortcode: settings.shortcode,
                tillNumber: settings.tillNumber,
                accountReference: settings.accountReference,
              }
            : emptyForm(),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load M-Pesa Till settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, outlet]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!outlet) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveOutletMpesaSettings(outlet.id, form);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save M-Pesa Till settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="M-Pesa Till Settings"
      description={
        outlet
          ? `Till (Buy Goods) credentials ${outlet.name}'s own tenants pay their Blue Ledger subscription into.`
          : ""
      }
      widthClassName="max-w-lg"
    >
      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center text-navy/40">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}
          {savedAt && (
            <div className="border border-green/30 bg-green/10 px-4 py-2.5 text-sm font-semibold text-green">
              Till settings saved.
            </div>
          )}

          <div className="flex items-start gap-2.5 border border-dashed border-navy/20 bg-cream-dark/40 px-3.5 py-3">
            <Smartphone className="mt-0.5 size-4 flex-none text-navy/40" aria-hidden="true" />
            <p className="text-xs text-navy/60">
              This enables self-serve STK Push payments from every tenant belonging to this outlet.
              All fields are required to save.
            </p>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Environment</span>
            <select
              value={form.environment}
              onChange={(e) => setForm((prev) => ({ ...prev, environment: e.target.value as "sandbox" | "production" }))}
              className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="sandbox">Sandbox (testing)</option>
              <option value="production">Production (live Till)</option>
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Consumer Key" value={form.consumerKey} onChange={(v) => setForm((p) => ({ ...p, consumerKey: v }))} />
            <TextField
              label="Consumer Secret"
              type="password"
              value={form.consumerSecret}
              onChange={(v) => setForm((p) => ({ ...p, consumerSecret: v }))}
            />
            <TextField
              label="Passkey"
              type="password"
              value={form.passkey}
              onChange={(v) => setForm((p) => ({ ...p, passkey: v }))}
              className="sm:col-span-2"
            />
            <TextField label="Shortcode" value={form.shortcode} onChange={(v) => setForm((p) => ({ ...p, shortcode: v }))} />
            <TextField label="Till Number" value={form.tillNumber} onChange={(v) => setForm((p) => ({ ...p, tillNumber: v }))} />
            <TextField
              label="Account Reference"
              value={form.accountReference ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, accountReference: v }))}
              placeholder="Optional — shown on the payer's STK prompt"
              className="sm:col-span-2"
              required={false}
            />
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
              type="submit"
              disabled={saving}
              className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "SAVING…" : "SAVE TILL SETTINGS"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
      />
    </label>
  );
}
