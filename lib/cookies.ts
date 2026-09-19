/**
 * Single robust cookie parser for all server routes.
 *
 * The previous inline pattern (`c.trim().split('=')` destructured to [k, v])
 * silently truncated any cookie value containing '=' (base64 padding, PKCE
 * verifiers, opaque tokens), destroying sessions without a trace.
 * Always split on the FIRST '=' and decode defensively per value.
 */
export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    const rawValue = part.slice(idx + 1).trim();
    // A malformed segment must never break parsing of the remaining cookies.
    try {
      out[name] = decodeURIComponent(rawValue);
    } catch {
      out[name] = rawValue;
    }
  }
  return out;
}

export function getCookie(
  header: string | null | undefined,
  name: string
): string | null {
  const parsed = parseCookies(header);
  const value = parsed[name];
  return value === undefined || value === '' ? null : value;
}
