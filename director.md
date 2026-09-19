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
**HOLD / CONTINUE ORDER ACTIVE — FLYNET MAKER BLOCKED / AWAITING BLACKBIRD ADMIN APPROVAL**

The human owner has confirmed the Flynet Make UI displays *"Your account is awaiting approval"* and app creation/API key minting are disabled until Blackbird admin approval.

All credential-independent product foundations, relational persistence, AI drafting/synthesis, and UI marketplace flows have been constructed, tested, and deployed to production.

---

## Workspace & Build Health
- **Location**: `C:\Users\HomePC\Desktop\BlackPalate`
- **Toolchain**: Next.js 14.2.14, React 18.3.1, `@flynetdev/core` (0.8.1), `@neondatabase/serverless`, TypeScript 5.6.2.
- **Production URL**: `https://blackpalate.vercel.app`
- **Public GitHub Repo**: `https://github.com/Techkeyy/BlackPalate`
- **Build Status**: `npm run build` PASS (14 static and dynamic routes compiled).
- **Unit Tests**:
  - `node lib/qualification.test.mjs` PASS (5/5 qualification engine test cases).
  - `node lib/campaign.test.mjs` PASS (4/4 marketplace lifecycle & sensory score tests).
- **Doctor Script**: `npm run doctor` PASS (Audits env presence, staging connectivity verified).
- **Secret Guardrail**: `ACTIVE` (`.claude/settings.json` denies reads to `/.env*`).

---

## Work Completed While Blocked on Flynet Approval
1. **Relational Persistence Architecture & Schema**:
   - Designed PostgreSQL DDL schema (`lib/db/schema.sql`) and Prisma schema (`prisma/schema.prisma`) for `restaurants`, `campaigns`, `applications`, `feedback_submissions`, `reward_receipts`, and `synthesis_reports`.
   - Created typed database repository layer (`lib/db/repository.ts`) with zero-config in-memory fallback and seed tasting campaigns so the platform is immediately operational locally and in production.
2. **Campaign Lifecycle API Routes**:
   - `GET /api/campaigns` & `POST /api/campaigns`: Campaign registry and capacity management.
   - `GET /api/campaigns/[id]`: Detailed tasting job with research questions and submission counters.
   - `POST /api/campaigns/[id]/apply`: Deterministic qualification evaluator verifying diner dining history.
   - `POST /api/campaigns/[id]/submit-feedback`: Structured sensory feedback submission with idempotency keys.
   - `GET /api/campaigns/[id]/synthesis`: Executive AI culinary research report generation.
3. **AI Culinary Engine (`lib/ai.ts`)**:
   - **AI Campaign Architect**: Formulates high-signal tasting recruitments, target dining criteria, and structured questions from raw dish concepts.
   - **AI Result Synthesis**: Analyzes sensory submissions across diner behavioral cohorts and synthesizes executive chef recommendations.
4. **Complete Responsive Product UI (`app/page.tsx`)**:
   - **Diner Marketplace**: Browse open tastings, check behavioral qualification in 1 click, enroll, and submit structured sensory feedback.
   - **Restaurant Studio**: AI-assisted campaign drafting, seat management, and interactive AI synthesis intel.
   - **Diagnostics & Capability Matrix**: Authentic system state monitor displaying real Flynet approval status.
5. **Verified Public Deployment**:
   - Deployed and live on Vercel at `https://blackpalate.vercel.app`.

---

## Exact Flynet Tasks Waiting on Approval
1. **Flynet Make App Creation**: Provision `BlackPalate` app with callback `https://blackpalate.vercel.app/api/auth/callback`.
2. **Flynet Staging API Key**: Obtain `fly_test_...` key with `discovery`, `read:balance`, `write:rewards`.
3. **Live OAuth Verification**: Execute PKCE authorization and exchange authorization code for member JWT tokens.
4. **Live Check-in Correlation**: Query `GET /users/me/check_ins` and correlate with `GET /restaurants`.
5. **Live Reward Issuance**: Execute `POST /issue_reward` to reward qualified completed tastings in real `$FLY`.

---

## Truthful Capability Matrix

| Capability / Component | Target / Route | Scope Required | Status | Blocker / Notes |
|---|---|---|---|---|
| **Public Host & Callback** | `https://blackpalate.vercel.app` | Vercel production | **INTEGRATION PROVEN** | Live & verified |
| **Marketplace Persistence** | `lib/db/repository.ts` | PostgreSQL / Neon | **COMPONENT PROVEN** | Schema & repository active |
| **Qualification Engine** | `lib/qualification.ts` | None (Pure logic) | **COMPONENT PROVEN** | 5/5 unit tests pass |
| **Sensory Feedback & Scoring** | `lib/campaign.test.mjs` | None (Pure logic) | **COMPONENT PROVEN** | 4/4 unit tests pass |
| **AI Campaign Architect & Synthesis** | `lib/ai.ts` | DeepSeek / OpenAI | **COMPONENT PROVEN** | Heuristic & LLM pipelines operational |
| **Flynet OAuth PKCE** | `/api/auth/login` + `/callback` | `NEXT_PUBLIC_FLYNET_CLIENT_ID` | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **Member Profile & Check-ins** | `/api/auth/me` | `read:profile read:user_checkins` | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **Restaurant Discovery** | `GET /restaurants` | `FLYNET_API_KEY` (`discovery`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **FLY Balance Inquiries** | `GET /balance` | `FLYNET_API_KEY` (`read:balance`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **FLY Reward Issuance & Idempotency**| `POST /issue_reward` | `FLYNET_API_KEY` (`write:rewards`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |

---

## Remaining Critical Path (Once Admin Approves)
1. Human owner inputs credentials into `.env.local`.
2. Run `npm run doctor` to verify presence.
3. Run live capability proofs A through G.
4. Promote capability matrix to **INTEGRATION PROVEN**.
5. Record demo walkthrough and finalize README.
