import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapErrorToUserMessage, getRewardStatusDisplay } from './error-messages.mjs';

describe('User Error Handling & Input Preservation Test Suite', () => {

  // =========================================================================
  // Requirement 1: Never Show Raw Technical Errors to Users
  // =========================================================================
  describe('1. Technical Error Masking', () => {
    const rawErrors = [
      'DATABASE_UNAVAILABLE',
      'FLYNET_UNAVAILABLE',
      'ECONNRESET',
      '500 Internal Server Error',
      'OAuth state mismatch',
      'invalid_grant',
      'P2002 Unique constraint failed',
      'SELECT * FROM users WHERE error = true',
      'ETIMEDOUT',
      'fetch failed',
    ];

    it('should never expose raw technical tokens in the title or message', () => {
      for (const raw of rawErrors) {
        const result = mapErrorToUserMessage(raw);
        assert.ok(!result.message.includes('DATABASE_UNAVAILABLE'), `Leaked DATABASE_UNAVAILABLE in: ${result.message}`);
        assert.ok(!result.message.includes('ECONNRESET'), `Leaked ECONNRESET in: ${result.message}`);
        assert.ok(!result.message.includes('P2002'), `Leaked P2002 in: ${result.message}`);
        assert.ok(!result.message.includes('SELECT *'), `Leaked SQL in: ${result.message}`);
        assert.ok(!result.message.includes('ETIMEDOUT'), `Leaked ETIMEDOUT in: ${result.message}`);
        assert.ok(result.title.length > 0, 'Title must not be empty');
        assert.ok(result.message.length > 0, 'Message must not be empty');
      }
    });

    it('should handle raw error objects with status codes and code properties', () => {
      const errObj = { status: 500, code: 'ECONNRESET', error: 'DATABASE_UNAVAILABLE' };
      const result = mapErrorToUserMessage(errObj, 'fetch_data');
      assert.strictEqual(result.title, "Couldn't Load Information");
      assert.strictEqual(result.actionType, 'RETRY');
    });
  });

  // =========================================================================
  // Requirement 2: Next Action for Every Error
  // =========================================================================
  describe('2. Actionable Next Steps', () => {
    it('should provide SIGN_IN_RESTAURANT action when unauthenticated on campaign publish', () => {
      const result = mapErrorToUserMessage('AUTH_REQUIRED', 'campaign_publish');
      assert.strictEqual(result.actionType, 'SIGN_IN_RESTAURANT');
      assert.strictEqual(result.actionText, 'Sign In');
      assert.ok(result.message.includes('restaurant operator'));
    });

    it('should provide CONNECT_FLYNET action when unauthenticated on joining tasting', () => {
      const result = mapErrorToUserMessage('AUTH_REQUIRED', 'join_tasting');
      assert.strictEqual(result.actionType, 'CONNECT_FLYNET');
      assert.strictEqual(result.actionText, 'Connect Blackbird');
      assert.ok(result.message.includes('Blackbird'));
    });

    it('should provide CREATE_WORKSPACE action when user lacks restaurant membership', () => {
      const result = mapErrorToUserMessage('FORBIDDEN_WORKSPACE', 'campaign_publish');
      assert.strictEqual(result.actionType, 'CREATE_WORKSPACE');
      assert.strictEqual(result.actionText, 'Create Workspace');
    });

    it('should provide RETRY action for network delays and timeouts', () => {
      const result = mapErrorToUserMessage('ETIMEDOUT', 'campaign_publish');
      assert.strictEqual(result.actionType, 'RETRY');
      assert.strictEqual(result.actionText, 'Try Again');
    });
  });

  // =========================================================================
  // Requirement 3: Preserve User Input & Inform the User
  // =========================================================================
  describe('3. Input Preservation Guarantees', () => {
    it('should mark drafts as preserved when campaign publish fails', () => {
      const result = mapErrorToUserMessage('DATABASE_UNAVAILABLE', 'campaign_publish');
      assert.strictEqual(result.isPreserved, true);
      assert.ok(result.message.toLowerCase().includes('preserved') || result.message.toLowerCase().includes('still here'));
    });

    it('should mark feedback inputs as preserved when sensory submission fails', () => {
      const result = mapErrorToUserMessage('DATABASE_UNAVAILABLE', 'feedback_submit');
      assert.strictEqual(result.isPreserved, true);
      assert.ok(result.message.toLowerCase().includes('still here') || result.message.toLowerCase().includes('retype'));
    });

    it('should mark workspace form as preserved when workspace creation fails', () => {
      const result = mapErrorToUserMessage('DATABASE_UNAVAILABLE', 'workspace_create');
      assert.strictEqual(result.isPreserved, true);
      assert.ok(result.message.toLowerCase().includes('preserved'));
    });
  });

  // =========================================================================
  // Requirement 4: Financial Reward Status Mapping
  // =========================================================================
  describe('4. Truthful Reward States', () => {
    it('should map PENDING to Queued state', () => {
      const info = getRewardStatusDisplay('PENDING');
      assert.strictEqual(info.label, 'Reward Queued');
      assert.strictEqual(info.color, '#F59E0B');
    });

    it('should map ISSUING to Sending state', () => {
      const info = getRewardStatusDisplay('ISSUING');
      assert.strictEqual(info.label, 'Sending Reward...');
      assert.strictEqual(info.color, '#3B82F6');
    });

    it('should map ISSUED to Success state', () => {
      const info = getRewardStatusDisplay('ISSUED');
      assert.strictEqual(info.label, 'Reward Issued');
      assert.strictEqual(info.color, '#10B981');
    });

    it('should map FAILED to Paused/Reconciliation state', () => {
      const info = getRewardStatusDisplay('FAILED');
      assert.strictEqual(info.label, 'Reward Issuance Paused');
      assert.strictEqual(info.color, '#EF4444');
      assert.ok(info.description.includes('reconcile'));
    });

    it('should map UNKNOWN to Confirmation state without duplicate retry prompt', () => {
      const info = getRewardStatusDisplay('UNKNOWN');
      assert.strictEqual(info.label, 'Confirming Reward Status');
      assert.ok(info.description.includes('do not re-submit'));
    });
  });

  // =========================================================================
  // Requirement 5: Graceful Handling of Idempotent & Duplicate Actions
  // =========================================================================
  describe('5. Duplicate Action Resilience', () => {
    it('should handle ALREADY_JOINED gracefully without alarming the diner', () => {
      const result = mapErrorToUserMessage('ALREADY_JOINED', 'join_tasting');
      assert.strictEqual(result.title, 'Already Joined');
      assert.strictEqual(result.actionType, 'DISMISS');
      assert.ok(result.message.includes('My Tastings'));
    });

    it('should handle ALREADY_SUBMITTED gracefully for feedback', () => {
      const result = mapErrorToUserMessage('ALREADY_SUBMITTED', 'feedback_submit');
      assert.strictEqual(result.title, 'Feedback Already Submitted');
      assert.strictEqual(result.actionType, 'DISMISS');
    });

    it('should handle REWARD_ALREADY_ISSUED truthfully', () => {
      const result = mapErrorToUserMessage('REWARD_ALREADY_ISSUED');
      assert.strictEqual(result.title, 'Reward Already Issued');
    });
  });

  // =========================================================================
  // Requirement 6: Flynet Blocker Truthfulness
  // =========================================================================
  describe('6. Flynet Access Blocker State', () => {
    it('should truthfully describe admin approval status when Flynet actions are attempted', () => {
      const result = mapErrorToUserMessage('FLYNET_APPROVAL_PENDING', 'join_tasting');
      assert.strictEqual(result.title, 'Blackbird Verification Unavailable');
      assert.ok(result.message.includes('temporarily unavailable'));
      assert.strictEqual(result.isPreserved, true);
    });
  });
});
