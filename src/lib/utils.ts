/**
 * Escape HTML for safe insertion into HTML text content.
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

/**
 * Escape an attribute value for safe use in HTML attributes.
 */
export function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/\n/g, ' ');
}

/**
 * Sanitize a string for use as a URL slug.
 */
export function slugFromString(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'profile';
}

/**
 * Derive a candidate slug from an email (part before @).
 */
export function slugFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'user';
  return slugFromString(local);
}

/**
 * Reserved slugs that must not be used as profile slugs (conflict with routes).
 */
export const RESERVED_SLUGS = new Set([
  'login', 'logout', 'dashboard', 'auth', 'api', 'admin',
  'go', 'mentions-legales', 'confidentialite', 'conditions', 'contact',
  '_next', 'favicon.ico',
]);

/**
 * Check if a slug is reserved (would conflict with app routes).
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Validate that a URL is safe (http/https only, no javascript: etc.)
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate a redirect path is safe (relative, starts with /, no protocol).
 */
export function isSafeRedirectPath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !path.includes(':')
  );
}

/**
 * Very small bot/crawler heuristic for click tracking.
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return /bot|crawler|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|embedly|quora link preview/i.test(
    userAgent
  );
}

/**
 * Extract hostname from a referrer URL (privacy-friendly).
 */
export function referrerToDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    return u.hostname || null;
  } catch {
    return null;
  }
}

/**
 * Field length limits matching SQL constraints.
 */
export const FIELD_LIMITS = {
  display_name: 100,
  bio: 500,
  slug_min: 2,
  slug_max: 48,
  avatar_url: 2048,
  label: 100,
  url: 2048,
  html: 65536,
} as const;
