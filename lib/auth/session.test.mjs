import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCookies, getCookie } from '../cookies.mjs';
import { flynetLoginCookies, clearFlynetCookies } from './session-cookies.mjs';
import { resolveRequestIdentity } from './resolve.mjs';
import { shouldShowRestaurantGate, shouldShowAuthLoading } from './gate.mjs';

const fakeReq = () => ({ headers: { get: () => null } });

describe('Session Persistence Suite (Directive 002J)', () => {
  describe('1. Shared cookie parser', () => {
    it('preserves values containing = (base64 padding, verifiers, opaque tokens)', () => {
      const parsed = parseCookies('bp_access_token=abc123==; bp_oauth_verifier=x=y=z; other=1');
      assert.strictEqual(parsed.bp_access_token, 'abc123==');
      assert.strictEqual(parsed.bp_oauth_verifier, 'x=y=z');
      assert.strictEqual(parsed.other, '1');
    });

    it('decodes percent-encoded values and survives malformed segments', () => {
      const parsed = parseCookies('a=hello%20world; bad=%E0%A4%A; b=2');
      assert.strictEqual(parsed.a, 'hello world');
      assert.strictEqual(parsed.b, '2');
      assert.ok('bad' in parsed);
    });

    it('returns null for missing/empty cookies and headers', () => {
      assert.strictEqual(getCookie(null, 'bp_access_token'), null);
      assert.strictEqual(getCookie('', 'bp_access_token'), null);
      assert.strictEqual(getCookie('a=1', 'bp_access_token'), null);
      assert.strictEqual(getCookie('bp_access_token=', 'bp_access_token'), null);
    });
  });

  describe('2. Session cookie attributes (names/flags only)', () => {
    it('access cookie path permits every product route; HttpOnly never weakened', () => {
      for (const isProd of [true, false]) {
        const { access, refresh } = flynetLoginCookies(
          { access_token: 't', refresh_token: 'r', expires_in: 3600 },
          isProd
        );
        assert.strictEqual(access.name, 'bp_access_token');
        assert.strictEqual(access.options.path, '/');
        assert.strictEqual(access.options.httpOnly, true);
        assert.strictEqual(access.options.sameSite, 'lax');
        assert.strictEqual(access.options.secure, isProd);
        assert.strictEqual(refresh.name, 'bp_refresh_token');
        assert.strictEqual(refresh.options.path, '/api/auth');
        assert.strictEqual(refresh.options.httpOnly, true);
      }
    });

    it('logout clears mirror the original paths with HttpOnly intact', () => {
      const cleared = clearFlynetCookies(true);
      const byName = Object.fromEntries(cleared.map((c) => [c.name, c.options]));
      assert.strictEqual(byName.bp_access_token.path, '/');
      assert.strictEqual(byName.bp_refresh_token.path, '/api/auth');
      for (const c of cleared) {
        assert.strictEqual(c.options.maxAge, 0);
        assert.strictEqual(c.options.httpOnly, true);
        assert.strictEqual(c.options.secure, true);
      }
    });
  });

  describe('3. Central identity resolution', () => {
    const dinerUser = { id: 'usr_diner_1' };
    const opUser = { id: 'usr_op_1' };

    it('resolves a valid Neon session to RESTAURANT without needing Flynet', async () => {
      const id = await resolveRequestIdentity(fakeReq(), {
        getOperator: async () => ({ user: opUser, neonAuthUserId: 'neon_1', memberships: [] }),
        readAccessToken: () => null,
        getFlynetSession: async () => { throw new Error('must not be consulted'); },
        resolveDinerUser: async () => { throw new Error('must not be consulted'); },
      });
      assert.strictEqual(id.authenticated, true);
      assert.strictEqual(id.role, 'RESTAURANT');
    });

    it('a failing Neon check does not erase a valid Flynet session', async () => {
      const id = await resolveRequestIdentity(fakeReq(), {
        getOperator: async () => { throw new Error('neon down'); },
        readAccessToken: () => 'tok',
        getFlynetSession: async () => ({ profile: { id: 'fly_1' }, checkIns: [] }),
        resolveDinerUser: async ({ id: fid }) => ({ id: 'usr_' + fid }),
      });
      assert.strictEqual(id.authenticated, true);
      assert.strictEqual(id.role, 'DINER');
      assert.strictEqual(id.flynetUserId, 'fly_1');
    });

    it('Flynet absence does not invalidate a restaurant session; total absence is signed out', async () => {
      const op = await resolveRequestIdentity(fakeReq(), {
        getOperator: async () => ({ user: opUser, neonAuthUserId: 'neon_1', memberships: [] }),
        readAccessToken: () => null,
        getFlynetSession: async () => null,
        resolveDinerUser: async () => dinerUser,
      });
      assert.strictEqual(op.role, 'RESTAURANT');

      const out = await resolveRequestIdentity(fakeReq(), {
        getOperator: async () => null,
        readAccessToken: () => null,
        getFlynetSession: async () => null,
        resolveDinerUser: async () => dinerUser,
      });
      assert.strictEqual(out.authenticated, false);
    });

    it('an invalid Flynet token resolves to signed out (fail closed)', async () => {
      const id = await resolveRequestIdentity(fakeReq(), {
        getOperator: async () => null,
        readAccessToken: () => 'bad',
        getFlynetSession: async () => null,
        resolveDinerUser: async () => dinerUser,
      });
      assert.strictEqual(id.authenticated, false);
    });

    it('repeated resolution with the same session retains role (refresh/navigation)', async () => {
      const deps = {
        getOperator: async () => null,
        readAccessToken: () => 'tok',
        getFlynetSession: async () => ({ profile: { id: 'fly_9' }, checkIns: [{}, {}] }),
        resolveDinerUser: async () => dinerUser,
      };
      for (let i = 0; i < 3; i++) {
        const id = await resolveRequestIdentity(fakeReq(), deps);
        assert.strictEqual(id.authenticated, true);
        assert.strictEqual(id.role, 'DINER');
      }
    });
  });

  describe('4. Gate never renders while identity is resolving', () => {
    it('restaurant areas show loading, not the signed-out gate, during authLoading', () => {
      for (const nav of ['create-tasting', 'campaign-studio']) {
        assert.strictEqual(
          shouldShowRestaurantGate({ activeNav: nav, isAuthenticated: false, authRole: null, authLoading: true }),
          false
        );
        assert.strictEqual(
          shouldShowAuthLoading({ activeNav: nav, authLoading: true, isAuthenticated: false }),
          true
        );
      }
    });

    it('settled states gate correctly', () => {
      assert.strictEqual(
        shouldShowRestaurantGate({ activeNav: 'create-tasting', isAuthenticated: false, authRole: null, authLoading: false }),
        true
      );
      assert.strictEqual(
        shouldShowRestaurantGate({ activeNav: 'campaign-studio', isAuthenticated: true, authRole: 'DINER', authLoading: false }),
        true
      );
      assert.strictEqual(
        shouldShowRestaurantGate({ activeNav: 'campaign-studio', isAuthenticated: true, authRole: 'RESTAURANT', authLoading: false }),
        false
      );
      assert.strictEqual(
        shouldShowRestaurantGate({ activeNav: 'discover', isAuthenticated: false, authRole: null, authLoading: false }),
        false
      );
      assert.strictEqual(
        shouldShowAuthLoading({ activeNav: 'my-tastings', authLoading: true, isAuthenticated: false }),
        true
      );
      assert.strictEqual(
        shouldShowAuthLoading({ activeNav: 'my-tastings', authLoading: false, isAuthenticated: false }),
        false
      );
    });
  });
});
