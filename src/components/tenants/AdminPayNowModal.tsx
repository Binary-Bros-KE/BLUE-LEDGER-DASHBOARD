"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Smartphone,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/money";
import type { BillingMpesaTransactionStatus, BillingPesapalTransactionStatus, PaymentScheduleResult } from "@/lib/types";

const PAYMENT_METHODS = [
  { key: "mpesa", label: "M-Pesa", icon: Smartphone },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "paypal", label: "PayPal", icon: Wallet },
] as const;

const MPESA_MESSAGES: Record<BillingMpesaTransactionStatus, string> = {
  pending: "Waiting for the customer to enter their M-Pesa PIN...",
  success: "Payment completed successfully.",
  insufficient: "Insufficient M-Pesa balance to complete this payment.",
  cancelled: "Cancelled — the request was cancelled on the customer's phone.",
  wrong_pin: "Incorrect M-Pesa PIN entered.",
  timeout: "Request timed out — re-initiate and ask the customer to respond quicker.",
  failed: "Payment failed.",
};

const PESAPAL_MESSAGES: Record<BillingPesapalTransactionStatus, string> = {
  pending: "Waiting for the client to complete payment on Pesapal's page...",
  success: "Payment completed successfully.",
  failed: "Payment failed.",
  reversed: "This payment was reversed.",
  invalid: "This payment was cancelled or is invalid.",
};

type MpesaFlowState = "idle" | "sending" | "awaiting" | "success" | "error";
type PesapalFlowState = "idle" | "submitting" | "awaiting" | "success" | "error";

/** Admin-dashboard equivalent of DESKTOP's own PayNowModal — same visual pattern (payment-method
 * tiles), triggered by a staff account on a client's behalf (e.g. over a support call), identified
 * by tenantId instead of a license key. M-Pesa pushes an STK prompt to the client's own phone; Card/
 * PayPal go through Pesapal's hosted checkout, but unlike DESKTOP (which can shell.openExternal a
 * redirect for the tenant sitting at that machine), the ADMIN is not the one paying here — the
 * redirect link is shown as a copy-to-share link instead of opened in the admin's own browser. */
export function AdminPayNowModal({
  open,
  onClose,
  tenantId,
  schedule,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  schedule: PaymentScheduleResult;
  onPaid: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [periodCount, setPeriodCount] = useState(1);
  const [state, setState] = useState<MpesaFlowState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [manualChecking, setManualChecking] = useState(false);

  const [pesapalState, setPesapalState] = useState<PesapalFlowState>("idle");
  const [pesapalMessage, setPesapalMessage] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);
  const [pesapalManualChecking, setPesapalManualChecking] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [autoBillingFlow, setAutoBillingFlow] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const isPesapalMethod = selected === "card" || selected === "paypal";

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setPhone("");
    setState("idle");
    setMessage(null);
    setCheckoutRequestId(null);
    setPesapalState("idle");
    setPesapalMessage(null);
    setOrderTrackingId(null);
    setRedirectUrl(null);
    setAutoBillingFlow(false);
    setLinkCopied(false);
    const owedCount = schedule.periods.filter((entry) => entry.status === "overdue" || entry.status === "due").length;
    setPeriodCount(Math.max(1, owedCount));
  }, [open, schedule]);

  function markResolved(result: { status: BillingMpesaTransactionStatus; mpesaReceiptNumber: string | null }): void {
    if (result.status === "success") {
      setState("success");
      setMessage(MPESA_MESSAGES.success);
    } else {
      setState("error");
      setMessage(MPESA_MESSAGES[result.status]);
    }
  }

  useEffect(() => {
    if (state !== "awaiting" || !checkoutRequestId) return;
    let cancelled = false;
    const requestId = checkoutRequestId;
    const interval = setInterval(() => {
      void api
        .getBillingStkStatus(tenantId, requestId)
        .then((result) => {
          if (cancelled || result.status === "pending") return;
          markResolved(result);
        })
        .catch(() => {
          // Transient network hiccup — try again next tick rather than ending the flow.
        });
    }, 3_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, checkoutRequestId, tenantId]);

  function markPesapalResolved(result: { status: BillingPesapalTransactionStatus }): void {
    if (result.status === "success") {
      setPesapalState("success");
      setPesapalMessage(PESAPAL_MESSAGES.success);
    } else {
      setPesapalState("error");
      setPesapalMessage(PESAPAL_MESSAGES[result.status]);
    }
  }

  useEffect(() => {
    if (pesapalState !== "awaiting" || !orderTrackingId) return;
    let cancelled = false;
    const trackingId = orderTrackingId;
    const interval = setInterval(() => {
      void api
        .getPesapalStatus(tenantId, trackingId)
        .then((result) => {
          if (cancelled || result.status === "pending") return;
          markPesapalResolved(result);
        })
        .catch(() => {
          // Transient network hiccup — try again next tick rather than ending the flow.
        });
    }, 3_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesapalState, orderTrackingId, tenantId]);

  async function handleCheckStatusNow(): Promise<void> {
    if (!checkoutRequestId) return;
    setManualChecking(true);
    try {
      const result = await api.checkBillingStkStatus(tenantId, checkoutRequestId);
      if (result.status !== "pending") markResolved(result);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Failed to check payment status");
    } finally {
      setManualChecking(false);
    }
  }

  async function handleCheckPesapalStatusNow(): Promise<void> {
    if (!orderTrackingId) return;
    setPesapalManualChecking(true);
    try {
      const result = await api.checkPesapalStatus(tenantId, orderTrackingId);
      if (result.status !== "pending") markPesapalResolved(result);
    } catch (err) {
      setPesapalMessage(err instanceof ApiError ? err.message : "Failed to check payment status");
    } finally {
      setPesapalManualChecking(false);
    }
  }

  async function handleSend(): Promise<void> {
    if (phone.trim().length < 9) {
      setState("error");
      setMessage("Enter a valid phone number");
      return;
    }
    setState("sending");
    setMessage(null);
    try {
      const result = await api.sendBillingStkPush(tenantId, phone.trim(), periodCount);
      setCheckoutRequestId(result.checkoutRequestId);
      setState("awaiting");
      setMessage(MPESA_MESSAGES.pending);
    } catch (err) {
      setState("error");
      setMessage(err instanceof ApiError ? err.message : "Failed to send STK push");
    }
  }

  async function handlePesapalSubmit(enroll: boolean): Promise<void> {
    setAutoBillingFlow(enroll);
    setPesapalState("submitting");
    setPesapalMessage(null);
    try {
      const result = await api.submitBillingPesapalOrder(tenantId, enroll ? 1 : periodCount, enroll);
      setOrderTrackingId(result.orderTrackingId);
      setRedirectUrl(result.redirectUrl);
      setPesapalState("awaiting");
      setPesapalMessage(PESAPAL_MESSAGES.pending);
    } catch (err) {
      setPesapalState("error");
      setPesapalMessage(err instanceof ApiError ? err.message : "Failed to start payment");
    }
  }

  function handleCopyLink(): void {
    if (!redirectUrl) return;
    void navigator.clipboard.writeText(redirectUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const periodNoun = schedule.billingCycle === "YEARLY" ? "year" : "month";
  const amountCents = schedule.pricePerPeriodCents ? schedule.pricePerPeriodCents * periodCount : 0;
  const nothingToPay = schedule.billingCycle === "ONCE" || !schedule.pricePerPeriodCents;
  const owed = schedule.periods.filter((entry) => entry.status === "overdue" || entry.status === "due");

  return (
    <Modal open={open} onClose={onClose} title="Pay Now" description="Choose a payment method to settle this client's Blue Ledger account.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelected(key)}
            className={`flex flex-col items-center gap-2 border px-3 py-5 text-xs font-bold transition ${
              selected === key ? "border-navy bg-cream-dark text-navy" : "border-navy/15 bg-white text-navy/70 hover:border-navy/40"
            }`}
          >
            <Icon className="size-6" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {selected === "mpesa" &&
        (nothingToPay ? (
          <p className="mt-4 border border-dashed border-navy/20 bg-cream-dark/40 px-4 py-3 text-xs font-semibold text-navy/60">
            Nothing is currently set up to bill on M-Pesa for this account.
          </p>
        ) : (
          <div className="mt-4">
            {(state === "idle" || state === "error") && (
              <div>
                {owed.length > 0 && (
                  <div className="mb-3 border border-red/30 bg-red/10 px-3.5 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-red">
                      {owed.some((e) => e.status === "overdue") ? "Overdue" : "Due Now"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-navy">{owed.map((entry) => entry.label).join(", ")}</p>
                  </div>
                )}

                <label className="block">
                  <span className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">M-Pesa Phone Number</span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0712 345 678"
                    className="mt-1.5 h-10 w-full border border-navy/20 bg-white px-3 text-sm font-semibold text-navy outline-none focus:border-navy"
                  />
                </label>

                <PeriodStepper periodCount={periodCount} setPeriodCount={setPeriodCount} periodNoun={periodNoun} />

                <div className="mt-3 flex items-center justify-between bg-navy px-4 py-3">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-cream/70">Total</span>
                  <span className="text-lg font-extrabold text-cream">
                    {schedule.currency} {formatCents(amountCents)}
                  </span>
                </div>

                {state === "error" && message && (
                  <div className="mt-3 flex items-center gap-2 border border-red/30 bg-red/10 px-3.5 py-2.5 text-sm font-bold text-red">
                    <XCircle className="size-4 flex-none" aria-hidden="true" />
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 bg-navy text-xs font-bold tracking-wide text-cream transition hover:bg-navy-deep"
                >
                  <Smartphone className="size-4" aria-hidden="true" />
                  SEND STK PUSH
                </button>
              </div>
            )}

            {state === "sending" && (
              <div className="flex items-center gap-2 text-sm font-bold text-navy/60">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending STK push...
              </div>
            )}

            {state === "awaiting" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {message ?? MPESA_MESSAGES.pending}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCheckStatusNow()}
                  disabled={manualChecking}
                  className="flex h-8 items-center gap-1.5 border border-navy/20 bg-white px-2.5 text-[11px] font-bold text-navy transition hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {manualChecking ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
                  {manualChecking ? "Checking..." : "Taking long? Check Status Now"}
                </button>
              </div>
            )}

            {state === "success" && (
              <div>
                <div className="flex items-center gap-2 text-sm font-extrabold text-green">
                  <CheckCircle2 className="size-4 flex-none" aria-hidden="true" />
                  {message ?? MPESA_MESSAGES.success}
                </div>
                <button
                  type="button"
                  onClick={onPaid}
                  className="mt-3 h-9 w-full bg-navy text-xs font-bold tracking-wide text-cream transition hover:bg-navy-deep"
                >
                  DONE
                </button>
              </div>
            )}
          </div>
        ))}

      {isPesapalMethod &&
        (nothingToPay ? (
          <p className="mt-4 border border-dashed border-navy/20 bg-cream-dark/40 px-4 py-3 text-xs font-semibold text-navy/60">
            Nothing is currently due for this account.
          </p>
        ) : (
          <div className="mt-4">
            {(pesapalState === "idle" || pesapalState === "error") && (
              <div>
                {owed.length > 0 && (
                  <div className="mb-3 border border-red/30 bg-red/10 px-3.5 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-red">
                      {owed.some((e) => e.status === "overdue") ? "Overdue" : "Due Now"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-navy">{owed.map((entry) => entry.label).join(", ")}</p>
                  </div>
                )}

                <PeriodStepper periodCount={periodCount} setPeriodCount={setPeriodCount} periodNoun={periodNoun} />

                <div className="mt-3 flex items-center justify-between bg-navy px-4 py-3">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-cream/70">Total</span>
                  <span className="text-lg font-extrabold text-cream">
                    {schedule.currency} {formatCents(amountCents)}
                  </span>
                </div>

                {pesapalState === "error" && pesapalMessage && (
                  <div className="mt-3 flex items-center gap-2 border border-red/30 bg-red/10 px-3.5 py-2.5 text-sm font-bold text-red">
                    <XCircle className="size-4 flex-none" aria-hidden="true" />
                    {pesapalMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handlePesapalSubmit(false)}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 bg-navy text-xs font-bold tracking-wide text-cream transition hover:bg-navy-deep"
                >
                  <CreditCard className="size-4" aria-hidden="true" />
                  CREATE {selected === "card" ? "CARD" : "PAYPAL"} CHECKOUT LINK
                </button>

                <div className="mt-4 border-2 border-red/40 bg-red/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-red">
                    <Zap className="size-4 flex-none" aria-hidden="true" />
                    Setup Auto Billing
                  </div>
                  <p className="mt-1 text-xs font-semibold text-navy/70">
                    Generates a checkout link where the client can also opt into future automatic
                    charges (Card/Visa only) — this first payment is still charged immediately.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handlePesapalSubmit(true)}
                    className="mt-3 h-10 w-full bg-red text-xs font-bold tracking-wide text-white transition hover:opacity-90"
                  >
                    CREATE AUTO-BILLING LINK
                  </button>
                </div>
              </div>
            )}

            {pesapalState === "submitting" && (
              <div className="flex items-center gap-2 text-sm font-bold text-navy/60">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creating secure checkout link...
              </div>
            )}

            {pesapalState === "awaiting" && (
              <div className="space-y-3">
                {redirectUrl && (
                  <div className="border border-navy/15 bg-cream-dark/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-navy/60">
                      {autoBillingFlow ? "Auto-billing checkout link" : "Checkout link"} — send this to the client
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 truncate text-[11px] text-navy">{redirectUrl}</code>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex h-7 items-center gap-1 border border-navy/20 bg-white px-2 text-[10px] font-bold text-navy hover:bg-cream-dark"
                      >
                        <Copy className="size-3" aria-hidden="true" />
                        {linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {pesapalMessage ?? PESAPAL_MESSAGES.pending}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCheckPesapalStatusNow()}
                  disabled={pesapalManualChecking}
                  className="flex h-8 items-center gap-1.5 border border-navy/20 bg-white px-2.5 text-[11px] font-bold text-navy transition hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pesapalManualChecking ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
                  {pesapalManualChecking ? "Checking..." : "Taking long? Check Status Now"}
                </button>
              </div>
            )}

            {pesapalState === "success" && (
              <div>
                <div className="flex items-center gap-2 text-sm font-extrabold text-green">
                  <CheckCircle2 className="size-4 flex-none" aria-hidden="true" />
                  {pesapalMessage ?? PESAPAL_MESSAGES.success}
                </div>
                <button
                  type="button"
                  onClick={onPaid}
                  className="mt-3 h-9 w-full bg-navy text-xs font-bold tracking-wide text-cream transition hover:bg-navy-deep"
                >
                  DONE
                </button>
              </div>
            )}
          </div>
        ))}
    </Modal>
  );
}

function PeriodStepper({
  periodCount,
  setPeriodCount,
  periodNoun,
}: {
  periodCount: number;
  setPeriodCount: (updater: (n: number) => number) => void;
  periodNoun: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-between border border-navy/15 bg-cream-dark/40 px-3.5 py-2.5">
      <span className="text-xs font-extrabold uppercase tracking-wider text-navy/60">Pay for</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPeriodCount((n) => Math.max(1, n - 1))}
          disabled={periodCount <= 1}
          className="grid size-7 place-items-center border border-navy/20 text-navy/60 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </button>
        <span className="w-24 text-center text-sm font-extrabold text-navy">
          {periodCount} {periodNoun}
          {periodCount === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => setPeriodCount((n) => Math.min(24, n + 1))}
          disabled={periodCount >= 24}
          className="grid size-7 place-items-center border border-navy/20 text-navy/60 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
