import type { UserProfile } from "../types";

/**
 * Validates password strength.
 * Returns an error string if invalid, null if valid.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8)            return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password))        return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password))        return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password))        return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return null;
}

/**
 * Maps raw Supabase/auth error messages to user-friendly strings.
 */
export function normalizeAuthErrorMessage(error: unknown): string {
  const raw   = String((error as any)?.message || "Authentication failed.");
  const lower = raw.toLowerCase();

  if (lower.includes("weak_password") || lower.includes("weak password")) {
    return "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and symbol.";
  }
  if (lower.includes("pwned") || lower.includes("leaked") || lower.includes("compromised")) {
    return "That password appears in breach data. Use a unique password you have never used elsewhere.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  return raw;
}

/**
 * Creates a default UserProfile for a newly registered user.
 */
export function buildDefaultProfile(email: string, username?: string): UserProfile {
  const now             = new Date().toISOString();
  const fallbackUsername = username || email.split("@")[0] || "Member";
  return {
    username:    fallbackUsername,
    avatarUrl:   null,
    memberSince: now,
    lastLogin:   now,
  };
}
