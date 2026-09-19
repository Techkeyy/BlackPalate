/**
 * Runnable mirror of cookies.ts for node:test (node cannot import TS).
 * Keep logic identical to lib/cookies.ts.
 */
export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    const rawValue = part.slice(idx + 1).trim();
    try {
      out[name] = decodeURIComponent(rawValue);
    } catch {
      out[name] = rawValue;
    }
  }
  return out;
}

export function getCookie(header, name) {
  const parsed = parseCookies(header);
  const value = parsed[name];
  return value === undefined || value === '' ? null : value;
}
