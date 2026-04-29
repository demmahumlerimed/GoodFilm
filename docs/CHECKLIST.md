# GoodFilm — Developer Checklist

## New Feature

- [ ] Types added/updated in `src/types/index.ts`
- [ ] Config constants (env vars, base URLs) added to `src/config.ts`, not inline
- [ ] Component file < 500 lines — if larger, extract sub-components
- [ ] Mobile path tested: does `useIsMobile()` branch handle it?
- [ ] Mobile touch targets ≥ 44×44 px, text ≥ 11px (Apple HIG)
- [ ] Framer Motion used for enter/exit animations (no raw CSS transitions)
- [ ] `cn()` used for conditional Tailwind classes (no template string concatenation)
- [ ] CSS `--gf-*` vars used for theme colours (no hardcoded hex values)
- [ ] No `any` types — use `unknown` and narrow
- [ ] All new `.ts/.tsx` files — no new `.js` files

## Adding a New API Call

- [ ] TMDB: goes through `tmdbFetch<T>()` — never raw `fetch` to `api.themoviedb.org`
- [ ] Supabase: check `supabase !== null` AND `!_cloudTableUnavailable` before calling
- [ ] New external domain added to `connect-src` in `vercel.json` CSP header
- [ ] New iframe/frame source added to `frame-src` in `vercel.json` CSP header
- [ ] Env var (if needed) added to `src/config.ts` via `requireEnv()` and documented in `CLAUDE.md`

## Adding a New Streaming Server

- [ ] New entry added to `SERVERS[]` in `src/constants/servers.ts`
- [ ] `ServerKey` union type updated
- [ ] Domain added to `frame-src` in `vercel.json` CSP header
- [ ] Server tested with both `movie` and `tv` types

## Modifying UserLibrary

- [ ] Schema change reflected in `src/types/index.ts` (`UserLibrary` type)
- [ ] `defaultLibrary` updated with new field default
- [ ] `sanitizeLibrary()` in `src/utils/library.ts` updated to handle missing field on old data
- [ ] Import/export backward-compat confirmed (`sanitizeLibrary` runs on import)
- [ ] localStorage migration considered (old saved data won't have the new field)

## Supabase / Database

- [ ] New SQL run in Supabase SQL editor (project URL in `VITE_SUPABASE_URL`)
- [ ] RLS policy added for any new table
- [ ] `CLOUD_SETUP_SQL` in `src/config.ts` updated if schema changed
- [ ] `sanitizeLibrary()` handles any new nullable fields from cloud data
- [ ] `isMissingCloudTableError()` error codes still accurate if error format changes

## Mobile Component

- [ ] Component renders inside `MobileDetailPanel` or `MobileHome` — not inside `WatchModal`
- [ ] Player feature? Use `MobileWatchPage` (page-based) — not `WatchModal` (overlay)
- [ ] All interactive elements: min 44×44 px tap target
- [ ] All text: min 11px (11pt Apple HIG minimum)
- [ ] Season chips / episode selectors tested on small screen (375px width)
- [ ] Safe area insets respected: use `--safe-bottom` var for bottom padding

## Before Committing

- [ ] `npm run build` passes (tsc + vite)
- [ ] No hardcoded API keys, secrets, or credentials in any file
- [ ] `.env.local` NOT staged (`git status` check)
- [ ] Console errors cleared in both mobile and desktop views
- [ ] New Vercel env vars documented (tell team / add to Vercel dashboard)

## Deploying to Vercel

- [ ] All required env vars set in Vercel project → Settings → Environment Variables:
  - `VITE_TMDB_API_KEY` or `VITE_TMDB_BEARER`
  - `VITE_OMDB_API_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GEMINI_API_KEY`
  - `LETTERBOXD_CLIENT_ID` *(optional — enables official Letterboxd API)*
  - `LETTERBOXD_CLIENT_SECRET` *(optional)*
- [ ] `vercel.json` CSP header covers all external domains in use
- [ ] SPA rewrite `/(.*) → /index.html` still present in `vercel.json`
- [ ] Build command: `npx tsc -b && npx vite build`
- [ ] Output dir: `dist`

## Design System Compliance

- [ ] Background colours use `--gf-bg-*` tokens
- [ ] Text colours use `--gf-cream`, `--gf-text-muted`, or `--gf-text-dim`
- [ ] Accent colour is `--gf-amber` (#e8a020) — not gold, not yellow
- [ ] Borders use `--gf-border` or `--gf-border-strong`
- [ ] Fonts: headings → `font-display` (Syne), body → `font-body` (Plus Jakarta Sans), editorial → `font-serif` (Instrument Serif)
- [ ] No cold/blue-tinted greys — palette is warm espresso

## Code Review

- [ ] No commented-out code left behind
- [ ] No `console.log` debugging statements
- [ ] No `TODO` comments without a linked issue
- [ ] Props that App.tsx passes down are typed (no implicit `any` through callbacks)
- [ ] Framer Motion `AnimatePresence` wraps any conditionally rendered animated element
- [ ] `key` prop set correctly on list items (use `item.id`, not array index)
