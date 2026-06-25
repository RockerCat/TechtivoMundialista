/**
 * Canonical public app URL. Must exactly match the Site URL / Redirect URLs
 * configured in the Supabase project (Auth settings), since this is what
 * `redirectTo` is built from for recovery links.
 *
 * Safe to import from both client and server code — NEXT_PUBLIC_ vars are
 * inlined at build time wherever they're referenced.
 */
export function getPublicAppUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
