/**
 * Pure render-decision helpers for auth-gated UI.
 * The signed-out gate must never render while identity is still resolving.
 */

export type RestaurantArea = 'create-tasting' | 'campaign-studio';

export function isRestaurantArea(nav: string): nav is RestaurantArea {
  return nav === 'create-tasting' || nav === 'campaign-studio';
}

export function shouldShowRestaurantGate(opts: {
  activeNav: string;
  hasRestaurantSession?: boolean;
  isAuthenticated?: boolean;
  authRole?: string | null;
  authLoading: boolean;
}): boolean {
  if (!isRestaurantArea(opts.activeNav)) return false;
  if (opts.authLoading) return false;
  const hasRestaurantSession = opts.hasRestaurantSession ??
    Boolean(opts.isAuthenticated && opts.authRole === 'RESTAURANT');
  return !hasRestaurantSession;
}

export function shouldShowAuthLoading(opts: {
  activeNav: string;
  authLoading: boolean;
  hasDinerSession?: boolean;
  hasRestaurantSession?: boolean;
  isAuthenticated?: boolean;
}): boolean {
  if (!opts.authLoading) return false;
  const hasAnySession = opts.hasDinerSession || opts.hasRestaurantSession || opts.isAuthenticated;
  if (hasAnySession) return false;
  // Restaurant areas and diner tastings both wait for identity before gating.
  return isRestaurantArea(opts.activeNav) || opts.activeNav === 'my-tastings';
}
