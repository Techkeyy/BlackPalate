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
  return !(opts.isAuthenticated && opts.authRole === 'RESTAURANT');
}

export function shouldShowAuthLoading(opts) {
  if (!opts.authLoading) return false;
  if (opts.isAuthenticated) return false;
  return isRestaurantArea(opts.activeNav) || opts.activeNav === 'my-tastings';
}
