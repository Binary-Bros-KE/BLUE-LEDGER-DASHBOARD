"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { DomainStatus, WebStore } from "@/lib/types";

const DOMAIN_TONE: Record<DomainStatus, "muted" | "gold" | "blue" | "green"> = {
  NONE: "muted",
  PENDING_DNS: "gold",
  VERIFYING_TLS: "blue",
  LIVE: "green",
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-navy/10 bg-cream-dark px-3 py-2">
      <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">{label}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-navy">{value}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          aria-label={`Copy ${label}`}
          className="flex-none text-navy/40 transition hover:text-navy"
        >
          {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function ShopDomainModal({
  open,
  tenantId,
  store,
  storefrontPublicHost,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  store: WebStore;
  storefrontPublicHost: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [domain, setDomain] = useState(store.customDomain ?? "");
  const [busy, setBusy] = useState<"save" | "verify" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<DomainStatus>(store.domainStatus);
  const [savedDomain, setSavedDomain] = useState(store.customDomain);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDomain(store.customDomain ?? "");
    setSavedDomain(store.customDomain);
    setStatus(store.domainStatus);
    setError(null);
    setVerifyMsg(null);
  }, [open, store]);

  const cnameTarget = storefrontPublicHost ?? "<your storefront host — set STOREFRONT_PUBLIC_HOST>";

  async function save(): Promise<void> {
    setBusy("save");
    setError(null);
    setVerifyMsg(null);
    try {
      const res = await api.setShopDomain(tenantId, domain.trim().toLowerCase());
      setSavedDomain(res.store?.customDomain ?? null);
      setStatus(res.store?.domainStatus ?? "NONE");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save the domain");
    } finally {
      setBusy(null);
    }
  }

  async function verify(): Promise<void> {
    setBusy("verify");
    setError(null);
    setVerifyMsg(null);
    try {
      const res = await api.verifyShopDomain(tenantId);
      setStatus(res.store?.domainStatus ?? "NONE");
      setVerifyMsg(`Verified — ${res.detail}`);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(): Promise<void> {
    setBusy("remove");
    setError(null);
    try {
      await api.setShopDomain(tenantId, null);
      setSavedDomain(null);
      setStatus("NONE");
      setDomain("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove the domain");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Custom domain"
      description="Connect the shop's own domain. DNS and TLS are handled outside this dashboard."
      widthClassName="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>
        )}
        {verifyMsg && (
          <div className="border border-green/30 bg-green/10 px-4 py-2.5 text-sm font-semibold text-green">
            {verifyMsg}
          </div>
        )}

        <label className="block">
          <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Domain</span>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value.toLowerCase())}
            placeholder="shop.trylistsolutions.co.ke"
            className="mt-1.5 w-full border border-navy/20 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>

        {savedDomain && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-navy/60">Status:</span>
            <Badge tone={DOMAIN_TONE[status]}>{status.replace("_", " ")}</Badge>
          </div>
        )}

        <div className="space-y-2 border border-navy/10 bg-white p-3">
          <p className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">
            Step 1 — add this DNS record (at the client&rsquo;s registrar)
          </p>
          <CopyRow label="Type" value="CNAME" />
          <CopyRow label="Name / Host" value={savedDomain ?? (domain.trim() || "shop.example.co.ke")} />
          <CopyRow label="Value / Target" value={cnameTarget} />
          <p className="text-xs text-navy/50">
            Root domains use the registrar&rsquo;s CNAME-flattening / ALIAS record. Then click Verify —
            propagation can take a few minutes.
          </p>
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-navy/10 pt-4">
          <div>
            {savedDomain && (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy !== null}
                className="border border-red/30 px-4 py-2 text-xs font-bold tracking-wide text-red transition hover:bg-red/10 disabled:opacity-60"
              >
                {busy === "remove" ? "REMOVING…" : "REMOVE"}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {savedDomain === domain.trim().toLowerCase() && savedDomain ? (
              <button
                type="button"
                onClick={() => void verify()}
                disabled={busy !== null}
                className="border border-navy/20 px-4 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark disabled:opacity-60"
              >
                {busy === "verify" ? "CHECKING…" : "VERIFY DNS"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy !== null || !domain.trim()}
                className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "save" ? "SAVING…" : "SAVE DOMAIN"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
