# Work Tracker Pro - Project Blueprint

## Overview
Work Tracker Pro is a mobile-first, single-page application (SPA) built with React. It allows users to track their work hours, calculate earnings based on hourly rates and overtime, and visualize their progress towards a monthly goal. The app features a clean, modern UI with smooth animations, local storage via IndexedDB, and cloud synchronization via Supabase.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS (with custom CSS variables for theming)
- **Animations:** Framer Motion (`motion/react`)
- **Icons:** Lucide React
- **Local Database:** IndexedDB (custom wrapper `WorkDB`)
- **Cloud Database:** Supabase (for syncing data)

## Data Models

### `Entry`
Represents a single day's work record.
```typescript
interface Entry {
  date: string;  // Format: YYYY-MM-DD
  hours: number; // Total hours worked that day
  month: string; // Format: YYYY-MM (used for indexing/filtering)
}
```

### `AppSettings`
Stores user preferences and configuration.
```typescript
interface AppSettings {
  currency: 'EUR' | 'RUB' | 'USD'; // Supported currencies
  language: 'ENG' | 'RUS' | 'GR';  // Supported languages
  rate: number;                    // Standard hourly rate
  overtime: number;                // Overtime hourly rate
  normal: number;                  // Threshold for normal hours before overtime applies
  goal: number;                    // Monthly earning goal
  bonus: number;                   // Additional bonus (not fully implemented in UI yet)
  deduction: number;               // Deductions (not fully implemented in UI yet)
  privacyMode: boolean;            // Blurs sensitive financial data
  e2eeEnabled: boolean;            // Enables End-to-End Encryption for cloud sync
  e2eeKey: string;                 // Key used for E2EE
  theme: 'light' | 'dark' | 'indigo'; // UI Theme
}
```

## Architecture & State Management
The application is contained within a single `App.tsx` file for simplicity in this environment, but is structured logically:

1.  **Global State:** Managed via React `useState` at the top level of `App`.
    -   `screen`: Current active view ('home', 'calendar', 'chart', 'total', 'settings').
    -   `entries`: Array of `Entry` objects loaded from IndexedDB.
    -   `settings`: `AppSettings` object.
    -   `viewDate`: Current month being viewed in the calendar.
2.  **Initialization:** `useEffect` hook initializes IndexedDB on mount, loads settings, and fetches entries for the current month.
3.  **Localization:** A custom `t(key: string)` function handles translations based on `settings.language`.
4.  **Theming:** CSS variables (`--bg`, `--t1`, `--a`, etc.) are updated dynamically by changing a `data-theme` attribute on the `document.documentElement`.

## Core Features & Components

### 1. Home Dashboard (`renderHome`)
-   Displays total hours and earnings for the current month.
-   Shows a progress bar towards the monthly financial goal.
-   Lists recent work entries.
-   Supports "Privacy Mode" to blur financial numbers.

### 2. Calendar (`renderCalendar`)
-   A grid view of the current month.
-   Allows users to tap a day to open the `EditorModal` and input hours.
-   **Quick Fill:** A tool to rapidly apply work patterns (e.g., 6 days on, 1 day off, 10 hours/day) to the entire month.

### 3. Chart/Trends (`renderChart`)
-   Visualizes daily hours and earnings using simple bar charts built with HTML/CSS.
-   Calculates averages and projected earnings for the month.

### 4. Settings (`renderSettings`)
-   **Salary Edit:** Configure hourly rate and monthly goal.
-   **Appearance & Language:** Toggle theme, language, and currency.
-   **Cloud Sync:** Connect to Supabase to backup and restore data.
-   **Privacy & Security:** Toggle Privacy Mode and E2EE.
-   **Data Management:** Export data to CSV or clear local database.

## Storage Strategy
-   **Primary:** IndexedDB is the source of truth for fast, offline-first access.
-   **Secondary:** Supabase is used for cloud backup. Data is synced manually or automatically (if configured). If E2EE is enabled, data is encrypted using AES-GCM before being sent to Supabase.

## Styling Guidelines
-   **Variables:** Colors are defined in `index.css` using CSS variables to support multiple themes easily.
    -   `--bg`: Background color.
    -   `--bg-1`: Secondary background (cards, panels).
    -   `--t1`: Primary text.
    -   `--t2`: Secondary text.
    -   `--t3`: Tertiary text (muted).
    -   `--b`: Border color.
    -   `--a`: Accent color (primary brand color).
-   **Typography:** Uses system fonts with a focus on tracking (letter-spacing) and uppercase for small labels to create a modern, technical feel.
-   **Layout:** Mobile-first design. Uses bottom navigation for easy thumb access.

## Future Expansion Ideas
-   Implement the "Total" view (currently a placeholder).
-   Add support for multiple jobs/projects.
-   Implement detailed bonus and deduction tracking.
-   Add more chart types (e.g., year-over-year comparison).
