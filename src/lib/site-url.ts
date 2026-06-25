/**
 * Canonical public app URL. Must exactly match the Site URL / Redirect URLs
 * configured in the Supabase project (Auth settings) — this is what
 * `redirectTo` and admin-generated recovery links are built from.
 *
 * NEXT_PUBLIC_SITE_URL is required in production. It must never fall back
 * to localhost there — that would leak into user-facing recovery links.
 */
const configuredAppUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "";

/**
 * Server-only. Throws if NEXT_PUBLIC_SITE_URL is unset in production —
 * callers must catch this and refuse to generate a link rather than
 * silently falling back to localhost.
 */
export function requireServerAppUrl(): string {
  if (configuredAppUrl) return configuredAppUrl;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("APP_URL no está configurada");
}

/**
 * Client-only. Falls back to the browser's own origin — which is always
 * the correct production domain when the page is actually loaded in
 * production, so this never needs (or risks) a localhost fallback there.
 */
export function getClientAppUrl(): string {
  if (configuredAppUrl) return configuredAppUrl;
  return window.location.origin;
}
