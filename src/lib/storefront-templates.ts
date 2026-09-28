// Storefront templates the admin can put a shop on, and colour presets for the picker.
// Mirrors SERVER src/lib/storefront-templates.ts (the allow-list) and NEXT/storefront
// src/templates/registry.ts (the renderers) — a template must exist in all three.

import type { BrandColors, ColorRole } from "./storefront-palette";

export type StorefrontTemplateInfo = {
  id: string;
  name: string;
  description: string;
  /** the template's own colours — what an un-overridden role renders as */
  colorDefaults: BrandColors;
  /** what each colour role actually paints in THIS template (the picker's help text) */
  roleHelp: Record<ColorRole, string>;
};

export const STOREFRONT_TEMPLATES: StorefrontTemplateInfo[] = [
  {
    id: "classic",
    name: "Classic",
    description:
      "Bold engineering-grid look with square corners and hard offset shadows. Built for Trylist — suits tech, hardware and B2B catalogues.",
    colorDefaults: { primary: "#2f55e8", secondary: "#141a47", accent: "#f5b21a" },
    roleHelp: {
      primary: "Buttons, cart, links, the 'new' badge",
      secondary: "Top bar, hero, footer, headings and body text",
      accent: "Category ribbon, CTA shadows, highlights, stars",
    },
  },
];

export const DEFAULT_TEMPLATE_ID = "classic";

export function templateInfo(id: string | null | undefined): StorefrontTemplateInfo {
  return STOREFRONT_TEMPLATES.find((t) => t.id === id) ?? STOREFRONT_TEMPLATES[0];
}

export const ROLE_LABEL: Record<ColorRole, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
};

/** Quick picks per role. Secondary presets are all deep — it doubles as text and dark bands. */
export const COLOR_PRESETS: Record<ColorRole, { name: string; hex: string }[]> = {
  primary: [
    { name: "Royal blue", hex: "#2f55e8" },
    { name: "Signal red", hex: "#d71920" },
    { name: "Emerald", hex: "#0f9d58" },
    { name: "Orange", hex: "#f36c21" },
    { name: "Purple", hex: "#6d28d9" },
    { name: "Teal", hex: "#0e8a8a" },
    { name: "Pink", hex: "#d6246e" },
    { name: "Charcoal", hex: "#27272a" },
  ],
  secondary: [
    { name: "Navy", hex: "#141a47" },
    { name: "Charcoal", hex: "#1b1b1f" },
    { name: "Forest", hex: "#0f2e22" },
    { name: "Maroon", hex: "#3b0d12" },
    { name: "Deep teal", hex: "#0b2e33" },
    { name: "Aubergine", hex: "#2a1433" },
    { name: "Espresso", hex: "#2b1d14" },
    { name: "Slate", hex: "#1e293b" },
  ],
  accent: [
    { name: "Amber", hex: "#f5b21a" },
    { name: "Sun yellow", hex: "#ffd400" },
    { name: "Tangerine", hex: "#ff8a00" },
    { name: "Lime", hex: "#a3e635" },
    { name: "Sky", hex: "#38bdf8" },
    { name: "Coral", hex: "#ff6b5b" },
    { name: "Mint", hex: "#34d399" },
    { name: "Red", hex: "#e11d2a" },
  ],
};
