"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { visibleNavItems } from "@/lib/nav";

const ROLE_LABEL = { SUPER_ADMIN: "Super Admin", MARKETER: "Marketer", DISTRIBUTOR: "Distributor" } as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { account, logout } = useAuth();
  const items = visibleNavItems(account?.role);

  function handleLogout(): void {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex h-full flex-col bg-navy text-cream">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-6 py-5">
        <span className="grid size-8 flex-none place-items-center bg-gold text-sm font-extrabold text-navy">BL</span>
        <span className="text-sm font-extrabold tracking-[0.14em]">BLUE LEDGER</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold tracking-wide transition ${
                active ? "bg-blue text-white" : "text-cream/70 hover:bg-white/5 hover:text-cream"
              }`}
            >
              <item.icon className="size-4 flex-none" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {account && (
        <div className="border-t border-cream/15 px-4 py-4">
          <p className="truncate text-sm font-bold text-cream">{account.name}</p>
          <p className="text-[11px] font-semibold tracking-wide text-cream/50 uppercase">
            {ROLE_LABEL[account.role]}
            {account.outlet ? ` · ${account.outlet.name}` : ""}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 border border-cream/20 px-3 py-2 text-[11px] font-bold tracking-wide text-cream/70 transition hover:bg-white/5 hover:text-cream"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            LOG OUT
          </button>
        </div>
      )}
    </div>
  );
}
