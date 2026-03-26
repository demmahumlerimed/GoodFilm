import {
  STORAGE_KEY, BACKUP_KEY,
  LIBRARY_META_KEY, PROFILE_STORAGE_KEY,
} from "../config";
import type { UserLibrary, UserProfile } from "../types";
import { defaultLibrary } from "../types";
import { sanitizeLibrary } from "./library";
import { buildDefaultProfile } from "./auth";

// ── Library ───────────────────────────────────────────────────────────────────

/**
 * Reads UserLibrary from localStorage.
 * Falls back to defaultLibrary on any parse/corruption error.
 */
export function loadLibrary(): UserLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_KEY);
    if (!raw) return defaultLibrary;
    const parsed = JSON.parse(raw);
    if (parsed?.library) return sanitizeLibrary(parsed.library);
    return sanitizeLibrary(parsed);
  } catch {
    return defaultLibrary;
  }
}

/**
 * Persists library to both primary and backup keys atomically.
 */
export function saveLibrary(library: UserLibrary): void {
  const serialized = JSON.stringify(library);
  localStorage.setItem(STORAGE_KEY, serialized);
  localStorage.setItem(BACKUP_KEY,  serialized);
}

// ── Library metadata ──────────────────────────────────────────────────────────

export function getLibraryUpdatedAt(): number {
  try {
    const raw = localStorage.getItem(LIBRARY_META_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed?.updatedAt === "number" ? parsed.updatedAt : 0;
  } catch {
    return 0;
  }
}

export function setLibraryUpdatedAt(timestamp = Date.now()): void {
  localStorage.setItem(LIBRARY_META_KEY, JSON.stringify({ updatedAt: timestamp }));
}

// ── User profile ──────────────────────────────────────────────────────────────

function profileKey(email: string): string {
  return `${PROFILE_STORAGE_KEY}:${email.toLowerCase()}`;
}

export function loadUserProfile(email: string): UserProfile {
  try {
    const raw = localStorage.getItem(profileKey(email));
    if (!raw) return buildDefaultProfile(email);
    const p = JSON.parse(raw);
    return {
      username:    p?.username    || buildDefaultProfile(email).username,
      avatarUrl:   p?.avatarUrl   || null,
      memberSince: p?.memberSince || new Date().toISOString(),
      lastLogin:   p?.lastLogin   || new Date().toISOString(),
      bio:         typeof p?.bio === "string" ? p.bio : undefined,
      privacy:     p?.privacy && typeof p.privacy === "object" ? p.privacy : undefined,
    };
  } catch {
    return buildDefaultProfile(email);
  }
}

export function saveUserProfile(email: string, profile: UserProfile): void {
  localStorage.setItem(profileKey(email), JSON.stringify(profile));
}
