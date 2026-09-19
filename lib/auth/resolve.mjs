/**
 * Runnable mirror of lib/auth/resolve.ts for node:test (deps injected; no SDK imports).
 * Keep logic identical.
 */
export async function resolveRequestIdentity(req, deps) {
  let operator = null;
  try {
    operator = await deps.getOperator(req);
  } catch (err) {
    operator = null;
  }
  if (operator) {
    return {
      authenticated: true,
      role: 'RESTAURANT',
      user: operator.user,
      neonAuthUserId: operator.neonAuthUserId,
      memberships: operator.memberships,
    };
  }

  let accessToken = null;
  try {
    accessToken = deps.readAccessToken(req);
  } catch {
    accessToken = null;
  }
  if (!accessToken) return { authenticated: false };

  let session = null;
  try {
    session = await deps.getFlynetSession(accessToken);
  } catch {
    session = null;
  }
  if (!session) return { authenticated: false };

  const flynetId = session.profile?.id;
  if (!flynetId) return { authenticated: false };

  const displayName =
    session.profile?.display_name ||
    session.profile?.name ||
    session.profile?.username ||
    flynetId;
  const user = await deps.resolveDinerUser({
    id: flynetId,
    displayName,
    avatarUrl: session.profile?.avatar_url || session.profile?.image,
  });

  return {
    authenticated: true,
    role: 'DINER',
    user,
    flynetUserId: flynetId,
    dinerName: displayName,
    profile: session.profile,
    checkIns: session.checkIns,
  };
}
