"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream-dark">
      {/* Desktop sidebar — fixed, always visible at lg+ */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-[-44px] grid size-9 place-items-center bg-navy text-cream"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 border-b border-navy/10 bg-cream px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center border border-navy/20 text-navy"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-extrabold tracking-[0.14em] text-navy">BLUE LEDGER ADMIN</span>
        </div>

        <main className="p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
