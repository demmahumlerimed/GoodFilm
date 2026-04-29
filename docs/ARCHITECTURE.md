# GoodFilm — Architecture

## Boot Sequence

```
index.html
  └─ main.tsx              ReactDOM.createRoot + BrowserRouter
       └─ AppRouter.tsx    Route path="*" → App  (single catch-all)
            └─ App.tsx     ~8 000-line monolith — all state, logic, UI
```

React Router handles the SPA rewrite (Vercel: `/(.*) → /index.html`).
All internal navigation is **state-based**, not URL-based — the URL never changes after load.

---

## Layer Map

```
┌─────────────────────────────────────────────────────────────────┐
│  Vercel Edge                                                    │
│  api/letterboxd.ts   GET /api/letterboxd?url=<lb-url>           │
│  (CORS proxy + optional Letterboxd OAuth)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ fetch
┌────────────────────────────▼────────────────────────────────────┐
│  Services  (src/services/)                                      │
│                                                                 │
│  tmdb.ts            tmdbFetch<T>()  + in-memory cache           │
│  supabase.ts        singleton client + cloud sync helpers       │
│  gemini.ts          natural language → GeminiMoodParams         │
│  omdb.ts            omdbFetch()  — ratings enrichment           │
│  letterboxdPublic.ts  allorigins relay → TMDB resolution        │
│  mediaEnrichment.ts  aggregates TMDB + OMDB + IMDb              │
│  apiSources.js      fetchWatchmodeSources() (legacy JS)         │
└────────────────────────────┬────────────────────────────────────┘
                             │ called by
┌────────────────────────────▼────────────────────────────────────┐
│  App.tsx  (monolith)                                            │
│                                                                 │
│  • All useState / useEffect                                     │
│  • Tab routing (activeTab state)                                │
│  • Library CRUD (watchlist, watched, ratings, lists…)           │
│  • Auth flow (Supabase)                                         │
│  • Cloud sync (upload / download / merge)                       │
│  • Modal open/close state (detail, watch, person, auth)         │
│  • Search state + debounce                                      │
│  • Home row data fetching                                       │
│  • Settings overlay                                             │
│  • Mobile/desktop render split                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ renders
┌────────────────────────────▼────────────────────────────────────┐
│  Components  (src/components/)                                  │
│                                                                 │
│  layout/     AppShell · TopPillNav · MobileBottomNav            │
│              MobileTopBar · SettingsPanel · GoodFilmFooter      │
│  media/      Hero · PosterCard · PersonModal                    │
│  mobile/     MobileHome · MobileDetailPanel · MobileWatchPage  │
│  modals/     WatchModal  (desktop player)                       │
│  catalog/    CatalogCards · CatalogGridCard · CatalogListRow    │
│  library/    ListsView · MyListView                             │
│  mood/       MoodBrowse                                         │
│  auth/       AuthModal                                          │
│  ui/         AnimatedIcons                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Architecture

There is **no global state library** (no Redux, no Zustand, no Context). All state lives in `App.tsx` as `useState` and is passed down as props.

### Key state buckets in App.tsx

| State | Type | Purpose |
|-------|------|---------|
| `activeTab` | `Tab` | Which section is rendered |
| `library` | `UserLibrary` | All user data (watchlist, watched, ratings, lists…) |
| `currentUser` | `CloudUser \| null` | Authenticated Supabase user |
| `profile` | `UserProfile \| null` | Display name, avatar, privacy settings |
| `cloudMode` | `CloudMode` | `unknown / ready / missing_table / disabled` |
| `selectedMedia` | `MediaItem \| null` | Open detail panel/modal |
| `watchItem` | `{...} \| null` | Open player (watch modal or page) |
| `searchQuery` | `string` | Live search input |
| `homeRows` | `HomeRow[]` | Fetched rail data for home screen |

### Persistence

```
Write path:   App.tsx mutation → saveLibrary() → localStorage
              App.tsx mutation → uploadLibraryToCloud() → Supabase

Read path:    loadLibrary() → localStorage  (on mount)
              downloadLibraryFromCloud() → Supabase  (after auth)
              merge via mergeLibraries() if both sources present
```

---

## Navigation Model

```
Tab (state)           Desktop renders         Mobile renders
──────────────────    ─────────────────────   ──────────────────────────
home                  Hero + rail grid        MobileHome (swipeable rails)
movies / series       PosterCard grid         PosterCard grid
anime                 PosterCard grid         PosterCard grid
mood                  MoodBrowse              MoodBrowse
mylist / watchlist    CatalogCards            CatalogCards
lists                 ListsView               ListsView
watched               CatalogCards            CatalogCards
profile               inline profile section  inline profile section
```

Opening a media item:

```
Desktop: selectedMedia → WatchModal (fixed overlay z-[60])
Mobile:  selectedMedia → MobileDetailPanel (slide-in panel)

Pressing Play:
Desktop: watchItem   → WatchModal (iframe embed, z-[65])
Mobile:  watchItem   → MobileWatchPage (full-page component, replaces detail)
```

MobileWatchPage exists because `WatchModal` (fixed overlay) breaks iOS/Android native video fullscreen. The page-based approach lets the system video controls work correctly.

---

## Data Flow — Home Rows

```
App mount
  └─ fetchHomeRows()
       ├─ tmdbFetch("/trending/all/week")          → Trending rail
       ├─ fetchLetterboxdPopularThisWeek()          → Letterboxd Popular
       ├─ fetchLetterboxdTop250()                   → LB Top 250
       ├─ fetchLetterboxdSightAndSound()            → Sight & Sound
       └─ … (14 Letterboxd list functions total)

Each Letterboxd function:
  client → allorigins CORS relay → letterboxd.com HTML
         → parse data-film-slug attributes
         → tmdbFetch("/search/movie?query=…") per slug
         → return MediaItem[]

Alternatively (if LETTERBOXD_CLIENT_ID set on Vercel):
  client → GET /api/letterboxd?url=… (Edge Function)
         → Letterboxd OAuth → official API → paginated entries
         → return FilmEntry[] with tmdbId pre-resolved
```

---

## Data Flow — Detail Panel

```
User clicks poster
  └─ setSelectedMedia(item)
       └─ App fetches in parallel:
            tmdbFetch("/movie/{id}")         or /tv/{id}
            tmdbFetch("/{type}/{id}/credits")
            tmdbFetch("/{type}/{id}/videos")
            tmdbFetch("/{type}/{id}/external_ids")
            omdbFetch(imdb_id)
            imdbFetch(imdb_id)   (imdbapi.dev)
       └─ renders DetailData into WatchModal / MobileDetailPanel
```

---

## Data Flow — Mood Page

```
User types free text
  └─ gemini.ts: POST generativelanguage.googleapis.com
       model: gemini-2.0-flash
       prompt: "convert to TMDB /discover params"
       └─ returns GeminiMoodParams {
            with_genres, sort_by, vote_average.gte,
            vote_count.gte, yearFrom, yearTo, type,
            searchQuery?   ← if Gemini detected a specific title/person
          }
  └─ if searchQuery → tmdbFetch("/search/multi?query=…")
     else           → tmdbFetch("/discover/movie" or "/discover/tv", params)
  └─ results rendered as PosterCard grid
```

---

## Streaming Embed Architecture

```
src/constants/servers.ts   SERVERS[]: 12 embed configs
  key, label, buildUrl({ type, tmdbId, season?, episode? })

When user presses Play:
  watchItem = { tmdbId, type, season, episode, serverKey }
  WatchModal / MobileWatchPage:
    selectedServer = SERVERS.find(s => s.key === serverKey)
    iframeSrc = selectedServer.buildUrl(watchItem)
    <iframe src={iframeSrc} allowFullScreen />
```

CSP in `vercel.json` whitelists frame-src for all 12 servers.
Active servers: `superembed`, `videasy`, `111movies`, `vidking`, `vidlinkpro`, `vidfastpro`, `embedsu`, `autoembed`, `vidsrcicu`, `vidsrcxyz`, `twoembed`, `embedmaster`.

---

## Supabase Integration

```
Auth:   supabase.auth (email+password, magic link)
        onAuthStateChange → App.tsx updates currentUser

Table:  goodfilm_libraries
  user_id    uuid PK (= auth.uid())
  email      text
  library    jsonb   (full UserLibrary object)
  updated_at timestamptz

RLS: authenticated users read/write only their own row

CloudMode state machine:
  unknown  →  (check table)  →  ready
                              →  missing_table  (PGRST205 error)
                              →  disabled       (no Supabase env vars)

Guard pattern before every cloud op:
  if (!supabase || _cloudTableUnavailable) return;
```

---

## TMDB Cache

In-memory `Map` in `src/services/tmdb.ts`. Resets on page reload.

```
Key:   full URL string (with query params)
Value: { data: T, exp: number }  (Unix ms expiry)

TTL:  /search/*  → 60 000 ms  (volatile)
      everything → 300 000 ms

Eviction: when size > 200, delete oldest 50 keys
```

---

## Build Chunks (Vite)

```
vendor-react     react + react-dom + react-router + scheduler
vendor-motion    framer-motion
vendor-supabase  @supabase/supabase-js
vendor-icons     lucide-react
vendor-other     everything else in node_modules
[app code]       src/ — no manual split (monolith = single chunk)
```

Chunk warning threshold: 500 KB.
Target: `esnext`. Minifier: `esbuild`.

---

## External API Summary

| API | Auth method | Used for |
|-----|-------------|---------|
| TMDB v3 | `api_key` param or `Authorization: Bearer` | All movie/TV data |
| OMDB | `apikey` param | Ratings, director, awards |
| IMDb API (imdbapi.dev) | none | IMDb rating + vote count |
| Letterboxd (official) | OAuth2 client credentials (optional) | Community lists |
| Letterboxd (HTML) | none / allorigins relay | Fallback scraping |
| Google Gemini | `key` query param | Mood → TMDB params |
| Supabase | anon key + JWT | Auth + library sync |
| TVMaze | none | TV episode data (via apiSources.js) |

---

## File Size Reference

| File | Lines | Notes |
|------|-------|-------|
| `src/App.tsx` | ~8 050 | Intentional monolith — do not refactor without instruction |
| `src/components/mobile/MobileDetailPanel.tsx` | ~962 | TV episode selection, cast, seasons |
| `src/components/mobile/MobileHome.tsx` | ~724 | Swipeable rail home screen |
| `src/components/layout/TopPillNav.tsx` | ~495 | Desktop header + search |
| `src/components/media/Hero.tsx` | ~370 | Featured content banner |
| `api/letterboxd.ts` | ~240 | Vercel Edge Function |
| `src/types/index.ts` | ~253 | All shared types |
