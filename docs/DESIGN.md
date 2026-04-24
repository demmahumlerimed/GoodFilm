# Design System: GoodFilm

**Project:** GoodFilm — Personal Cinema Library  
**Theme:** Dark Cinematic Luxury  
**Mode:** Dark-only

---

## 1. Visual Theme & Atmosphere

**Tone:** Deep-space noir with warm editorial gold — the visual language of a private film archive. Every surface feels like the inside of a cinema: dark, enveloping, and purposeful. Negative space is generous; the design breathes. Nothing competes with the content.

**Mood keywords:** Cinematic · Hushed · Warm authority · Collector's pride · Editorial restraint

**Character:** The UI recedes so posters and stills can breathe. Gold is used sparingly — always as a focal point, never wallpaper. Typography contrasts bold-black weight headings with whisper-thin meta text.

---

## 2. Color Palette & Roles

| Name | Hex | Role |
|---|---|---|
| **Void Black** | `#04070b` | Page canvas / body background |
| **Ink Well** | `#07080d` | Card surfaces, overlays, sticky bars |
| **Carbon Glass** | `#0d0f14` | Elevated surfaces, drawers, modals |
| **Cinema Gold** | `#efb43f` | Primary accent — CTAs, active states, bookmarks |
| **Ember Amber** | `#c97a0a` | Gold gradient terminus, hover deepening |
| **Live Cyan** | `#22d3ee` | "Watching" status — signals active consumption |
| **Waiting Amber** | `#fbbf24` | "Waiting" status — anticipation |
| **Seen Emerald** | `#10b981` | "Watched" status — completion |
| **Lunar White** | `rgba(255,255,255,0.85)` | Primary text |
| **Dusk White** | `rgba(255,255,255,0.40)` | Secondary / meta text |
| **Ghost White** | `rgba(255,255,255,0.10)` | Borders, dividers, inactive states |

---

## 3. Typography Rules

**Typeface:** Inter (system fallback). Body and UI text only — no decorative type.

**Weight philosophy:**  
- `font-black` (900) for headings, section labels, and all-caps identifiers — maximum visual authority  
- `font-bold` (700) for card titles, active tab labels  
- `font-semibold` (600) for button text, badge labels  
- `font-medium` (500) for meta rows, secondary info  
- `font-normal` (400) never used for UI chrome

**Tracking (letter-spacing) system:**
- Negative tracking `tracking-[-0.04em]` to `tracking-[-0.02em]` — large headings feel compressed and premium  
- Zero tracking for body text  
- Positive `tracking-[0.10em]` to `tracking-[0.20em]` — ALL CAPS section labels, status chips, category filters

**Size scale (used in practice):**  
`9px` meta → `10px` badges → `11px` secondary labels → `12px` supporting text → `13px` body → `14px` subheadings → `18–26px` section headings → `30–34px` page titles

---

## 4. Component Stylings

### Section Headings
Two horizontal rules bracket the title: a short `w-7` rule above in `from-[#efb43f]`, the title itself in `font-black` with `tracking-[-0.025em]`, and a `w-10` rule below at `25%` gold opacity. A long fading rule extends rightward. The whole block uses `whileInView` to animate in from below.

### Status Badges (non-compact)
`rounded-[5px]` (slightly squared, not pill) with a `2px inset left box-shadow` in the status color — creating an embedded left-border accent without extra DOM nodes. Background at `10%` opacity of the status color. Border at `22%` opacity.

- **Watching:** Cyan palette + pulsing live dot (ping animation) — signals real-time consumption  
- **Watchlist:** Gold palette — desire and intention  
- **Waiting:** Amber palette — anticipation  
- **Watched:** White/neutral palette — archival completeness

### Grid Cards (Library View)
`aspect-[2/3]` poster proportion. `rounded-[12px]` — gently curved, never pill-shaped. Status ring via `ring-1 ring-inset` at `28%–32%` opacity. On hover: 3D perspective tilt tracking cursor (8° max), overlay with dark scrim and solid action buttons. Status colored top or bottom strip for visual reinforcement.

### List Rows (Library List View)
Full-width rows with `rounded-[10px]`. Left status strip always visible at `18%` opacity, brightening to `75%` on hover. On hover: action buttons slide in from right with `translateX(8px → 0)`. Ambient left-gradient glow in status color.

### Rail / Horizontal Scroll
`snap-x` horizontal scroll. Scroll arrow buttons appear on desktop (`-left-4`, `-right-4`). Right edge fades to background on mobile to hint at more content.

### Poster Cards (Browse / Home)
`aspect-[16/9]` landscape. Colored glow from poster's dominant color on hover. Logo overlay in bottom-left. Bookmark + watch buttons top-right, visible on hover on desktop.

### Continue Watching Cards
Progress bar with animated shimmer sweep (`translateX(-100% → 300%)`). The bar uses the Cinema Gold palette with lighter gradient terminus.

### Buttons (primary)
`bg-[#efb43f]` solid gold, `text-black` — maximum contrast. `rounded-[9px]`. `font-bold`. Shadow: `0 2px 10px rgba(239,180,63,0.3)`.

### Buttons (secondary)
`border border-white/10 bg-white/[0.05]` — ghost treatment. Hover lifts to `bg-white/[0.09]`.

---

## 5. Layout Principles

**Spacing rhythm:** `8px` base unit. Vertical padding between sections is `pt-5` to `pt-8`. Section headers have `mb-4` to `mb-6`.

**Negative space:** Generous. Cards in grid view have `gap-2.5`. List rows have zero gap, relying on hover states to define separation.

**Content bleed:** Full-bleed header zones use negative horizontal margin (`-mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14`) to break out of the container and span edge to edge.

**Sticky elements:** Control bars `sticky top-16 z-30` with `backdrop-blur-xl` and `bg-[#07080d]/95`.

**Motion timing function:** `[0.22, 1, 0.36, 1]` — fast start, organic deceleration. Feels physical, not robotic.

**Grid columns (library):** 2 → 3 → 4 → 5 → 6 → 7 across breakpoints.

---

## 6. Animation Design Language

| Interaction | Technique | Feel |
|---|---|---|
| Section enter | `whileInView` y-lift 8px, 450ms | Elegant reveal |
| Tab switch | Framer `layoutId` spring underline | Snappy, physical |
| Card hover | Scale 1.02, y –5px | Lifted depth |
| Status badge "watching" | Ping-pulse live dot | Live broadcast |
| Progress bar | Sweep shimmer, 2.4s loop | Alive, in motion |
| List rows | Stagger x-slide 8px, 30ms apart | Cascade refinement |
| Grid card | Perspective tilt tracking cursor, 8° max | Tactile, premium |
| Random pick reveal | Height + opacity spring | Cinematic reveal |
| Modal open | Scale from 0.97, 500ms | Depth and weight |
