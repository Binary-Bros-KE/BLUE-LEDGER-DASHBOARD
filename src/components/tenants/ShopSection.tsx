"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Globe, Loader2, Package, Pencil, Power, Store } from "lucide-react";
import { Badge } from "@/components/Badge";
import { api, ApiError } from "@/lib/api";
import type { DomainStatus, Location, ShopOverview, WebStoreStatus } from "@/lib/types";
import { ShopDomainModal } from "./ShopDomainModal";
import { ShopSettingsModal } from "./ShopSettingsModal";
import { ShopSetupModal } from "./ShopSetupModal";

const STATUS_TONE: Record<WebStoreStatus, "green" | "gold" | "red"> = {
  LIVE: "green",
  DRAFT: "gold",
  SUSPENDED: "red",
};

const DOMAIN_TONE: Record<DomainStatus, "muted" | "gold" | "blue" | "green"> = {
  NONE: "muted",
  PENDING_DNS: "gold",
  VERIFYING_TLS: "blue",
  LIVE: "green",
};

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-navy/10 bg-cream-dark px-4 py-3">
      <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">{label}</p>
      <div className="mt-1 text-sm font-bold text-navy">{children}</div>
    </div>
  );
}

function storeUrl(host: string): string {
  const scheme = host.includes("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${scheme}://${host}`;
}

export function ShopSection({
  tenantId,
  tenantSlug,
  tenantCurrency,
  locations,
  isSuperAdmin,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantCurrency: string;
  locations: Location[];
  isSuperAdmin: boolean;
}) {
  const [overview, setOverview] = useState<ShopOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const [setupOpen, setSetupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setOverview(await api.getShopOverview(tenantId));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load the online store");
    }
  }, [tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setStatus(status: WebStoreStatus): Promise<void> {
    setStatusBusy(true);
    setActionError(null);
    try {
      setOverview(await api.updateShop(tenantId, { status }));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to change the store status");
    } finally {
      setStatusBusy(false);
    }
  }

  const heading = (
    <div className="flex items-center gap-2">
      <Store className="size-4 text-navy/50" aria-hidden="true" />
      <h2 className="font-display text-lg">Online Store</h2>
    </div>
  );

  if (loadError) {
    return (
      <section className="border border-navy/15 bg-white p-5">
        {heading}
        <div className="mt-4 border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{loadError}</div>
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="border border-navy/15 bg-white p-5">
        {heading}
        <div className="mt-4 flex min-h-[80px] items-center justify-center text-navy/40">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        </div>
      </section>
    );
  }

  const { store } = overview;

  return (
    <section className="border border-navy/15 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {heading}
        {isSuperAdmin && store && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 border border-navy/20 px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              SETTINGS
            </button>
            {store.status === "LIVE" ? (
              <button
                type="button"
                onClick={() => void setStatus("DRAFT")}
                disabled={statusBusy}
                className="inline-flex items-center gap-1.5 border border-navy/20 px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark disabled:opacity-60"
              >
                <Power className="size-3.5" aria-hidden="true" />
                TAKE OFFLINE
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void setStatus("LIVE")}
                disabled={statusBusy}
                className="inline-flex items-center gap-1.5 border border-green/30 bg-green/10 px-3 py-2 text-xs font-bold tracking-wide text-green transition hover:bg-green/15 disabled:opacity-60"
              >
                <Power className="size-3.5" aria-hidden="true" />
                GO LIVE
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="mt-4 border border-red/30 bg-red/10 px-4 py-3 text-sm font-semibold text-red">{actionError}</div>
      )}

      {!store ? (
        <div className="mt-4 flex flex-col items-start gap-3 border border-dashed border-navy/20 bg-cream-dark/50 px-4 py-5">
          <p className="text-sm text-navy/60">
            This tenant doesn&rsquo;t have an online store yet. Setting one up turns on the e-commerce add-on and
            creates their storefront as a draft — nothing is public until you publish it.
          </p>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="inline-flex items-center gap-1.5 bg-blue px-4 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press"
            >
              <Store className="size-3.5" aria-hidden="true" />
              SET UP ONLINE STORE
            </button>
          )}
        </div>
      ) : (
        <>
          {overview.activeProductCount === 0 && (
            <div className="mt-4 border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold-text">
              No products have synced from this tenant&rsquo;s POS yet — they run cloud sync on their desktop app, then
              publish products from its <span className="font-bold">Online Store</span> tab.
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="border border-navy/10 bg-cream-dark px-4 py-3">
              <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">Status</p>
              <div className="mt-1.5">
                <Badge tone={STATUS_TONE[store.status]}>{store.status}</Badge>
              </div>
            </div>

            <div className="border border-navy/10 bg-cream-dark px-4 py-3">
              <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">Add-on</p>
              <div className="mt-1.5">
                <Badge tone={overview.ecommerceEnabled || overview.planFeatureEcommerce ? "green" : "muted"}>
                  {overview.ecommerceEnabled ? "ENABLED" : overview.planFeatureEcommerce ? "VIA PLAN" : "OFF"}
                </Badge>
              </div>
            </div>

            <Tile label="Currency">{store.currency}</Tile>
            <Tile label="Fulfilment branch">
              {overview.fulfilmentLocationName ?? <span className="text-gold-text">Not set</span>}
            </Tile>

            <div className="col-span-2 border border-navy/10 bg-cream-dark px-4 py-3 sm:col-span-4">
              <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">Preview address</p>
              <div className="mt-1 flex items-center gap-2">
                <a
                  href={storeUrl(`${store.subdomain}.${overview.storefrontBaseDomain}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-mono text-xs font-bold text-blue hover:underline"
                >
                  {store.subdomain}.{overview.storefrontBaseDomain}
                </a>
                <ExternalLink className="size-3 flex-none text-navy/40" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Custom domain */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-navy/10 bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-wide text-navy/50 uppercase">Custom domain</p>
              <div className="mt-1 flex items-center gap-2">
                <Globe className="size-3.5 flex-none text-navy/40" aria-hidden="true" />
                {store.customDomain ? (
                  <>
                    <a
                      href={storeUrl(store.customDomain)}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-xs font-bold text-navy hover:underline"
                    >
                      {store.customDomain}
                    </a>
                    <Badge tone={DOMAIN_TONE[store.domainStatus]}>{store.domainStatus.replace("_", " ")}</Badge>
                  </>
                ) : (
                  <span className="text-sm text-navy/50">Not connected — using the preview address</span>
                )}
              </div>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setDomainOpen(true)}
                className="inline-flex items-center gap-1.5 border border-navy/20 px-3 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
              >
                {store.customDomain ? "MANAGE DOMAIN" : "CONNECT DOMAIN"}
              </button>
            )}
          </div>

          {/* Products — read-only here. The shop owner curates their catalogue from the desktop
              POS "Online Store" tab; this panel only owns provisioning + the domain plumbing. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-navy/10 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <Package className="size-3.5 flex-none text-navy/40" aria-hidden="true" />
              <p className="text-sm text-navy">
                <span className="font-bold">{overview.publishedCount}</span> of {overview.activeProductCount} products
                published · {overview.categoryCount} categor{overview.categoryCount === 1 ? "y" : "ies"}
              </p>
            </div>
            <p className="text-xs text-navy/45">Managed by the shop owner in their POS</p>
          </div>
        </>
      )}

      {/* Modals */}
      <ShopSetupModal
        open={setupOpen}
        tenantId={tenantId}
        defaultSubdomain={tenantSlug}
        defaultCurrency={tenantCurrency}
        storefrontBaseDomain={overview.storefrontBaseDomain}
        storefrontPublicHost={overview.storefrontPublicHost}
        locations={locations}
        onClose={() => setSetupOpen(false)}
        onSaved={() => {
          setSetupOpen(false);
          void load();
        }}
      />

      {store && (
        <ShopSettingsModal
          open={settingsOpen}
          tenantId={tenantId}
          store={store}
          storefrontBaseDomain={overview.storefrontBaseDomain}
          locations={locations}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            void load();
          }}
        />
      )}

      {store && (
        <ShopDomainModal
          open={domainOpen}
          tenantId={tenantId}
          store={store}
          storefrontPublicHost={overview.storefrontPublicHost}
          onClose={() => setDomainOpen(false)}
          onSaved={() => void load()}
        />
      )}
    </section>
  );
}
