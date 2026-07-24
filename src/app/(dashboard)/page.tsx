"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Loader2, ShieldAlert, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import type { Tenant } from "@/lib/types";

function StatTile({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 border border-navy/15 bg-white p-5">
      <div className="grid size-11 flex-none place-items-center bg-navy/5 text-navy">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-wide text-navy/50 uppercase">{label}</p>
        <p className="font-display text-xl">{value}</p>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);

  useEffect(() => {
    void api.listTenants().then(setTenants).catch(() => setTenants([]));
  }, []);

  const activeCount = tenants?.filter((t) => t.license?.status === "ACTIVE").length ?? 0;
  const trialCount = tenants?.filter((t) => t.license?.status === "TRIAL").length ?? 0;
  const suspendedCount = tenants?.filter((t) => t.license?.status === "SUSPENDED").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold tracking-[0.16em] text-green uppercase">Overview</p>
        <h1 className="mt-1 font-display text-2xl">Welcome back.</h1>
        <p className="mt-1 text-sm text-navy/60">A quick look across every Blue Ledger tenant.</p>
      </div>

      {tenants === null ? (
        <div className="flex min-h-[120px] items-center justify-center text-navy/40">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={Building2} label="Total Tenants" value={String(tenants.length)} />
          <StatTile icon={TrendingUp} label="Active" value={String(activeCount)} />
          <StatTile icon={ShieldAlert} label="On Trial / Suspended" value={`${trialCount} / ${suspendedCount}`} />
        </div>
      )}

      <Link
        href="/tenants"
        className="inline-flex items-center gap-2 bg-navy px-5 py-3 text-xs font-bold tracking-wide text-cream transition hover:bg-blue"
      >
        MANAGE TENANTS
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
