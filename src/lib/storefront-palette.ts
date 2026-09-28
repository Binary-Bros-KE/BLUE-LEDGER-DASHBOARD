// EXACT COPY of NEXT/storefront/src/lib/palette.ts — the admin look preview must derive shades
// identically to the live storefront. Edit there, then re-copy this file verbatim.

// The standard colour system every storefront template shares.
//
// An admin picks at most THREE brand colours per store (web_stores.themeColorsJson):
//   primary   — the action colour: buttons, links, prices, highlights
//   secondary — the DARK structural colour: header/footer/hero bands, heading ink
//   accent    — the pop colour: badges, stars, countdowns, CTA shadows, hover states
// Everything else (hover shades, tints, text-on-colour, readable-on-white variants) is DERIVED here,
// so no admin choice can produce unreadable text and every template draws from the same token set.
//
// Output is a flat map of `--brand-*` CSS custom properties, applied to <html> in app/layout.tsx.
// globals.css maps them onto Tailwind colour utilities (bg-primary, text-on-secondary, …).
//
// Mirrored in NEXT/admin src/lib/storefront-templates.ts (for the live preview) — keep in sync.

export const COLOR_ROLES = ["primary", "secondary", "accent"] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];
export type BrandColors = Record<ColorRole, string>;
export type ColorOverrides = Partial<BrandColors>;

type Rgb = [number, number, number];

const HEX = /^#?([0-9a-f]{6})$/i;

export function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v.trim());
}

function parse(hex: string): Rgb {
  const m = HEX.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** `amount` of `b` mixed into `a` (0 = a, 1 = b), in sRGB — predictable for UI shades. */
export function mix(a: string, b: string, amount: number): string {
  const x = parse(a);
  const y = parse(b);
  return hex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb);
}

/** WCAG relative luminance. */
export function luminance(color: string): number {
  const [r, g, b] = parse(color).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const WHITE = "#ffffff";
const BLACK = "#000000";
/** Dark text used on light brand colours — near-black, never pure black. */
const DARK_TEXT = "#141414";

/** Darkens `color` just enough to reach `ratio` against `bg` (returns it unchanged if it already
 * does). Used for "this brand colour as text on white" — a yellow accent becomes a readable
 * mustard, a mid red stays itself. */
export function darkenToContrast(color: string, bg: string, ratio: number): string {
  let c = color;
  for (let i = 0; i < 20 && contrast(c, bg) < ratio; i++) c = mix(c, BLACK, 0.08);
  return c;
}

/** White or near-black for text on `bg`. White whenever it passes AA (4.5:1) — branded buttons with
 * white labels look more "designed" than dark ones — otherwise whichever of the two reads better. */
export function readableOn(bg: string): string {
  const w = contrast(WHITE, bg);
  return w >= 4.5 || w >= contrast(DARK_TEXT, bg) ? WHITE : DARK_TEXT;
}

// ─── Derivation ──────────────────────────────────────────────────────────────────────────────────
// One function per role, each returning that role's full token group. Templates must only ever use
// these tokens (via the Tailwind names in globals.css), never a raw hex — that's what makes a
// template re-colourable.

function primaryTokens(p: string): Record<string, string> {
  const on = readableOn(p);
  return {
    "--brand-primary": p,
    "--brand-primary-hover": mix(p, BLACK, 0.16),
    "--brand-primary-soft": mix(WHITE, p, 0.1),
    "--brand-primary-ink": darkenToContrast(p, WHITE, 4.5),
    "--brand-on-primary": on,
    "--brand-on-primary-muted": mix(on, p, 0.25),
    "--brand-on-primary-soft": mix(on, p, 0.15),
  };
}

function secondaryTokens(input: string): Record<string, string> {
  // Secondary is BOTH heading/body ink on white AND the ground for light text (header, footer, hero)
  // in every template, so it is forced deep enough for both: ≥ 10:1 against white leaves its own
  // light text tiers ≥ 4.5:1 on it. A too-light pick is deepened, never rejected — the admin preview
  // shows the effective colour.
  const s = darkenToContrast(input, WHITE, 10);
  const on = mix(WHITE, s, 0.06);
  return {
    "--brand-secondary": s,
    "--brand-secondary-deep": mix(s, BLACK, 0.45),
    "--brand-secondary-raised": mix(s, WHITE, 0.09),
    "--brand-secondary-raised-2": mix(s, WHITE, 0.16),
    "--brand-secondary-muted": mix(s, "#a8a8a8", 0.5),
    "--brand-secondary-faint": mix(s, WHITE, 0.5),
    "--brand-on-secondary": on,
    "--brand-on-secondary-soft": mix(WHITE, s, 0.22),
    "--brand-on-secondary-body": mix(WHITE, s, 0.3),
    "--brand-on-secondary-meta": mix(WHITE, s, 0.34),
    "--brand-on-secondary-faint": mix(WHITE, s, 0.62),
  };
}

function accentTokens(a: string): Record<string, string> {
  const ink = darkenToContrast(a, WHITE, 4.5);
  return {
    "--brand-accent": a,
    "--brand-accent-hover": mix(a, BLACK, 0.12),
    "--brand-accent-soft": mix(WHITE, a, 0.14),
    "--brand-accent-ink": ink,
    "--brand-accent-ink-deep": mix(ink, BLACK, 0.12),
    "--brand-on-accent": readableOn(a),
    // a stand-out link on the accent ground (Classic: the red "All products" on the amber ribbon)
    "--brand-on-accent-emphasis": readableOn(a),
  };
}

const DERIVE: Record<ColorRole, (c: string) => Record<string, string>> = {
  primary: primaryTokens,
  secondary: secondaryTokens,
  accent: accentTokens,
};

/** Every --brand-* var a role produces — used by tests and the admin preview. */
export function deriveRole(role: ColorRole, color: string): Record<string, string> {
  return DERIVE[role](color.toLowerCase());
}

/**
 * The CSS custom properties to put on <html> for this store.
 *
 * `pinned` templates (Classic) ship exact, hand-tuned token values in globals.css — the derived
 * formulas only approximate those — so for them we emit ONLY the groups the admin actually
 * overrode; an untouched store renders pixel-identical to before. Unpinned templates are defined
 * purely by their three defaults, so every group is always emitted.
 */
export function brandCssVars(
  defaults: BrandColors,
  overrides: ColorOverrides,
  pinned: boolean,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const role of COLOR_ROLES) {
    const override = isHex(overrides[role]) ? overrides[role]!.toLowerCase() : null;
    if (pinned && !override) continue;
    Object.assign(out, deriveRole(role, override ?? defaults[role]));
  }
  return out;
}

/** Defensive read of the `colors` blob from GET /shop/store. */
export function parseColors(raw: unknown): ColorOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: ColorOverrides = {};
  for (const role of COLOR_ROLES) {
    const v = o[role];
    if (isHex(v)) out[role] = (v.startsWith("#") ? v : `#${v}`).toLowerCase();
  }
  return out;
}
