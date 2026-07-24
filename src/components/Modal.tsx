"use client";

import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  widthClassName = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 py-10 sm:items-center">
      <div className="fixed inset-0 bg-navy-deep/50" onClick={onClose} aria-hidden="true" />
      {/* Capped to the viewport height and split into a fixed header + its own scrolling body —
       * a long form (many fields) scrolls internally instead of pushing the footer/buttons off
       * the bottom of the screen with no way to reach them. */}
      <div className={`relative flex max-h-[85vh] w-full flex-col ${widthClassName} bg-white shadow-xl`}>
        <div className="flex flex-none items-start justify-between gap-4 border-b border-navy/10 p-6 pb-4">
          <div>
            <h2 className="font-display text-lg">{title}</h2>
            {description && <p className="mt-1 text-sm text-navy/60">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 flex-none place-items-center text-navy/50 transition hover:bg-cream-dark hover:text-navy"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 pt-5">{children}</div>
      </div>
    </div>
  );
}
