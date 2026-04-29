# GoodFilm — Database & Storage

## Overview

GoodFilm uses two persistence layers that sync with each other:

| Layer | Technology | Scope |
|-------|-----------|-------|
| Primary | `localStorage` | Always available, offline-first |
| Cloud | Supabase (PostgreSQL + RLS) | Requires auth + env vars |

---

## localStorage

All keys are defined in `src/config.ts`.

| Key | Type | Purpose |
|-----|------|---------|
| `goodfilm_library` | `UserLibrary` JSON | Main user data — watchlist, watched, ratings, lists, progress |
| `goodfilm_backup` | `UserLibrary` JSON | Auto-backup taken before destructive operations |
| `goodfilm_library_meta` | `{ updatedAt: string }` | Last sync timestamp, used for cloud merge decisions |
| `goodfilm_profile` | `UserProfile` JSON | Username, avatar URL, bio, privacy settings |

Read/write via `src/utils/storage.ts`:
```ts
loadLibrary()           // → UserLibrary | defaultLibrary
saveLibrary(lib)        // → void (also updates meta timestamp)
loadUserProfile()       // → UserProfile | null
saveUserProfile(p)      // → void
getLibraryUpdatedAt()   // → string | null
setLibraryUpdatedAt(ts) // → void
```

### Letterboxd list cache

`letterboxdPublic.ts` also writes per-list caches to localStorage with TTL:
- Popular / hourly lists: 1-hour TTL
- Top 250 / curated lists: 7-day TTL
- Keys follow the pattern `lb_<list-name>_<timestamp>`

---

## Supabase

### Connection

```ts
// src/services/supabase.ts
export const supabase: SupabaseClient | null = HAS_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
```

`HAS_SUPABASE` is `true` only when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
If either is missing, all cloud ops are silently skipped.

### Table Schema

```sql
create table if not exists public.goodfilm_libraries (
  user_id    uuid primary key,   -- = auth.uid()
  email      text,
  library    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

Table name constant: `CLOUD_TABLE = "goodfilm_libraries"` (in `src/config.ts`).

Full DDL including RLS policies is in `CLOUD_SETUP_SQL` exported from `src/config.ts`.
Run it in the Supabase SQL editor to provision the table.

### Row Level Security

```sql
alter table public.goodfilm_libraries enable row level security;

-- SELECT: own row only
create policy "Users can read own library"
  on public.goodfilm_libraries for select to authenticated
  using (auth.uid() = user_id);

-- INSERT: own row only
create policy "Users can insert own library"
  on public.goodfilm_libraries for insert to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: own row only
create policy "Users can update own library"
  on public.goodfilm_libraries for update to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Cloud Sync Operations

| Function | When called | Behaviour |
|----------|-------------|-----------|
| `uploadLibraryToCloud(user, library)` | After every library mutation | Upsert row by `user_id` |
| `downloadLibraryFromCloud(user)` | After sign-in | Fetch latest `library` + `updated_at` |

After download, `mergeLibraries(local, cloud)` is called in `App.tsx` to resolve conflicts.
The merged result is saved back to both localStorage and Supabase.

### CloudMode State Machine

```
         ┌──────────┐
         │ unknown  │  ← initial state on app load
         └────┬─────┘
              │  first cloud op attempted
     ┌────────┼──────────────────┐
     ▼        ▼                  ▼
  ready   missing_table      disabled
  (table   (PGRST205 error   (HAS_SUPABASE
  exists)   or table name     = false)
            in error msg)
```

When `missing_table`: `_cloudTableUnavailable = true` — all subsequent ops short-circuit immediately.
When `disabled`: supabase client is `null` — guarded at call sites.

**Guard pattern** (used before every cloud operation):
```ts
if (!supabase || _cloudTableUnavailable) return;
```

### Error Detection

```ts
isMissingCloudTableError(error)
// true when: error.code === "PGRST205"
//         or error.message includes "goodfilm_libraries"
```

---

## UserLibrary Schema

The `library` jsonb column stores a `UserLibrary` object (defined in `src/types/index.ts`):

```ts
type UserLibrary = {
  watchlist:      LibraryItem[];       // saved to watch later
  watchingItems:  LibraryItem[];       // currently watching
  waitingItems:   LibraryItem[];       // waiting for new episodes
  watched:        LibraryItem[];       // finished
  ratings:        Record<string, number>;  // key: "movie-123" | "tv-456"
  watching:       WatchingProgress;    // per-show episode tracking
  notes:          Record<string, string>;  // key: same as ratings
  customLists:    CustomList[];
  followedPeople: FollowedPerson[];
  movieProgress:  Record<string, MovieWatchEntry>;  // Continue Watching
}
```

### LibraryItem

```ts
type LibraryItem = {
  id:           number;
  mediaType:    "movie" | "tv";
  title:        string;
  posterPath:   string | null;
  backdropPath: string | null;
  year:         string;
  rating:       number | null;
  genre_ids?:   number[];
  genres?:      Array<{ id: number }>;
}
```

### WatchingProgress (per TV show)

```ts
type WatchingProgress = {
  [showId: string]: {
    season:                  number;
    episodeFilter?:          "all" | "watched" | "unwatched";
    selectedEpisodeBySeason: Record<string, number>;
    watchedEpisodesBySeason: Record<string, number[]>;
    lastWatchedAt?:          number;   // Unix ms
  }
}
```

### Rating Key Format

Ratings and notes use a composite key:
```
"movie-{tmdbId}"   e.g. "movie-550"
"tv-{tmdbId}"      e.g. "tv-1396"
```
Built by `keyFor(mediaType, id)` in `src/utils/library.ts`.

---

## Auth (Supabase Auth)

GoodFilm uses Supabase's built-in Auth — email + password only (no OAuth providers configured).

```ts
supabase.auth.signUp({ email, password })
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signOut()
supabase.auth.updateUser({ password })   // used by Settings → Security
```

`onAuthStateChange` listener in `App.tsx` drives `currentUser` state.

`CloudUser` type:
```ts
type CloudUser = {
  id:       string;   // = Supabase auth.uid() UUID
  email:    string;
  provider: "supabase";
}
```

---

## Import / Export

Users can export/import their full library as JSON via Settings.

```ts
type ImportExportPayload = {
  version:    1;
  exportedAt: string;   // ISO timestamp
  library:    UserLibrary;
}
```

Before import, `sanitizeLibrary()` normalises the incoming data to prevent schema drift.
A backup is saved to `goodfilm_backup` in localStorage before applying any import.

---

## Supabase Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Project URL e.g. `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon/public key from Supabase dashboard |

Set in `.env.local` for dev, and in Vercel Environment Variables for production.
Never commit these values.
