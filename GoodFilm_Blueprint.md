This is the **Ultimate Technical Master Specification** for **GoodFilm v3.1**. I have analyzed the 2,000+ lines of code, the component structure, the specific logic for episode tracking, and the visual styling cues from your GitHub repository.

This document is designed to be fed into an LLM (like Claude) as a "System Prompt" or "Master PRD." It leaves zero room for ambiguity.

***

# Technical Master Specification: GoodFilm v3.1

## 1. Project Vision & Identity
GoodFilm is a **Cinematic Media Engine** that serves as a high-end hybrid between a media tracker (Letterboxd/Trakt style) and a streaming aggregator.
- **Visual Style:** "Cinematic Dark." High use of Glassmorphism, 72px blurs, backdrop-driven UI, and radial glows.
- **Primary Goal:** Provide a seamless "Continue Watching" experience across Movies, TV Shows, and Anime with cloud synchronization.

## 2. Technical Stack & Dependencies
- **Core:** React 18 (TypeScript), Vite.
- **Styling:** Tailwind CSS (with `tailwind-merge` and `clsx` utilities).
- **Animation:** Framer Motion (Optimized with `AnimatePresence` and `USE_SIMPLE_ANIMATIONS` flag for mobile).
- **Backend/Sync:** Supabase (Auth & PostgreSQL).
- **Icons:** Lucide React.
- **External APIs:**
    - **TMDB:** Metadata, Images, External IDs, Credits, Recommendations.
    - **OMDB:** Fetching IMDb, Rotten Tomatoes (TomatoMeter), and Metacritic scores.
    - **AniList:** GraphQL-based discovery for Anime trends/seasons.
    - **Watchmode:** Streaming provider availability.
    - **Anthropic Claude API:** For generating AI-based personalized recommendations.

## 3. Data Architecture & Logic (The "Backbone")

### A. The Universal Key System (`keyFor`)
Every piece of data must be keyed using the format: `${mediaType}-${id}` (e.g., `movie-550` or `tv-1399`). This prevents ID collisions and is used as the primary key in `ratings`, `notes`, and `watching` objects.

### B. The `UserLibrary` Schema
```typescript
{
  watchlist: LibraryItem[];
  watched: LibraryItem[];
  watchingItems: LibraryItem[]; // Active TV shows/Movies
  waitingItems: LibraryItem[];  // Staged for later/Upcoming
  ratings: Record<string, number>; // 0-10 scale
  notes: Record<string, string>;   // User thoughts per item
  customLists: CustomList[];       // User-created collections
  watching: Record<string, {       // Deep episodic tracking
    season: number;
    episodeFilter: "all" | "watched" | "unwatched";
    selectedEpisodeBySeason: Record<string, number>;
    watchedEpisodesBySeason: Record<string, number[]>;
  }>;
}
```

### C. Storage & Sync Strategy
1. **Local-First:** Read/Write to `localStorage` for zero-latency.
2. **Cloud-Sync:** Supabase acts as the master.
    - **Download:** On login, fetch the remote library and replace local.
    - **Upload:** Triggered on library change, but **blocked** until the initial cloud download is complete (`cloudSyncReady`).
3. **Bulk Linking:** A utility that maps "unlinked" library items (manually added) to TMDB IDs via title search and year matching.

## 4. UI/UX Feature Modules

### A. Dynamic Hero System
The Hero component changes its **Visual Theme** based on the **Primary Genre ID** of the content:
- **Action (28):** `#2a0a00` bg, `#ff6030` accent.
- **Sci-Fi (878):** `#000820` bg, `#40c4ff` accent.
- **Rules:** Use `mask-image: linear-gradient` to blend high-res posters into the black text panel.

### B. TV Tracking Engine
The most complex logic in the app. Must support:
- **Mark Episodes Up To:** Single click to mark all episodes from 1 to current as watched.
- **Continue Watching Rail:** Surfaces on the Home tab. Must calculate percentage progress based on `watchedEpisodesBySeason.length / total_episodes`.
- **Season Switching:** Fetches new episodes from TMDB on dropdown change.

### C. The Streaming "Server Picker"
A collection of 12 predefined server configurations (SuperEmbed, EmbedMaster, VidLink, etc.).
- **URL Builder:** Logic to detect `mediaType` and inject `${tmdbId}`, `${season}`, and `${episode}` into the specific iframe string.
- **Persistence:** Save `gf_preferred_server` to allow users to set a global default.

### D. Mobile-Specific Refactor
When `IS_MOBILE` is true:
- **Navigation:** Replaces Top Nav with `MobileTopBar` and `MobileBottomNav`.
- **Details:** Replaces the `DetailModal` with `MobileDetailPanel` (a full-height slide-up sheet with a sticky action footer).
- **Layout:** Grids switch to 2 columns; rails use touch-optimized snapping.

## 5. API Logic & Endpoints

### 1. TMDB Enrichment
- **Videos:** Search for `YouTube` + `Trailer` or `Teaser`.
- **Logo:** `fetchTMDBLogoPath` to find transparent title logos for posters.
- **Credits:** Fetch top 12 cast members.

### 2. OMDB Integration
- Triggered inside the `DetailModal`.
- Maps TMDB `imdb_id` to fetch the "Big Three" ratings (IMDb, RT, Metacritic) and "Awards" strings.

### 3. AniList Discovery
- Uses GraphQL queries to fetch Anime specifically.
- Maps AniList data to the internal `MediaItem` format so they work with the existing Hero and Rail components.

## 6. Development Rules for the AI
1. **Deduplication:** Always run `uniqueMediaItems` and `dedupeLibraryItems` before setting state to avoid UI ghosting or duplicate keys.
2. **Animations:** Use `layoutId` for the navigation underlines so they slide smoothly between tabs.
3. **Safety:** Implement `isMissingCloudTableError` handling. If the Supabase table doesn't exist, the app should function in Local-Only mode without crashing.
4. **Performance:** Use `useMemo` for filtering the library and `useCallback` for toggle functions to prevent unnecessary re-renders.

