# Work Tracker Pro - GIO (Global Interface Operations)

This document contains the structural code, styles, and animation design rules extracted directly from the Work Tracker Pro app. It serves as a technical design reference.

## 1. Interaction: Swipe-to-Delete Action

The calendar log utilizes a sophisticated drag-to-reveal pattern with native physics provided by `framer-motion`:

```tsx
<div className="relative w-full overflow-hidden rounded-[1rem] bg-[var(--danger-bg)] mb-2 last:mb-0">
  {/* The Hidden Actions Layer */}
  <div className="absolute top-0 right-0 h-full w-[80px] flex items-center justify-end pr-5">
    <button 
      onClick={() => deleteAction()} 
      className="text-[var(--danger)] active:scale-90 transition-transform"
    >
      <Trash2 size={20} />
    </button>
  </div>
  
  {/* The Draggable Foreground Layer */}
  <motion.div
    drag="x"
    dragConstraints={{ left: -80, right: 0 }} // Maximum swipe distance
    dragElastic={0.1} // Resistance feel
    className="relative z-10 bg-[var(--bg-1)] flex items-center gap-4 p-3 rounded-[1rem] border border-[var(--b)] cursor-grab active:cursor-grabbing"
    style={{ willChange: "transform" }}
  >
    {/* Card Content... */}
  </motion.div>
</div>
```

## 2. Shared Element: Toggle Control

A custom-designed toggle button with spring physics to serve as an organic tactile switch.

```tsx
<button
  onClick={toggleAction}
  className={`w-14 h-8 rounded-full transition-colors flex items-center shrink-0 p-1 ${isActive ? 'bg-[var(--a)]' : 'bg-[var(--bg)] border border-[var(--b)]'}`}
>
  <motion.div
    animate={{ x: isActive ? 24 : 0 }}
    transition={{ type: "spring", stiffness: 500, damping: 30 }}
    className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center"
  >
    {/* Optional internal icon mapping */}
  </motion.div>
</button>
```

## 3. Typography Rules

*   **Primary Font Family:** **Epilogue**. We rely strictly on this display/editorial font for all structure (via Tailwind's universal `--font-sans`).
*   **Scale and Weight:**
    *   **Large headers** (e.g. Month text on the Home page): `text-4xl font-black tracking-tighter pr-2`. The `font-black` (900 weight) with `tracking-tighter` eliminates air inside words emphasizing the block structure.
    *   **Overlines & Tags**: `text-[8px]` or `text-[10px] font-bold uppercase tracking-widest text-[var(--t3)]`. Large word gaps, aggressive uppercase for meta-information.
    *   **Metrics / Numbers**: `font-black`.

## 4. Navigation Icons Animation

The bottom navigation items use independent physics. We animate multiple properties (`y`, `scale`) concurrently to create a "floating pill" effect when selected.

```tsx
<motion.button 
  onClick={() => setScreen('target')}
  whileTap={{ scale: 0.9 }}
  animate={{ 
    y: isActive ? -4 : 0, 
    scale: isActive ? 1.05 : 1 
  }}
  transition={{ 
    type: "spring", 
    stiffness: 400, 
    damping: 25 
  }}
  className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-[1.2rem] transition-colors ${
    isActive 
      ? 'bg-[var(--a)] text-[var(--bg)] shadow-lg' 
      : 'text-[var(--t2)] hover:bg-[var(--hover)] hover:text-[var(--t1)]'
  }`}
>
  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
</motion.button>
```

## 5. Layout and Shape Rules ("Air" / Spacing)

**Philosophy:** Ensure visual hierarchy inside tight boundaries while retaining enough negative space to minimize cognitive load. 

### Corner Radii
*   **Macro Container** (Phone frame simulation): `rounded-[45px]` outer edge.
*   **Cards / Major Sections:** `rounded-[2rem]` — used for large dashboard blocks and major statistic containers.
*   **Lists / Micro cards:** `rounded-[1rem]` – sub-elements and lists nest visually by possessing a halved radius property.
*   **Buttons / Input Arrays:** `rounded-full` (pills) for horizontal button groups or `rounded-[14px]`.

### Gaps and Whitespace ("Air")
*   **Card Paddings:** `p-6` or `p-8` is essential. Never drop under that for core structural data displays.
*   **Section Gaps:** Ensure gaps between cards are exactly `gap-6` (vertical spacing on main scroll views).
*   **Layout Safety boundaries:** Modals contain a distinct bottom padding layer `pb-12` or `pb-32` depending on overlap, accounting for fixed Navigation floating spaces.
*   **Colors / Fills:** The background utilizes `var(--bg)` while the foreground cards utilize `var(--bg-1)` combined with a subtle border `var(--b)`. The "air" is established not just by spacing, but by clear contrast limits.
