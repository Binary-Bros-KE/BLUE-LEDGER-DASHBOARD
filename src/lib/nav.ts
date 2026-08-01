import { Activity, Building2, CreditCard, LayoutDashboard, LifeBuoy, Package, Settings, Store, Users } from "lucide-react";
import type { AccountRole } from "./types";

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, superAdminOnly: false },
  { href: "/tenants", label: "Tenants", icon: Building2, superAdminOnly: false },
  { href: "/plans", label: "Plans", icon: Package, superAdminOnly: false },
  { href: "/outlets", label: "Outlets", icon: Store, superAdminOnly: true },
  { href: "/accounts", label: "Accounts", icon: Users, superAdminOnly: true },
  { href: "/billing", label: "Billing", icon: CreditCard, superAdminOnly: false },
  { href: "/activity", label: "Activity", icon: Activity, superAdminOnly: false },
  { href: "/support", label: "Support", icon: LifeBuoy, superAdminOnly: false },
  { href: "/settings", label: "Settings", icon: Settings, superAdminOnly: false },
] as const;

export function visibleNavItems(role: AccountRole | undefined) {
  return NAV_ITEMS.filter((item) => !item.superAdminOnly || role === "SUPER_ADMIN");
}
