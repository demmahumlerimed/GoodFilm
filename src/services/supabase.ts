import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, HAS_SUPABASE, CLOUD_TABLE } from "../config";
import type { CloudUser, CloudLibraryRow, UserLibrary, SupabaseRuntimeError } from "../types";
import { sanitizeLibrary } from "../utils/library";

// ── Client singleton ──────────────────────────────────────────────────────────

export const supabase: SupabaseClient | null = HAS_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ── Cloud table availability ──────────────────────────────────────────────────

/** Module-scoped flag — prevents hammering a missing table on every operation. */
let _cloudTableUnavailable = false;

export function markCloudTableUnavailable(): void {
  _cloudTableUnavailable = true;
}

export function isCloudTableUnavailable(): boolean {
  return _cloudTableUnavailable;
}

export function resetCloudTableFlag(): void {
  _cloudTableUnavailable = false;
}

// ── Error detection ───────────────────────────────────────────────────────────

export function isMissingCloudTableError(error: unknown): boolean {
  const err = error as SupabaseRuntimeError | null;
  if (!err) return false;
  return err.code === "PGRST205" || Boolean(err.message?.includes("goodfilm_libraries"));
}

// ── Cloud sync ────────────────────────────────────────────────────────────────

export async function uploadLibraryToCloud(
  user: CloudUser,
  library: UserLibrary
): Promise<void> {
  if (user.provider !== "supabase" || !supabase || _cloudTableUnavailable) return;

  const { error } = await supabase.from(CLOUD_TABLE).upsert({
    user_id:    user.id,
    email:      user.email,
    library,
    updated_at: new Date().toISOString(),
  });

  if (!error) return;

  if (isMissingCloudTableError(error)) {
    _cloudTableUnavailable = true;
    return;
  }
  throw error;
}

export async function downloadLibraryFromCloud(
  user: CloudUser
): Promise<CloudLibraryRow | null> {
  if (user.provider !== "supabase" || !supabase || _cloudTableUnavailable) return null;

  const { data, error } = await supabase
    .from(CLOUD_TABLE)
    .select("library, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingCloudTableError(error)) {
      _cloudTableUnavailable = true;
      return null;
    }
    throw error;
  }

  if (!data?.library) return null;
  return {
    library:    sanitizeLibrary(data.library),
    updated_at: data.updated_at,
  };
}
