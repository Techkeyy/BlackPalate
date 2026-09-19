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
**DIRECTIVE 002E COMPLETE — FAKE RESTAURANT LOGIN PURGED, OFFICIAL MANAGED NEON AUTH INSTALLED, SEPARATE WORKSPACE MODEL OPERATIONAL**

- **Managed Authentication**: Official Neon Auth (`@neondatabase/auth` + Better Auth) mounted at `/api/auth/neon/[...path]`.
- **Security Audit**: All fake custom login routes (`POST /api/auth/restaurant/login`, `logout`), fake synthesized `auth_google_*` IDs, custom HMAC crypto, and fallback secrets completely removed.
- **Identity Isolation**: Internal `User` model maps real Neon Auth identity (`restaurantAuthUserId`) independently from Flynet diner identity (`flynetUserId`). Accounts sharing an email string are never auto-merged.
- **Explicit Workspace Ownership**: Logging in no longer synthesizes a fake restaurant. Restaurant creation is an explicit authenticated action (`POST /api/restaurants`) granting `OWNER` membership.
- **Database**: Official Neon PostgreSQL resource (`neon-beige-forest`) active across Production, Preview, and Local.
- **Flynet Maker Status**: **BLOCKED / AWAITING BLACKBIRD ADMIN APPROVAL**. Diner Flynet OAuth stays fail-closed.

---

## Directive 002E System State Summary

### 1. Real Managed Auth (Official Neon Auth)
- Installed and configured `@neondatabase/auth` (0.5.0-beta) and `better-auth`.
- Official server handler mounted at `app/api/auth/neon/[...path]/route.ts`.
- `NEON_AUTH_COOKIE_SECRET` provisioned and encrypted across Vercel production, preview, and local `.env.local`.
- Zero client-supplied identity parameters trusted: operator identity resolved purely from `neonAuth.getSession(req)`.

### 2. Workspace Ownership & Campaign Authorization
- **Explicit Restaurant Workspace Creation (`POST /api/restaurants`)**:
  - Requires valid Neon Auth operator session.
  - Inserts restaurant entity into Neon PostgreSQL.
  - Creates `RestaurantMembership(userId, restaurantId, role: 'OWNER')`.
- **Campaign Mutation Guard (`POST /api/campaigns`)**:
  - Enforces `getAuthenticatedOperator(req)` session.
  - Enforces `db.getMembership(operator.id, restaurantId)` membership check.
  - Returns `401 UNAUTHORIZED` if unauthenticated and `403 FORBIDDEN_WORKSPACE` if operator lacks membership in the target venue.

### 3. Identity Model & Zero Auto-Merge
- `users.restaurant_auth_user_id`: Stores external Neon Auth user ID.
- `users.flynet_user_id`: Stores external Flynet member ID.
- Resolvers (`resolveOrCreateRestaurantUser`, `resolveOrCreateFlynetDinerUser`) are isolated by external ID; email equality never conflates operator privileges with diner credentials.

---

## Workspace & Build Health
- **Location**: `C:\Users\HomePC\Desktop\BlackPalate`
- **Toolchain**: Next.js 14.2.14, React 18.3.1, `@flynetdev/core` (0.8.1), `@neondatabase/serverless` (1.1.0), `framer-motion` (13.4.0), `lucide-react` (1.47.0), TypeScript 5.6.2.
- **Production URL**: `https://blackpalate.vercel.app`
- **Public GitHub Repo**: `https://github.com/Techkeyy/BlackPalate`
- **Build Status**: `npm run build` PASS (17 static and dynamic routes compiled).
- **Automated Test Suites**:
  - `npm run test:unit`: **15/15 PASS** (`campaign.test.mjs` + `qualification.test.mjs`).
  - `npm run test:audit`: **14/14 PASS** (`audit.test.mjs` security, IDOR, and auth isolation tests).
  - `npm run test:integration`: **5/5 PASS** (`db.integration.test.mjs` against live Neon PostgreSQL).
  - **Total Tests**: **34/34 PASS** (`npm test`).
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
