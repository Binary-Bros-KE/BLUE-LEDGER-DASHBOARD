"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/** Wraps every page under the (dashboard) route group — /login is outside this group entirely, so
 * it never gets the sidebar shell or this check. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-dark text-navy/40">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  return <>{children}</>;
}
