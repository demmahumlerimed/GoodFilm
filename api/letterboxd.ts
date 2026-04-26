/**
 * GoodFilm — Letterboxd proxy  (Vercel Edge Function)
 *
 * GET /api/letterboxd?url=<encoded-letterboxd-list-url>
 *
 * Returns JSON: Array<{ slug: string; name: string; year?: string; tmdbId?: number }>
 *
 * Two modes (selected automatically):
 *
 *  Official API  — when LETTERBOXD_CLIENT_ID + LETTERBOXD_CLIENT_SECRET env vars
 *                  are set. Authenticates via OAuth2 Client Credentials, searches
 *                  for the list, paginates entries, and extracts TMDB IDs directly
 *                  from the Letterboxd film links — no TMDB search needed.
 *
 *  HTML scraping — fallback when credentials are absent (or official API fails).
 *                  Fetches the Letterboxd page server-side (no CORS), parses
 *                  data-film-* attributes, returns slug+name+year for the client
 *                  to resolve via TMDB search.
 *
 * Response headers:
 *   Cache-Control: s-maxage=86400   — Vercel CDN caches each list for 24 h
 *   Access-Control-Allow-Origin: *  — safe: read-only public data
 */

export const config = { runtime: "edge" };

const LB_API = "https://api.letterboxd.com/api/v0";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FilmEntry {
  slug: string;
  name: string;
  year?: string;
  tmdbId?: number;
}

// ── Official API ──────────────────────────────────────────────────────────────

interface TokenCache {
  value: string;
  exp: number;
}

// Edge functions are stateless per-invocation — token is fetched fresh each cold start.
// This is fine: the token endpoint is fast and the CDN cache prevents most invocations anyway.
async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${LB_API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`LB auth ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function fetchViaOfficialApi(
  listPath: string,
  token: string
): Promise<FilmEntry[]> {
  // listPath: "/official/list/top-250-films-with-the-most-fans/"
  const parts = listPath.replace(/^\/|\/$/g, "").split("/");
  const username = parts[0];   // "official"
  const listSlug = parts[2];   // "top-250-films-with-the-most-fans"

  // Search for the list to get its internal ID
  const searchRes = await fetch(
    `${LB_API}/search?input=${encodeURIComponent(listSlug)}&include=ListSearchItem&perPage=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!searchRes.ok) throw new Error(`LB search ${searchRes.status}`);

  const searchData = (await searchRes.json()) as {
    items?: Array<{
      type: string;
      list?: {
        id: string;
        slug: string;
        owner?: { username?: string };
      };
    }>;
  };

  const match = searchData.items?.find(
    (item) =>
      item.type === "ListSearchItem" &&
      item.list?.slug === listSlug &&
      item.list?.owner?.username?.toLowerCase() === username.toLowerCase()
  );

  if (!match?.list?.id) throw new Error(`List not found: ${username}/${listSlug}`);

  const listId = match.list.id;
  const films: FilmEntry[] = [];
  let cursor: string | undefined;

  // Paginate entries — max 200 to keep the function fast
  do {
    const url =
      `${LB_API}/list/${listId}/entries?perPage=100` +
      (cursor ? `&cursor=${cursor}` : "");
    const entriesRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!entriesRes.ok) break;

    const data = (await entriesRes.json()) as {
      items?: Array<{
        film?: {
          id: string;
          name?: string;
          releaseYear?: number;
          links?: Array<{ type: string; id: string }>;
        };
      }>;
      next?: string;
    };

    for (const item of data.items ?? []) {
      if (!item.film) continue;
      const tmdbLink = item.film.links?.find((l) => l.type === "tmdb");
      films.push({
        slug: item.film.id,
        name: item.film.name ?? item.film.id,
        year: item.film.releaseYear?.toString(),
        tmdbId: tmdbLink ? parseInt(tmdbLink.id, 10) : undefined,
      });
    }

    cursor = data.next;
  } while (cursor && films.length < 200);

  return films;
}

// ── HTML scraping fallback ────────────────────────────────────────────────────

function parseHtml(html: string): FilmEntry[] {
  // Extract poster <div> blocks: each contains data-film-slug, data-film-name, data-film-release-year
  const blockRe =
    /data-film-slug="([^"]+)"[^>]*(?:data-film-name="([^"]*)")?[^>]*(?:data-film-release-year="([^"]*)")?/g;
  const seen = new Set<string>();
  const out: FilmEntry[] = [];
  let m: RegExpExecArray | null;

  while ((m = blockRe.exec(html)) !== null) {
    const slug = m[1];
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug,
      name: m[2] ? decodeHtmlEntities(m[2]) : slug.replace(/-/g, " "),
      year: m[3] || undefined,
    });
  }
  return out;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

async function fetchViaHtml(url: string): Promise<FilmEntry[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GoodFilmBot/1.0; +https://goodfilm.app)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`LB HTTP ${res.status}`);
  const html = await res.text();
  return parseHtml(html);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return Response.json({ error: "url param required" }, { status: 400 });
  }

  const lbUrl = decodeURIComponent(rawUrl);

  // Validate: must be a letterboxd.com URL
  if (!lbUrl.startsWith("https://letterboxd.com/")) {
    return Response.json({ error: "only letterboxd.com URLs allowed" }, { status: 400 });
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600",
    "Content-Type": "application/json",
  };

  try {
    let films: FilmEntry[];

    const clientId = (globalThis as Record<string, unknown>)["LETTERBOXD_CLIENT_ID"] as string | undefined
      ?? process?.env?.LETTERBOXD_CLIENT_ID;
    const clientSecret = (globalThis as Record<string, unknown>)["LETTERBOXD_CLIENT_SECRET"] as string | undefined
      ?? process?.env?.LETTERBOXD_CLIENT_SECRET;

    if (clientId && clientSecret) {
      try {
        const token = await getToken(clientId, clientSecret);
        const urlObj = new URL(lbUrl);
        films = await fetchViaOfficialApi(urlObj.pathname, token);
      } catch {
        // Official API failed — fall back to HTML scraping
        films = await fetchViaHtml(lbUrl);
      }
    } else {
      films = await fetchViaHtml(lbUrl);
    }

    return new Response(JSON.stringify(films), { status: 200, headers });
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch list", detail: String(err) },
      { status: 502, headers }
    );
  }
}
