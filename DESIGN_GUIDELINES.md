# Design Principles & UI Guidelines

This document outlines the strict design rules for the application to maintain a unified, professional, and mature visual language.

## 1. Visual Language: Quiet Instrument (Matte Cards + Floating Glass Chrome)
- **Cards stay solid matte (`--bg-1`):** Keep numeric displays, forms, and content panels solid with hairline borders (`border-[var(--b)]`) for high daylight legibility.
- **Selective Frosted Glass (`src/index.css`):** Restrict backdrop blur to floating shell chrome (`.apple-glass-bar`, `.apple-glass-dock`, `.apple-glass-panel`, `.apple-glass-pill`). Always write `-webkit-backdrop-filter` before `backdrop-filter` so LightningCSS keeps both.

## 2. Component Primitives
- **Buttons:** 
  - Standard Height: Primary standalone action buttons use `h-14` (`56px`). Paired compact toolbar controls (e.g., Calendar `Smart Fill` / `Quick Fill` / `complete`) use `h-12` (`48px`, exceeding the `44px` minimum mobile touch target so they clear the floating dock without scrolling on `393×667`).
  - Border Radius (Concentric Squircle + Pill): Use `@theme` tokens from `src/index.css` (`rounded-shell` `28px` for primary calendar shell, `rounded-card` `24px`, `rounded-panel` `14px`, `rounded-control` `10px`), standard Tailwind `rounded-2xl` (`16px` for Calendar day cells and `h-12` toolbar buttons), and `rounded-full` (circular `< >` navigation arrows, header pills, dock) without arbitrary `rounded-[...]`.
  - Typography: Button text should be standard case (NO CAPS / uppercase), typically `text-sm` or `text-xs` (`font-semibold` on compact `h-12` toolbar actions).
- **Modals:**
  - Modals should slide up smoothly using consistent Framer Motion parameters.
  - Background overlay should be a standard semi-transparent black, without complex CSS blurs if performance is impacted.

## 3. Calendar Standards
- **Header & Navigation:** Keep `Epilogue Variable` for month titles with `+5%` tracking (`tracking-[0.05em]`), `DAYS` KPI badge using `rounded-panel`, and circular `<` / `>` navigation buttons (`rounded-full`).
- **Compact Vertical Rhythm:** `space-y-4` container gap, `p-4 sm:p-5` calendar card padding, `pb-1 mb-1.5` hint spacing, and `gap-y-2.5` grid rows.
- **Weekend Semantics:** Saturdays use theme gold/accent (`var(--a)`, `hover:bg-[var(--a-bg)]`); Sundays use calm neutral gray (`var(--t3)`). Never color rest-day Sundays with `--danger` (reserve `--danger` strictly for destructive actions and validation errors).

## 4. Typography & Spacing
- **Font Sizes:** Stick to semantic Tailwind classes (`text-xs`, `text-sm`, `text-base`). Avoid arbitrary sizes (`text-[10px]`) unless mapped to a token like `text-micro`.
- **Text Styling:** Do not use `uppercase` for buttons or interactive elements to ensure legibility and professional tone. Uppercase can be used sparingly for small section headers (`text-micro`).
- **Spacing:** Use standard Tailwind spacing scales (`p-4`, `gap-2`, `mt-4`). Remove arbitrary margins and paddings.

## 5. Dos and Don'ts
- **DO** use the defined CSS variables (`--a`, `--t1`, `--bg`) for all colors.
- **DO** ensure touch targets are at least 44px on mobile (`h-12` is `48px`, `h-14` is `56px`).
- **DON'T** use emojis in the UI. Use standard vector icons (Lucide).
- **DON'T** introduce new random colors or arbitrary border radii.
