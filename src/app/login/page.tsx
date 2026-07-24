"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { status, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the API. Is it running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-11 place-items-center text-base font-extrabold text-navy">
            <img src="/BLUE_LEDGER.png" alt="BLUE LEDGER" />
          </span>
          <h1 className="mt-2 font-display text-xl text-navy">BLUE LEDGER</h1>
          <p className="text-xs font-semibold tracking-wide text-navy/50 uppercase">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>}

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="mt-1.5 w-full border border-navy/20 px-3 py-2.5 text-sm outline-none focus:border-blue"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1.5 w-full border border-navy/20 px-3 py-2.5 text-sm outline-none focus:border-blue"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 bg-blue py-3 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
            {submitting ? "SIGNING IN…" : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
