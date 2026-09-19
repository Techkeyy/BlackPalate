# BlackPalate — Director Log & System State

## Product
**BlackPalate**

## Hackathon
**Runtime NYC — Blackbird / Best Use of Flynet**
- **Sponsor**: Blackbird
- **Track**: Best Use of Flynet
- **Track Prize**: $2,500 total in $FLY (Top 5 teams receive $500 in $FLY each)
- **Grand Prize**: Automatically eligible for Bankr Grand Prize ($20,000 in participant prizes)
- **Submission Deadline**: Midnight EDT at the end of Saturday, September 19, 2026 (`2026-09-20T00:00:00-04:00`)
- **Live Demos**: 5:00 PM EDT on Saturday, September 19, 2026

## Product Thesis
BlackPalate is a marketplace for paid restaurant tasting and culinary research opportunities where restaurants recruit diners based on verified real dining behavior instead of self-reported preferences.

---

## Current Status
**DIRECTIVE 002F IN PROGRESS — SECRET INCIDENT REMEDIATED, GIT HISTORY SCRUBBED, WORKSPACE ISOLATION ENFORCED, RESTAURANT GOOGLE AUTH UAT PENDING**

- **Security Incident Status**:
  - Compromised Neon Auth cookie secret was immediately rotated across all environments (Vercel production, preview, development, and local).
  - Public Git history was completely rewritten and scrubbed (`OLD_SECRET_OCCURRENCES = 0`).
  - All hardcoded secret fallbacks and permissive defaults were permanently removed from [`lib/auth.ts`](file:///C:/Users/HomePC/Desktop/BlackPalate/lib/auth.ts) (fails closed if `NEON_AUTH_COOKIE_SECRET` or `NEON_AUTH_BASE_URL` is missing).
- **Neon Auth Endpoint**: Real endpoint verified at `https://ep-delicate-frost-auxdykag.neonauth.c-10.us-east-1.aws.neon.tech/neondb/auth`.
- **Google OAuth Provider**: Configured via Neon Auth; requires human owner to ensure Google OAuth client credentials & trusted origins (`https://blackpalate.vercel.app`) are active in Neon Console and Google Cloud Console for live browser authorization.
- **Restaurant Login**: **UAT PENDING** (awaiting human owner Google sign-in test on production).
- **Workspace Model**: Fully decoupled from sign-in. New operators have 0 workspaces until explicit creation via [`POST /api/restaurants`](file:///C:/Users/HomePC/Desktop/BlackPalate/app/api/restaurants/route.ts). `rest_01` production fallback permanently removed.
- **Reward Integrity**: Fabricated `tx_flynet_confirmed` transaction identifier removed. State machine supports `PENDING`, `ISSUING`, `ISSUED`, `FAILED`, and `UNKNOWN`.
- **Flynet Maker Status**: **BLOCKED / AWAITING BLACKBIRD ADMIN APPROVAL**. Diner Flynet OAuth stays fail-closed.

---

## Directive 002F System State Summary

### 1. Secret Hygiene & Fail-Closed Configuration
- Rotated `NEON_AUTH_COOKIE_SECRET` into cryptographically random 32-byte secret without echoing or printing in logs.
- Git history rewrite executed via `git filter-branch`, force-pushed to GitHub `origin master`. Verified reachable history has `0` occurrences of the compromised value.
- Missing auth configuration in `lib/auth.ts` now throws `NEON_AUTH_CONFIGURATION_ERROR` and fails closed.

### 2. Workspace Ownership & Cross-Workspace Isolation
- Cross-workspace isolation verified via automated security tests:
  - Operator A (OWNER of Restaurant A) can publish to Restaurant A, receives `403 FORBIDDEN_WORKSPACE` when targeting Restaurant B.
  - Operator B (OWNER of Restaurant B) can publish to Restaurant B, receives `403 FORBIDDEN_WORKSPACE` when targeting Restaurant A.
  - Anonymous callers receive `401 UNAUTHORIZED`.
- Removed `rest_01` fallback from `handlePublishCampaign`: if no active workspace is selected, publishing is blocked and opens the workspace creation modal.

### 3. Automated Test Suites & Build Health
- `npm run test:unit`: **15/15 PASS** (`campaign.test.mjs` + `qualification.test.mjs`).
- `npm run test:audit`: **18/18 PASS** (`audit.test.mjs` with IDOR, duplicate prevention, secret scan, fail-closed auth, cross-workspace mutex, and reward integrity checks).
- `npm run test:integration`: **5/5 PASS** (`db.integration.test.mjs` against live Neon PostgreSQL).
- **Total Tests**: **38/38 PASS** (`npm test`).
- **Production URL**: `https://blackpalate.vercel.app`
- **Public GitHub Repo**: `https://github.com/Techkeyy/BlackPalate` (Branch: `master`, Commit: `fc6e991`)

---

## Truthful Capability Matrix

| Capability / Component | Route / Module | Scope Required | Status | Blocker / Notes |
|---|---|---|---|---|
| **Public Host & Callback** | `https://blackpalate.vercel.app` | Vercel production | **INTEGRATION PROVEN** | Live & verified |
| **Relational Persistence** | `lib/db/repository.ts` | Neon PostgreSQL | **INTEGRATION PROVEN** | Provisioned (`neon-beige-forest`) & verified |
| **Managed Restaurant Auth** | `lib/auth.ts` + `/api/auth/neon` | Neon Auth SDK | **IMPLEMENTED (UAT PENDING)** | Real endpoint wired; awaiting Google OAuth UAT |
| **Workspace Authorization** | `POST /api/campaigns` | Neon DB / Session | **INTEGRATION PROVEN** | Strict membership checks; cross-workspace mutex verified |
| **User-Centric Applications** | `POST /api/campaigns/[id]/apply` | Neon DB / Session | **INTEGRATION PROVEN** | Owned by internal `userId`, not raw Flynet ID |
| **Deterministic Qualification Engine** | `lib/qualification.ts` | Pure Logic | **COMPONENT PROVEN** | 5/5 unit tests pass |
| **Product Lifecycle & Capacity Rules** | `lib/campaign.test.mjs` | Pure Logic / DB | **COMPONENT PROVEN** | 10/10 unit tests pass |
| **AI Campaign Architect & Synthesis** | `lib/ai.ts` | DeepSeek / OpenAI | **COMPONENT PROVEN** | Operational with heuristic fallbacks & zero emoji |
| **Dark Theme & Reactive Motion** | `components/MotionPrimitives.tsx` | UI System | **COMPONENT PROVEN** | Fluid scroll reveal, zero emoji, full-bleed hero |
| **Flynet OAuth PKCE** | `/api/auth/login` + `/callback` | `NEXT_PUBLIC_FLYNET_CLIENT_ID` | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **Member Profile & Check-ins** | `/api/auth/me` | `read:profile read:user_checkins` | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **Restaurant Discovery** | `GET /restaurants` | `FLYNET_API_KEY` (`discovery`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **FLY Balance Inquiries** | `GET /balance` | `FLYNET_API_KEY` (`read:balance`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **FLY Reward Issuance & Idempotency**| `POST /issue_reward` | `FLYNET_API_KEY` (`write:rewards`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |

---

## Next Recommended Action
Awaiting Blackbird admin approval in Flynet Make. Once approved:
1. Generate Staging API key (`fly_test_...`) and OAuth Client ID / Secret with redirect URI `https://blackpalate.vercel.app/api/auth/callback`.
2. Input credentials into `.env.local` / Vercel env.
3. Run `npm run doctor` and execute live capability proofs (Proofs A through G).
