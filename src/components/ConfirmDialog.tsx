"use client";

import { Modal } from "./Modal";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} widthClassName="max-w-sm">
      <p className="text-sm text-navy/75">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="border border-navy/20 px-4 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`px-4 py-2 text-xs font-bold tracking-wide text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            danger ? "bg-red hover:brightness-110" : "bg-blue hover:bg-blue-press"
          }`}
        >
          {busy ? "WORKING…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
