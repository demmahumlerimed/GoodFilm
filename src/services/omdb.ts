import { OMDB_API_KEY, OMDB_BASE } from "../config";
import type { OmdbData } from "../types";

export async function omdbFetch(
  params: Record<string, string>
): Promise<OmdbData | null> {
  try {
    const url = new URL(OMDB_BASE);
    url.searchParams.set("apikey", OMDB_API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data: OmdbData = await res.json();
    return data?.Response === "False" ? null : data;
  } catch {
    return null;
  }
}
