# 🚀 Work Tracker Pro - Project Architecture & Checkpoint

## 📖 Overview
**Work Tracker Pro** is a premium, offline-first time and earnings tracking application designed for freelancers and shift workers. It emphasizes a native-like, fluid user experience with high-end micro-interactions, haptic feedback, and a sleek, modern visual design.

---

## 🏗️ Architecture & Tech Stack

### 📱 Frontend
*   **Framework:** React 18 + TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (utility-first, responsive, dark-mode native)
*   **Animations:** Framer Motion (page transitions, gesture-driven interactions, shared layout animations)
*   **Data Visualization:** Recharts (responsive, zoomable bar charts with custom tooltips)
*   **Icons:** Lucide React

### 🗄️ Data Layer (Offline-First)
*   **Database:** IndexedDB (via custom `db` wrapper). Ensures 100% offline availability, immediate read/writes, and absolute privacy.
*   **State Management:** React local state (`useState`, `useEffect`) and prop drilling for current scope. Optimized with selective rendering.
*   **Storage Constraints:** Data is kept locally on the user's device until explicitly exported or synced.

### ⚙️ Integrations & APIs
*   **Export/Sharing Engine:** PDF generation, CSV/TXT formatting, `.ics` Calendar event generation.
*   **Platform Integrations:** Telegram sharing via Deep Links (`tg://msg` / `https://t.me/share`).
*   **Haptics:** Native Vibration API (`navigator.vibrate`) abstracted into a reliable `haptic()` fallback utility.

---

## 🎨 Design System & UI/UX

**Philosophy:** *Absolute Premium & Fluidity.* No generic components—everything is custom-crafted to feel like a high-end iOS/Android native app.

*   **Color Palette:** Dynamic CSS variables adaptive to 3 themes (`light`, `dark`, `indigo`). Uses a tiered monochrome scale (`--bg`, `--bg-1`, `--b`) with a calculated accent color (`--a`).
*   **Typography:** System fonts prioritizing legibility and strict hierarchy. Heavy use of `tracking-widest` for uppercase micro-labels and `font-black` for numbers.
*   **Premium Effects:**
    *   **The Gemini Gradient:** A custom animated fluid gradient applied to the logo text simulating continuous polish and AI-like intelligence.
    *   **Glassmorphism:** Contextual blur (`backdrop-blur`) on floating UI elements (like the "Reset Zoom" button).
    *   **Shadows:** Colored, glowing drop-shadows on active interactive elements (`shadow-[var(--a)]`).
*   **Layout:** Carousel-based swiping between main modules (Home, Calendar, Analytics, Settings) keeping the user inside a single, uninterrupted context.

---

## 🧩 Core Modules & Components

1.  **`App.tsx` (Application Shell):**
    *   Manages overarching state (current view, settings, entries, theme).
    *   Coordinates the top navigation bar, bottom tab bar, and smooth slide-transitions between screens.
2.  **`HomeScreen.tsx`:**
    *   Fast entry widget (Quick Add via tap or template).
    *   Summary blocks (Week, Month) and "Recent Entries".
3.  **`CalendarScreen.tsx`:**
    *   The "Single Source of Truth" for data management.
    *   Multi-select gesture for batch operations. Batch deletion, editing, and day-inspection.
4.  **`AnalyticsScreen.tsx` & `TotalScreen.tsx`:**
    *   Intelligent summarization (Insights).
    *   Zoomable, panable interactive Bar Chart (`AnalyticsChart.tsx`).
    *   Activity Map with dynamic horizontal scroll.
    *   Annual overall summary logic isolated in `TotalScreen.tsx`.
5.  **`SettingsScreen.tsx`:**
    *   Goal setting, hourly rate, currency symbol configuration.
6.  **Extracted Modals & UI (`QuickFillModal.tsx`, `EditorModal.tsx`, `Toasts.tsx`):**
    *   Keeps `App.tsx` lightweight. Contextual popups for data entry and feedback.
7.  **Custom Hooks (`useDataExport.ts`, `useSupabaseSync.ts`):**
    *   Decoupled heavy logic (exporting PDF/CSV/TXT/ICS, syncing with Supabase) from the main rendering cycle.

---

## 🗺️ Development Phases

*   [x] **Phase 1: Core Mechanics:** Basic time tracking, local indexedDB storage, simple calendar UI.
*   [x] **Phase 2: UX Overhaul & Metrics:** Framer Motion integration, deep custom styling, earnings calculations.
*   [x] **Phase 3: Deep Analytics & Visuals:** Recharts integration, Activity Map, AI-like mock insights, pinch-to-zoom.
*   [x] **Phase 4: Premium Polish & Exportability:** PDF/CSV/ICS exports, Telegram integration.
*   [x] **Phase 5: Refactoring & Isolation:** Splitting `App.tsx` into modular hooks and micro-components to prevent LLM context-loss.
*   [x] **Phase 6: Cloud Sync:** Supabase integration for optional cross-device syncing, preserving local-first speed.

---

## 📝 Checkpoint Context & LLM Guidelines (April 2026)

**Adopted Coding Philosophy (Karpathy Principles):**
1.  **Simplicity First:** Minimal code. No speculative abstractions. If it can be 50 lines instead of 200, make it 50.
2.  **Surgical Changes:** Touch only what must be changed to fulfill the prompt. Do not reformat adjacent code. Clean up only the dead code created by *current* changes.
3.  **Goal-Driven:** Define strict success criteria before looping. Make verifiable, testable changes.

**Recent Resolves to preserve in context:**
1.  **Massive Refactoring:** `App.tsx` was reduced drastically by isolating `QuickFillModal`, `EditorModal`, `Toasts`, `TotalScreen` and moving logic to `useDataExport.ts` and `useSupabaseSync.ts`.
2.  **Activity Map Alignment:** Fixed using `dir="rtl"` scrolling container with `dir="ltr"` inner block to natural-align.
3.  **Chart Zooming:** Pinch-to-zoom and scroll-to-zoom in `AnalyticsChart.tsx` with floating Reset button.

*Context saved. Ready for modular, focused updates moving forward.*
