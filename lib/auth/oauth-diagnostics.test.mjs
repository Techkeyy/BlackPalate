import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logOAuthFailure, logOAuthPhase } from './oauth-diagnostics.mjs';

describe('Flynet OAuth diagnostics', () => {
  it('logs only normalized metadata, never exception messages or secret-bearing fields', () => {
    const originalError = console.error;
    const originalInfo = console.info;
    const output = [];
    console.error = (...args) => output.push(args);
    console.info = (...args) => output.push(args);
    try {
      logOAuthFailure('callback', 'OAUTH_TOKEN_EXCHANGE_FAILED', {
        name: 'FlynetError',
        status: 401,
        message: 'client-secret=do-not-log access-token=do-not-log',
        access_token: 'access-token=do-not-log',
      });
      logOAuthPhase('exchange_succeeded', { refreshTokenSupplied: true });
    } finally {
      console.error = originalError;
      console.info = originalInfo;
    }

    const serialized = JSON.stringify(output);
    assert.match(serialized, /OAUTH_TOKEN_EXCHANGE_FAILED/);
    assert.match(serialized, /FLYNET_ERROR/);
    assert.match(serialized, /401/);
    assert.match(serialized, /refreshTokenSupplied/);
    assert.doesNotMatch(serialized, /client-secret|access-token=do-not-log/);
  });
});
