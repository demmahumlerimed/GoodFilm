/**
 * GoodFilm — Gemini AI Service
 *
 * Powers the Mood page free-form "describe something specific" field.
 * Converts natural language into structured TMDB /discover parameters
 * for accurate results instead of a raw keyword search.
 *
 * Key: VITE_GEMINI_API_KEY (add to .env.local and Vercel env vars)
 * Model: gemini-2.0-flash  (fast, cheap, accurate enough for this task)
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeminiMoodParams {
  /** Comma-separated TMDB genre IDs */
  with_genres?: string;
  /** popularity.desc | vote_average.desc | release_date.desc */
  sort_by?: string;
  "vote_average.gte"?: number;
  "vote_count.gte"?: number;
  yearFrom?: number;
  yearTo?: number;
  /** movie | tv | both */
  type?: "movie" | "tv" | "both";
  /**
   * If set, skip /discover and use /search/multi with this refined query.
   * Gemini returns this when the user names a specific title or person.
   */
  searchQuery?: string;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a movie and TV recommendation assistant. Convert the user's description into TMDB API /discover parameters.

TMDB genre IDs:
MOVIES  — Action:28, Adventure:12, Animation:16, Comedy:35, Crime:80, Documentary:99, Drama:18, Family:10751, Fantasy:14, History:36, Horror:27, Music:10402, Mystery:9648, Romance:10749, Sci-Fi:878, Thriller:53, War:10752, Western:37
TV      — Action:10759, Animation:16, Comedy:35, Crime:80, Documentary:99, Drama:18, Family:10751, Mystery:9648, Reality:10764, Sci-Fi & Fantasy:10765, War & Politics:10768, Western:37

Rules:
- Use with_genres for mood/theme/genre requests (comma-separated IDs, max 3)
- Use searchQuery ONLY when the user names a specific title, director, or actor
- vote_average.gte: 7.0 for "good / critically acclaimed", 6.0 for general, omit for popular
- vote_count.gte: always set to at least 100 to avoid obscure results
- sort_by: "vote_average.desc" for quality requests, "popularity.desc" for mainstream, "release_date.desc" for recent
- yearFrom / yearTo: only set when user specifies a decade or era
- type: "movie", "tv", or "both" based on context (default "both" if unclear)

Return ONLY valid JSON, no markdown, no explanation:
{"with_genres":"18,9648","sort_by":"vote_average.desc","vote_average.gte":7.5,"vote_count.gte":200,"type":"tv"}`;

// ── Main export ───────────────────────────────────────────────────────────────

export const isGeminiAvailable = Boolean(GEMINI_KEY);

/**
 * Analyse a free-form mood/description and return structured TMDB params.
 * Throws if GEMINI_KEY is not set or the request fails.
 */
export async function analyzeMoodQuery(query: string): Promise<GeminiMoodParams> {
  if (!GEMINI_KEY) throw new Error("VITE_GEMINI_API_KEY not configured");

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `User request: "${query}"` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const json = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    return JSON.parse(raw) as GeminiMoodParams;
  } catch {
    // Gemini occasionally wraps JSON in markdown fences — strip and retry
    const stripped = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(stripped) as GeminiMoodParams;
  }
}
