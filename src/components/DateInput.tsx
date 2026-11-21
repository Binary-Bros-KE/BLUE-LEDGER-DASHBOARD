"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

/** "2026-11-30" → "30/11/2026" ("" stays ""). */
function isoToText(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/** "30/11/2026" → "2026-11-30", or null unless it's a complete, real date. */
function textToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (date.getFullYear() !== Number(yyyy) || date.getMonth() !== Number(mm) - 1 || date.getDate() !== Number(dd)) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Typing "30112026" reads as "30/11/2026" — slashes are added as you go. */
function autoSlash(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * A date field that always reads DD/MM/YYYY — a native <input type="date"> shows the browser's
 * locale format instead (MM/DD/YYYY on a US-English browser). Value in and out is still
 * "YYYY-MM-DD" (or ""), exactly like the native input, so forms and the API don't change. The
 * calendar button opens the browser's own picker.
 */
export function DateInput({
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(() => isoToText(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  // Follow changes from outside (form reset, the picker) — but never clobber a half-typed date,
  // which leaves `value` untouched until it's complete.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText((current) => (textToIso(current) === value ? current : isoToText(value)));
  }, [value]);

  function handleType(raw: string): void {
    const next = autoSlash(raw);
    setText(next);
    if (next === "") onChange("");
    else {
      const iso = textToIso(next);
      if (iso) onChange(iso);
    }
  }

  function openPicker(): void {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
    }
  }

  return (
    <div className={`relative mt-1.5 ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        value={text}
        onChange={(e) => handleType(e.target.value)}
        onBlur={() => setText(isoToText(value))}
        required={required}
        disabled={disabled}
        pattern="\d{2}/\d{2}/\d{4}"
        title="DD/MM/YYYY"
        className="w-full border border-navy/20 py-2 pr-10 pl-3 text-sm outline-none focus:border-blue disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-navy/50"
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label="Open calendar"
        className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center text-navy/50 hover:text-navy disabled:cursor-not-allowed"
      >
        <CalendarDays className="size-4" aria-hidden="true" />
      </button>
      {/* The browser's own calendar, anchored under the button; never shown or tabbed to itself. */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
