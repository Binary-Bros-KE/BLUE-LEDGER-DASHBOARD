"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import {
  COLOR_ROLES,
  contrast,
  deriveRole,
  isHex,
  parseColors,
  type BrandColors,
  type ColorRole,
} from "@/lib/storefront-palette";
import { COLOR_PRESETS, ROLE_LABEL, STOREFRONT_TEMPLATES, templateInfo } from "@/lib/storefront-templates";
import type { WebStore } from "@/lib/types";

type RawColors = Record<ColorRole, string>;

const EMPTY_RAW: RawColors = { primary: "", secondary: "", accent: "" };

function normaliseHex(raw: string): string | null {
  const v = raw.trim();
  if (!isHex(v)) return null;
  return (v.startsWith("#") ? v : `#${v}`).toLowerCase();
}

/**
 * Admin-only look & feel for a tenant's storefront: which template renders it, and the three brand
 * colours that template is painted with. Content (hero text, images, logo…) is NOT here — the shop
 * owner edits that from their POS "Online Store" tab.
 */
export function ShopLookModal({
  open,
  tenantId,
  store,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string;
  store: WebStore;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [templateId, setTemplateId] = useState(store.templateId);
  // Raw text per role, exactly as typed ("" = use the template default). Never re-derived from the
  // parsed value on render, or a half-typed hex would snap back while typing.
  const [raw, setRaw] = useState<RawColors>(EMPTY_RAW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const stored = parseColors(store.themeColorsJson);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTemplateId(store.templateId);
    setRaw({ primary: stored.primary ?? "", secondary: stored.secondary ?? "", accent: stored.accent ?? "" });
    setError(null);
  }, [open, store]);

  const template = templateInfo(templateId);

  /** What each role will actually render with: the valid override, else the template default. */
  const effective: BrandColors = useMemo(() => {
    const out = { ...template.colorDefaults };
    for (const role of COLOR_ROLES) {
      const hex = normaliseHex(raw[role]);
      if (hex) out[role] = hex;
    }
    return out;
  }, [raw, template]);

  const invalidRoles = COLOR_ROLES.filter((r) => raw[r].trim() !== "" && !normaliseHex(raw[r]));

  function pickTemplate(id: string): void {
    if (id === templateId) return;
    setTemplateId(id);
    // A new template starts from ITS own palette — overrides tuned for another design rarely carry over.
    setRaw(EMPTY_RAW);
  }

  async function handleSave(): Promise<void> {
    if (invalidRoles.length) return;
    setSaving(true);
    setError(null);
    try {
      // A colour equal to the template default is stored as "no override" — keeps the store on the
      // template's hand-tuned palette and follows it if the template's defaults are ever refined.
      const themeColors = Object.fromEntries(
        COLOR_ROLES.map((role) => {
          const hex = normaliseHex(raw[role]);
          return [role, hex && hex !== template.colorDefaults[role] ? hex : null];
        }),
      ) as Record<ColorRole, string | null>;
      await api.updateShop(tenantId, { templateId, themeColors });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save the store look");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Storefront look"
      description="Template and brand colours. The shop owner edits text and images from their POS."
      widthClassName="max-w-5xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-semibold text-red">{error}</div>
        )}

        {/* 1 — Template */}
        <section>
          <h3 className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">1 · Template</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STOREFRONT_TEMPLATES.map((t) => {
              const selected = t.id === templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  aria-pressed={selected}
                  className={`relative flex flex-col gap-2 border p-4 text-left transition ${
                    selected ? "border-blue bg-blue/5 ring-2 ring-blue" : "border-navy/15 bg-white hover:border-navy/40"
                  }`}
                >
                  {selected && (
                    <span className="absolute top-3 right-3 grid size-5 place-items-center bg-blue text-white">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                  <span className="font-display text-base text-navy">{t.name}</span>
                  <span className="flex gap-1" aria-hidden="true">
                    {COLOR_ROLES.map((r) => (
                      <span key={r} className="h-3 w-8 border border-navy/10" style={{ background: t.colorDefaults[r] }} />
                    ))}
                  </span>
                  <span className="text-xs leading-relaxed text-navy/60">{t.description}</span>
                </button>
              );
            })}
            <div className="flex items-center justify-center border border-dashed border-navy/20 p-4 text-center text-xs text-navy/45">
              More templates are added one at a time — each one works with any colours below.
            </div>
          </div>
        </section>

        {/* 2 — Colours + live preview */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <h3 className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">2 · Brand colours</h3>
            <div className="mt-2 space-y-3">
              {COLOR_ROLES.map((role) => (
                <ColorRow
                  key={role}
                  role={role}
                  help={template.roleHelp[role]}
                  raw={raw[role]}
                  defaultHex={template.colorDefaults[role]}
                  effective={effective[role]}
                  onChange={(v) => setRaw((prev) => ({ ...prev, [role]: v }))}
                />
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-0 lg:self-start">
            <h3 className="text-[11px] font-bold tracking-wide text-navy/60 uppercase">Preview</h3>
            <LookPreview colors={effective} />
            <p className="mt-2 text-xs text-navy/45">
              A schematic of how the three colours are used. Open the store after saving to see {template.name}{" "}
              itself.
            </p>
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-navy/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-navy/20 px-4 py-2 text-xs font-bold tracking-wide text-navy transition hover:bg-cream-dark"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || invalidRoles.length > 0}
            className="bg-blue px-5 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-blue-press disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "SAVING…" : "SAVE LOOK"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ColorRow({
  role,
  help,
  raw,
  defaultHex,
  effective,
  onChange,
}: {
  role: ColorRole;
  help: string;
  raw: string;
  defaultHex: string;
  effective: string;
  onChange: (value: string) => void;
}) {
  const typed = raw.trim();
  const valid = typed === "" || Boolean(normaliseHex(typed));
  const isDefault = effective === defaultHex;
  // The storefront deepens a too-light secondary so text on/against it stays readable — say so.
  const rendered = deriveRole(role, effective)[`--brand-${role}`];
  const adjusted = rendered !== effective;
  // Primary/accent are painted on white surfaces too — flag a pick that barely shows up there.
  const faint = role !== "secondary" && contrast(effective, "#ffffff") < 1.6;

  return (
    <div className="border border-navy/10 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy">{ROLE_LABEL[role]}</p>
          <p className="text-xs text-navy/55">{help}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative block size-9 flex-none cursor-pointer border border-navy/20" title="Pick a colour">
            <span className="absolute inset-0" style={{ background: effective }} />
            <input
              type="color"
              value={effective}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label={`${ROLE_LABEL[role]} colour picker`}
            />
          </label>
          <input
            value={raw}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultHex}
            spellCheck={false}
            aria-label={`${ROLE_LABEL[role]} hex`}
            className={`w-28 border px-2 py-2 font-mono text-xs uppercase outline-none ${
              valid ? "border-navy/20 focus:border-blue" : "border-red text-red"
            }`}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={typed === ""}
            title="Use the template's default"
            className="grid size-9 place-items-center border border-navy/20 text-navy/60 transition hover:bg-cream-dark disabled:opacity-30"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {COLOR_PRESETS[role].map((p) => (
          <button
            key={p.hex}
            type="button"
            onClick={() => onChange(p.hex)}
            title={`${p.name} ${p.hex}`}
            aria-label={p.name}
            className={`size-6 border transition ${
              effective === p.hex ? "border-navy ring-2 ring-navy/40" : "border-navy/15 hover:scale-110"
            }`}
            style={{ background: p.hex }}
          />
        ))}
      </div>

      <p className="mt-2 text-[11px] text-navy/50">
        {!valid ? (
          <span className="font-semibold text-red">Enter a 6-digit hex like #D71920, or clear it for the default.</span>
        ) : adjusted ? (
          <>
            Renders as <span className="font-mono font-bold text-navy">{rendered.toUpperCase()}</span> — deepened
            automatically so text on and against it stays readable.
          </>
        ) : faint ? (
          <span className="font-semibold text-gold-text">Very light — this will barely show against white areas.</span>
        ) : isDefault ? (
          "Template default"
        ) : (
          "Custom colour"
        )}
      </p>
    </div>
  );
}

/** A tiny schematic storefront painted with the same derived tokens the real storefront uses. */
function LookPreview({ colors }: { colors: BrandColors }) {
  const t = {
    ...deriveRole("primary", colors.primary),
    ...deriveRole("secondary", colors.secondary),
    ...deriveRole("accent", colors.accent),
  };
  const v = (k: string) => t[`--brand-${k}`];

  return (
    <div className="mt-2 overflow-hidden border border-navy/15 bg-white text-[10px]" style={{ color: v("secondary") } as CSSProperties}>
      <div className="px-3 py-1.5 font-mono tracking-wider uppercase" style={{ background: v("secondary"), color: v("on-secondary-soft") }}>
        <span style={{ color: v("accent") }}>◆</span> Free delivery in Nairobi
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-black/10 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="grid size-5 place-items-center font-black" style={{ background: v("primary"), color: v("on-primary") }}>
            S
          </span>
          <span className="font-black">SHOP</span>
        </div>
        <span className="h-5 flex-1 border border-black/15" />
        <span className="px-2 py-1 font-bold" style={{ background: v("primary"), color: v("on-primary") }}>
          CART · 2
        </span>
      </div>
      <div className="flex gap-3 px-3 py-1.5 font-mono tracking-wider uppercase" style={{ background: v("accent"), color: v("on-accent") }}>
        <b>Shop all</b>
        <span>TVs</span>
        <span>Fridges</span>
        <span>Cookers</span>
      </div>
      <div className="px-3 py-4" style={{ background: v("secondary"), color: v("on-secondary") }}>
        <p className="font-mono tracking-wider uppercase" style={{ color: v("accent") }}>
          Deal of the week
        </p>
        <p className="mt-1 text-base leading-tight font-black">Make home better.</p>
        <p className="mt-1" style={{ color: v("on-secondary-body") }}>
          Genuine products, official warranty.
        </p>
        <span
          className="mt-3 inline-block px-3 py-1.5 font-bold uppercase"
          style={{ background: v("primary"), color: v("on-primary"), boxShadow: `3px 3px 0 ${v("accent")}` }}
        >
          Shop now
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {["55\" 4K Smart TV", "Front-load washer"].map((name, i) => (
          <div key={name} className="border border-black/10 p-2">
            <div className="relative h-10 bg-black/5">
              <span
                className="absolute top-1 left-1 px-1 font-bold"
                style={i === 0 ? { background: v("primary"), color: v("on-primary") } : { background: v("accent"), color: v("on-accent") }}
              >
                {i === 0 ? "-20%" : "NEW"}
              </span>
            </div>
            <p className="mt-1 font-bold">{name}</p>
            <p style={{ color: v("accent-ink") }}>★★★★★</p>
            <p className="font-black" style={{ color: v("primary-ink") }}>
              KES 49,999
            </p>
            <span className="mt-1 block py-1 text-center font-bold" style={{ background: v("secondary"), color: v("on-secondary") }}>
              ADD TO CART
            </span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2" style={{ background: v("secondary-deep"), color: v("on-secondary-faint") }}>
        © Shop · Footer
      </div>
    </div>
  );
}
