const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * Resolves the canonical site URL from an environment value.
 *
 * Invalid, relative, or non-HTTP(S) values fall back to the local default so a
 * typo in NEXT_PUBLIC_SITE_URL can never crash the production build or emit a
 * malformed canonical URL.
 */
export function resolveSiteUrl(raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_SITE_URL;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
