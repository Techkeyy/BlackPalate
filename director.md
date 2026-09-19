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
**DIRECTIVE 002D COMPLETE — REAL NEON POSTGRESQL PROVISIONED, USER ACCOUNT MODEL & RESTAURANT WORKSPACE AUTHORIZATION OPERATIONAL**

- **Database**: Official Neon PostgreSQL resource (`neon-beige-forest`) provisioned via Vercel Marketplace integration and active across Production, Preview, and Development.
- **Persistence Architecture**: 100% durable PostgreSQL storage using `@neondatabase/serverless` (zero in-memory fallback in production).
- **Flynet Maker Status**: **BLOCKED / AWAITING BLACKBIRD ADMIN APPROVAL**. All Flynet dining history evaluations fail closed cleanly until Blackbird admin grants access.

---

## Directive 002D System State Summary

### 1. Real Hosted Database (Neon / Vercel Integration)
- **Resource**: `neon-beige-forest` (`store_URzvBNEqcn19Rnbh`) installed via official Vercel integration CLI.
- **Environment**: Automatically provisions and encrypts `DATABASE_URL`, `POSTGRES_URL`, `NEON_PROJECT_ID`, and `NEON_AUTH_BASE_URL` in Vercel production.
- **Fail-Closed Guard**: `checkDatabaseConfig` strictly asserts `DATABASE_URL` presence in production; in-memory fallback is completely disabled.

### 2. Locked BlackPalate Account & Ownership Architecture
- **Internal User Model (`users`)**:
  - Central entity: `id`, `displayName`, `email`, `avatarUrl`, `flynetUserId` (nullable UNIQUE), `restaurantAuthUserId` (nullable UNIQUE).
  - Explicit linking model: External Flynet OAuth identity and Restaurant managed auth identities map directly to internal `User` records.
- **Restaurant Workspace Ownership (`restaurant_memberships`)**:
  - Relational mapping: `(userId, restaurantId, role: OWNER | MANAGER)`.
  - Campaign authorization: Server-side validation on `POST /api/campaigns` requires authenticated operator membership in `campaign.restaurantId`.
- **User-Centric Application Ownership (`applications`)**:
  - Ownership key: `userId` (references internal `users(id)`).
  - External Flynet identity attached separately in `qualification_proof` and `dinerFlynetId`.
- **Relational Integrity**:
  - `feedback_submissions` and `reward_receipts` link directly to `application_id` and `user_id`.
  - Deterministic idempotency keys: `blackpalate:reward:<applicationId>`.

### 3. Authentication & Session Management
- **Diner Session**: HttpOnly `bp_access_token` session cookie via Flynet PKCE OAuth callback; resolves/upserts internal BlackPalate `User`.
- **Restaurant Operator Session**: HttpOnly `bp_operator_token` signed JWT session cookie; resolves/upserts operator `User` and establishes workspace context.
- **Unified `/api/auth/me`**: Returns authenticated user, role (`RESTAURANT` | `DINER`), and active restaurant workspaces.

---

## Workspace & Build Health
- **Location**: `C:\Users\HomePC\Desktop\BlackPalate`
- **Toolchain**: Next.js 14.2.14, React 18.3.1, `@flynetdev/core` (0.8.1), `@neondatabase/serverless` (1.1.0), `framer-motion` (13.4.0), `lucide-react` (1.47.0), TypeScript 5.6.2.
- **Production URL**: `https://blackpalate.vercel.app`
- **Public GitHub Repo**: `https://github.com/Techkeyy/BlackPalate`
- **Build Status**: `npm run build` PASS (17 static and dynamic routes compiled).
- **Automated Test Suites**:
  - `npm run test:unit`: **15/15 PASS** (`campaign.test.mjs` + `qualification.test.mjs`).
  - `npm run test:audit`: **11/11 PASS** (`audit.test.mjs` security and IDOR isolation tests).
  - `npm run test:integration`: **6/6 PASS** (`db.integration.test.mjs` against live Neon PostgreSQL).
  - **Total Tests**: **32/32 PASS** (`npm test`).
- **Doctor Script**: `npm run doctor` PASS.
- **Secret Guardrail**: `ACTIVE` (`.claude/settings.json`).

---

## Truthful Capability Matrix

| Capability / Component | Route / Module | Scope Required | Status | Blocker / Notes |
|---|---|---|---|---|
| **Public Host & Callback** | `https://blackpalate.vercel.app` | Vercel production | **INTEGRATION PROVEN** | Live & verified |
| **Relational Persistence** | `lib/db/repository.ts` | Neon PostgreSQL | **INTEGRATION PROVEN** | Provisioned (`neon-beige-forest`) & verified |
| **User & Account System** | `lib/auth.ts` + `/api/auth/me` | Neon DB / Cookies | **INTEGRATION PROVEN** | Internal User model + dual identity mapping |
| **Workspace Authorization** | `POST /api/campaigns` | Neon DB / Session | **INTEGRATION PROVEN** | RestaurantMembership checked on all mutations |
| **User-Centric Applications** | `POST /api/campaigns/[id]/apply` | Neon DB / Session | **INTEGRATION PROVEN** | Owned by internal userId, not raw Flynet ID |
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
