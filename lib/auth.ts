import crypto from 'node:crypto';
import { db } from './db/repository';
import { User, RestaurantMembership } from './db/types';

const SESSION_SECRET = process.env.SESSION_SECRET || 'blackpalate_secure_session_key_2026_runtime_nyc';

export interface OperatorSessionPayload {
  userId: string;
  email: string;
  displayName: string;
  restaurantAuthUserId: string;
  issuedAt: number;
  expiresAt: number;
}

export function signOperatorSession(payload: Omit<OperatorSessionPayload, 'issuedAt' | 'expiresAt'>): string {
  const now = Date.now();
  const fullPayload: OperatorSessionPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyOperatorSession(token: string): OperatorSessionPayload | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    if (signature !== expectedSignature) return null;

    const payload: OperatorSessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (Date.now() > payload.expiresAt) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function resolveOrCreateRestaurantUser(authData: {
  restaurantAuthUserId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}): Promise<{ user: User; memberships: RestaurantMembership[] }> {
  let user = await db.getUserByRestaurantAuthId(authData.restaurantAuthUserId);

  if (!user) {
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    user = await db.createUser({
      id: newId,
      displayName: authData.displayName,
      email: authData.email,
      restaurantAuthUserId: authData.restaurantAuthUserId,
      avatarUrl: authData.avatarUrl || null,
    });

    // Create initial restaurant workspace for the operator
    const restId = `rest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rest = await db.createRestaurant({
      id: restId,
      name: `${authData.displayName}'s Kitchen`,
      cuisine: ['Contemporary American', 'Tasting Menu'],
      neighborhood: 'Manhattan, NYC',
      priceTier: 3,
      isDemo: false,
    });

    await db.createMembership({
      userId: user.id,
      restaurantId: rest.id,
      role: 'OWNER',
    });
  }

  const memberships = await db.getMembershipsByUserId(user.id);
  return { user, memberships };
}

export async function resolveOrCreateFlynetDinerUser(flynetProfile: {
  id: string;
  displayName?: string;
  name?: string;
  avatarUrl?: string;
}): Promise<User> {
  let user = await db.getUserByFlynetId(flynetProfile.id);

  if (!user) {
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    user = await db.createUser({
      id: newId,
      displayName: flynetProfile.displayName || flynetProfile.name || `Blackbird Member #${flynetProfile.id.slice(-4)}`,
      flynetUserId: flynetProfile.id,
      avatarUrl: flynetProfile.avatarUrl || null,
    });
  }

  return user;
}

