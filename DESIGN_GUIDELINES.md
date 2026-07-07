# Design Principles & UI Guidelines

This document outlines the strict design rules for the application to maintain a unified, professional, and mature visual language.

## 1. Visual Language: Solid & Elevated
- **No Glassmorphism:** Do not use `backdrop-blur` for heavy UI elements unless strictly necessary for OS-level overlays (like Modals). Keep backgrounds solid and predictable.
- **Clean Backgrounds:** Rely on subtle contrast between panels (`--bg-1`, `--bg`) and border definitions (`border-[var(--b)]`) rather than heavy shadows.

## 2. Component Primitives
- **Buttons:** 
  - Standard Height: Primary action buttons should use `h-14`.
  - Border Radius: Use `rounded-panel` (14px) or `rounded-control` (10px) depending on the context. Never use arbitrary values like `rounded-[2rem]`.
  - Typography: Button text should be standard case (NO CAPS / uppercase). Text size should typically be `text-sm` or `text-xs`.
- **Modals:**
  - Modals should slide up smoothly using consistent Framer Motion parameters.
  - Background overlay should be a standard semi-transparent black, without complex CSS blurs if performance is impacted.

## 3. Typography & Spacing
- **Font Sizes:** Stick to semantic Tailwind classes (`text-xs`, `text-sm`, `text-base`). Avoid arbitrary sizes (`text-[10px]`) unless mapped to a token like `text-micro`.
- **Text Styling:** Do not use `uppercase` for buttons or interactive elements to ensure legibility and professional tone. Uppercase can be used sparingly for small section headers (`text-micro`).
- **Spacing:** Use standard Tailwind spacing scales (`p-4`, `gap-2`, `mt-4`). Remove arbitrary margins and paddings.

## 4. Dos and Don'ts
- **DO** use the defined CSS variables (`--a`, `--t1`, `--bg`) for all colors.
- **DO** ensure touch targets are at least 44px on mobile (e.g., `h-14` is 56px, which is great).
- **DON'T** use emojis in the UI. Use standard vector icons (Lucide).
- **DON'T** introduce new random colors or arbitrary border radii.
