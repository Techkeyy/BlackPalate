/**
 * Runnable mirror of lib/auth/gate.ts for node:test.
 * Keep logic identical.
 */
export function isRestaurantArea(nav) {
  return nav === 'create-tasting' || nav === 'campaign-studio';
}

export function shouldShowRestaurantGate(opts) {
  if (!isRestaurantArea(opts.activeNav)) return false;
  if (opts.authLoading) return false;
  const hasRestaurantSession = opts.hasRestaurantSession ??
    Boolean(opts.isAuthenticated && opts.authRole === 'RESTAURANT');
  return !hasRestaurantSession;
}

export function shouldShowAuthLoading(opts) {
  if (!opts.authLoading) return false;
  const hasAnySession = opts.hasDinerSession || opts.hasRestaurantSession || opts.isAuthenticated;
  if (hasAnySession) return false;
  return isRestaurantArea(opts.activeNav) || opts.activeNav === 'my-tastings';
}
