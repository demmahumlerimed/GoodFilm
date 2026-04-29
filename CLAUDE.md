# GoodFilm — Project Memory & Coding Standards

## Ignore (never read these — token waste)

```
node_modules/
dist/
.clone/
graphify-out/
design-md/
mnt/
.claude/worktrees/
tsconfig.tsbuildinfo
*.graphify_chunk_files_*.txt
screen_*.png
src/App old.tsx
src/App.tsx.test
```

---

## Project at a Glance

**GoodFilm** is a React SPA for discovering, tracking, and streaming movies & TV shows.
Deployed on **Vercel** as an SPA (vercel.json rewrites everything to `/index.html`).

- **Stack**: React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3.4
- **Animations**: Framer Motion 12
- **Icons**: Lucide React 0.542
- **Routing**: React Router DOM 7 (BrowserRouter → AppRouter → App.tsx)
- **Backend**: Supabase (auth + cloud library sync)
- **AI**: Google Gemini 2.0 Flash (Mood page natural-language → TMDB params)
- **Data APIs**: TMDB (primary), OMDB, IMDb API (imdbapi.dev), TVMaze, Letterboxd proxy

---

## Source Structure

```
src/
├── App.tsx                    # ~8 000-line monolith — all tab state & logic lives here
├── AppRouter.tsx              # thin wrapper: Route path="*" → App
├── main.tsx                   # ReactDOM.createRoot + BrowserRouter
├── config.ts                  # ALL env vars & base URLs — import from here, never from import.meta.env directly
├── index.css                  # Velvet Cinema theme vars + global styles
├── types/index.ts             # ALL shared TypeScript types — single source of truth
│
├── components/
│   ├── auth/        AuthModal.tsx
│   ├── catalog/     CatalogCards.tsx
│   ├── layout/      AppShell · GoodFilmFooter · MobileBottomNav · MobileTopBar · SettingsPanel · TopPillNav
│   ├── library/     ListsView · MyListView
│   ├── media/       Hero · PersonModal · PosterCard
│   ├── mobile/      MobileDetailPanel · MobileHome · MobileWatchPage
│   ├── modals/      WatchModal
│   ├── mood/        MoodBrowse
│   └── ui/          AnimatedIcons
│
├── services/
│   ├── tmdb.ts              # TMDB fetch with in-memory cache (1 min search / 5 min rest)
│   ├── supabase.ts          # Supabase client singleton + cloud sync helpers
│   ├── gemini.ts            # Gemini AI: natural language → GeminiMoodParams
│   ├── omdb.ts              # OMDB ratings enrichment
│   ├── letterboxdPublic.ts  # Letterboxd public data (via /api/letterboxd Vercel proxy)
│   ├── mediaEnrichment.ts   # Aggregates TMDB + OMDB + IMDb into enriched detail
│   └── apiSources.js        # Streaming embed URL helpers (JS, not TS)
│
├── hooks/
│   ├── useIsMobile.ts       # ≤768 px → true
│   ├── useAutoToggle.ts
│   └── useDebouncedValue.ts
│
├── constants/
│   ├── servers.ts           # SERVERS[] — 12 streaming embed configs (ServerConfig type)
│   └── quotes.ts
│
├── utils/
│   ├── cn.ts                # Tailwind class merging helper
│   ├── format.ts            # Date / runtime / number formatters
│   ├── library.ts           # getTitle() · getYear() · sanitizeLibrary() etc.
│   ├── storage.ts           # localStorage read/write wrappers
│   ├── auth.ts              # Auth helpers
│   └── i18n.ts              # Locale strings (currently "en" only)
│
└── pages/
    └── MediaDetail.tsx
```

---

## Navigation / Tab System

Internal routing is **state-based inside App.tsx** — not URL-based.

```ts
type Tab = "home" | "movies" | "series" | "anime" | "mood"
         | "mylist" | "lists" | "watchlist" | "watched" | "profile";
```

- Desktop: `TopPillNav` (pill background for active tab)
- Mobile: `MobileBottomNav` (bottom bar) + `MobileTopBar`
- Mobile detail view: `MobileDetailPanel` (replaces modal on small screens)
- Mobile player: `MobileWatchPage` (inline page, not overlay — avoids iOS fullscreen bug)
- Desktop player: `WatchModal` (fixed overlay)

---

## Design System — Velvet Cinema

### CSS Custom Properties (defined in `index.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `--gf-bg-deep` | `#080604` | Page background |
| `--gf-bg-surface` | `#0f0c09` | Cards, panels |
| `--gf-bg-elevated` | `#181410` | Modals, popovers |
| `--gf-bg-card` | `#1e1a15` | Card hover state |
| `--gf-amber` | `#e8a020` | Primary accent |
| `--gf-amber-deep` | `#c47a0c` | Gradient accent |
| `--gf-amber-glow` | `rgba(232,160,32,.20)` | Glow effects |
| `--gf-amber-subtle` | `rgba(232,160,32,.07)` | Subtle tints |
| `--gf-cream` | `#ede8de` | Primary text |
| `--gf-text-muted` | `#9a8e7a` | Secondary text |
| `--gf-text-dim` | `#5a5045` | Placeholders, labels |
| `--gf-border` | `rgba(255,240,210,.06)` | Default borders |
| `--gf-border-strong` | `rgba(255,240,210,.10)` | Emphasized borders |

Legacy aliases still in use: `--gf-purple-deep`, `--gf-gold`, `--gf-silver`, `--gf-lavender` — these map to the amber/cream tokens above.

### Typography

```js
// tailwind.config.js
fontFamily: {
  display: ['Syne', 'system-ui'],          // headlines, nav labels
  body:    ['Plus Jakarta Sans', 'DM Sans'], // body copy, UI text
  serif:   ['Instrument Serif', 'Georgia'], // editorial, section headings
}
```

Fonts are loaded via Google Fonts in `index.html`.

### Tailwind Animations

Custom keyframes defined in `tailwind.config.js`:

| Class | Duration | Purpose |
|-------|----------|---------|
| `animate-shimmer` | 1.8s | Loading shimmer on cards |
| `animate-skeleton` | 1.8s | Skeleton loader wave |
| `animate-sweep` | 2.4s | Shine across progress bar |
| `animate-live-pulse` | 1.6s | Live broadcast dot |
| `animate-slide-in` | 0.35s | List item entrance |
| `animate-fade-up` | 0.5s | Page/section entrance |
| `animate-glow-pulse` | 2.4s | Amber glow on accent elements |

### Apple HIG — Mobile Touch Targets

Minimum **44×44 pt** touch targets on all interactive mobile elements.
Minimum **11px** text size on all mobile UI. No exceptions.
Season chips, episode cards, and cast cards must conform.

---

## Environment Variables

All vars read via `src/config.ts` → `requireEnv()`. Never access `import.meta.env` directly in components.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_TMDB_API_KEY` | Yes | TMDB API key (or use bearer) |
| `VITE_TMDB_BEARER` | Optional | TMDB v4 bearer token (preferred over key) |
| `VITE_OMDB_API_KEY` | Yes | OMDB ratings |
| `VITE_SUPABASE_URL` | Yes (cloud) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes (cloud) | Supabase anon key |
| `VITE_GEMINI_API_KEY` | Yes (mood) | Google Gemini 2.0 Flash |

App degrades gracefully when vars are missing — check `HAS_SUPABASE` before cloud ops.

---

## Data Layer

### TMDB Cache (`src/services/tmdb.ts`)

In-memory `Map` cache — **not** persisted across page loads.
- Search endpoints: 1-minute TTL
- Everything else: 5-minute TTL
- Max 200 entries (evicts oldest 50 when exceeded)
- Use `tmdbFetch<T>(path, params)` for all TMDB calls.

### Supabase (`src/services/supabase.ts`)

- Singleton client: `supabase` (null when env vars missing)
- Table: `goodfilm_libraries` (user_id, email, library jsonb, updated_at)
- RLS enabled — users can only read/write their own row
- `_cloudTableUnavailable` flag prevents repeated failed calls when table is missing

### Local Storage Keys

| Key | Purpose |
|-----|---------|
| `goodfilm_library` | Main UserLibrary JSON |
| `goodfilm_backup` | Auto-backup before destructive ops |
| `goodfilm_library_meta` | Metadata (last sync, version) |
| `goodfilm_profile` | UserProfile JSON |

### Streaming Servers (`src/constants/servers.ts`)

12 embed servers configured as `ServerConfig[]`. Each has `key`, `label`, and `buildUrl({ type, tmdbId, season?, episode? })`. CSP in `vercel.json` whitelists the allowed frame-src domains.

---

## Core Types (all in `src/types/index.ts`)

```ts
MediaItem       // TMDB list item (id, title/name, poster_path, genre_ids…)
DetailData      // Full detail page data (credits, seasons, runtime…)
LibraryItem     // Stored in UserLibrary lists
UserLibrary     // { watchlist, watchingItems, waitingItems, watched, ratings, watching, notes, customLists, followedPeople, movieProgress }
WatchingProgress // Per-show episode tracking by season
MovieWatchEntry  // Continue Watching for movies
UserProfile     // { username, avatarUrl, memberSince, bio, privacy }
CloudUser       // { id, email, provider: "supabase" }
ServerConfig    // Streaming embed server definition
GeminiMoodParams // AI mood → TMDB /discover params
```

---

## Coding Standards

### TypeScript
- All new files must be `.tsx` / `.ts` — no new `.js` files (apiSources.js is legacy)
- All public function signatures must be fully typed
- Use `type` over `interface` (project convention)
- Import types with `import type { … }`
- No `any` — use `unknown` and narrow

### React
- Functional components only, no class components
- Keep components under 500 lines — if larger, extract sub-components
- `App.tsx` is an **intentional monolith** — do not refactor it without explicit instruction
- Use `cn()` from `src/utils/cn.ts` for conditional Tailwind classes
- Never inline `style={{ }}` for colors/spacing that Tailwind covers
- Framer Motion for all enter/exit animations — do not use CSS transitions on new components

### Styling
- Use CSS vars (`--gf-*`) for all theme colors — never hardcode hex values in components
- Tailwind utility classes first; CSS vars via `style` prop only when Tailwind can't express it
- `text-[var(--gf-cream)]` pattern is acceptable
- Background vignette and film grain are in `body` styles — do not re-add in components

### Services
- All TMDB calls through `tmdbFetch<T>()` — never raw `fetch` to TMDB
- All env access through `src/config.ts` exports
- Supabase ops must check `supabase !== null` and `!_cloudTableUnavailable` before calling

### Mobile vs Desktop
- `useIsMobile()` hook (≤768px) gates mobile-specific rendering
- Mobile: `MobileWatchPage` (inline page route) — not `WatchModal`
- Desktop: `WatchModal` (fixed overlay)
- All mobile touch targets ≥ 44×44px, text ≥ 11px (Apple HIG)

---

## Build & Dev

```bash
npm run dev        # Vite dev server — proxy /api/trakt → trakt.tv
npm run build      # tsc -b && vite build
npm run preview    # serve dist/
```

### Build Output (dist/)
Manual chunks configured in `vite.config.ts`:
- `vendor-react` — react, react-dom, react-router, scheduler
- `vendor-motion` — framer-motion
- `vendor-supabase` — @supabase
- `vendor-icons` — lucide-react
- `vendor-other` — everything else

Chunk size warning threshold: 500 KB.

---

## Deployment

Platform: **Vercel**
- SPA rewrite: all routes → `/index.html`
- CSP header in `vercel.json` — update it when adding new external domains
- Allowed frame-src: 111movies.net, vidlink.pro, vidfast.net, player.videasy.net, vidsrc.xyz, vidking.net
- Env vars must be set in Vercel project settings (not committed)

---

## Known Architecture Notes

- `App.tsx` is ~8 000 lines and intentionally monolithic (all library state, modal state, tab routing co-located). Work within it rather than refactoring.
- `MobileDetailPanel` (~962 lines) handles TV episode selection, season chips, cast, and trailer — mirrors the desktop detail modal but as a slide-in panel.
- `MobileWatchPage` exists specifically because `WatchModal` (fixed overlay) breaks iOS/Android fullscreen video.
- Gemini is only used in `MoodBrowse` — it converts free-text to `GeminiMoodParams`, then calls TMDB `/discover`.
- Letterboxd data is fetched via `/api/letterboxd` Vercel serverless function (proxy) in `api/letterboxd.ts`.
- `apiSources.js` is a legacy JS file — do not convert unless refactoring the whole service layer.
