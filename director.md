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

The intended core loop is:
1. **Restaurant creates tasting/research opportunity** (specifying target profile e.g., cuisine preferences, visit frequencies, or venue experience).
2. **Diner discovers opportunity** in the marketplace.
3. **Diner connects Blackbird / Flynet account** via OAuth 2.0 PKCE.
4. **BlackPalate evaluates real Flynet dining history** (`GET /users/me/check_ins` correlated with `GET /restaurants`).
5. **Diner qualifies deterministically** (or is provided transparent criteria on what was missing).
6. **Qualified diner joins campaign**.
7. **Diner visits the real restaurant** for the tasting experience.
8. **BlackPalate verifies relevant Flynet attendance/check-in**.
9. **Diner submits structured tasting feedback**.
10. **Real FLY reward is issued** via Flynet (`POST /issue_reward`) from the app wallet.
11. **Restaurant receives raw structured feedback + AI-synthesized research summary**.

## Core Problem
Restaurants can collect reviews and survey opinions, but ordinary surveys and recruitment cannot reliably prove that participants are members of the actual customer segment the restaurant wants to understand.

## Core Promise
BlackPalate lets restaurants recruit, verify, and reward behavior-qualified diners whose relevant dining experience and tasting participation are authoritatively backed by Flynet data.

## Intended Users
1. **Restaurants / Operators / Culinary Researchers**: Creating targeted tasting campaigns with behavior criteria and reviewing structured diner feedback.
2. **Diners**: Connecting their Blackbird profile, verifying real dining history, qualifying for exclusive paid tasting opportunities, and earning $FLY rewards.

## Definition of Done (Master Director Standard)
A normal intended user can open the real deployed application and complete the entire promised journey from beginning to end through the normal user interface using real underlying systems (Flynet OAuth, real check-ins, deterministic qualification engine, feedback submission, and Flynet reward issuance), without developer intervention, terminal commands, or hidden manual state manipulation.

---

## Current Status
**PHASE PARTIAL** (Directive 001C — Foundation Status Corrected & Awaiting Human Flynet App Creation)

---

## Workspace & Build Health
- **Location**: `C:\Users\HomePC\Desktop\BlackPalate`
- **Toolchain**: Next.js 14.2.14, React 18.3.1, `@flynetdev/core` (0.8.1), TypeScript 5.6.2.
- **Build Status**: `npm run build` PASS (Compiled with zero type/lint errors, 12 static/dynamic routes generated).
- **Doctor Script**: `npm run doctor` PASS (Audits env presence, staging connectivity verified).
- **Unit Tests**: `node lib/qualification.test.mjs` PASS (5/5 deterministic qualification test cases passing).
- **Secret Guardrail**: `ACTIVE` (`.claude/settings.json` denies reads to `/.env*`).

---

## Public OAuth Callback & Environment Truth

### Public Callback Shape
`https://<stable-blackpalate-domain>/api/auth/callback`
- **Primary Stable Target**: `https://blackpalate.vercel.app/api/auth/callback`
- **Alternative / Active Tunnel Target**: `https://<tunnel-subdomain>.trycloudflare.com/api/auth/callback`

### Human Action Required on Flynet Make (`https://make.flynet.org/`)
1. **App Name**: `BlackPalate`
2. **Product Description**:
   > BlackPalate is a marketplace for restaurant tasting and research opportunities. Restaurants recruit diners using verified Flynet dining behavior, diners attend tastings and provide structured feedback, and qualified completed participation can be rewarded in FLY.
3. **OAuth / Member Scopes to Request**:
   - `read:profile`
   - `read:user_checkins`
4. **API Key / App Scopes to Request**:
   - `discovery` (or `restaurant/location discovery`)
   - `read:balance`
   - `write:rewards`
5. **Registered Redirect URI**: Register your deployment callback URL (e.g. `https://blackpalate.vercel.app/api/auth/callback` or active tunnel callback).
6. **Secret Handling**: Copy the `API Key` (prefix `fly_test_`) and `client_secret` immediately upon generation and insert directly into `C:\Users\HomePC\Desktop\BlackPalate\.env.local`. Do not paste secret values into chat.

---

## Persistence Architecture

### Decision: Neon Hosted PostgreSQL via `DATABASE_URL`
- **State**: `DECIDED / UNPROVEN`
- **Rationale**: Hosted, serverless-friendly PostgreSQL handles multi-user concurrent diner sessions, persistent campaign definitions, feedback submissions, and idempotent reward receipts across deployments. Local SQLite/JSON was rejected for serverless incompatibility.

---

## Staging vs. Production Environment Finding
- **Development Target**: Flynet Staging (`https://api.staging.blackbird.xyz/flynet/v1`, OAuth `https://api.staging.blackbird.xyz/oauth`, consent `https://passport.staging.flynet.org`).
- **Final Submission Environment Requirement**: Staging is permitted by the official Blackbird Track guide: *"In your demo, make clear which parts use staging data and which are live."*
- Production credentials (`fly_live_`) require partner sign-off from Flynet, which is separate from self-serve staging credentials.

---

## Capability Matrix & Status Truth

| Capability / Component | Target / Route | Scope / Credential Required | Real Test Result | Truthful Status |
|---|---|---|---|---|
| **Deterministic Qualification Engine** | `lib/qualification.ts` | None (Pure logic) | 5/5 unit tests pass (`qualification.test.mjs`) | **COMPONENT PROVEN** |
| **Real Flynet OAuth PKCE Flow** | `/api/auth/login` + `/api/auth/callback` + `/api/auth/refresh` | `NEXT_PUBLIC_FLYNET_CLIENT_ID` + `FLYNET_CLIENT_SECRET` | Token-mediating backend pattern implemented via `@flynetdev/core` | **IMPLEMENTED / LIVE UNVERIFIED** |
| **Member Profile & Check-ins** | `/api/auth/me` (`GET /users/me`, `GET /users/me/check_ins`) | Bearer JWT (`read:profile`, `read:user_checkins`) | Implemented with embedded restaurant parsing | **IMPLEMENTED / LIVE UNVERIFIED** |
| **Restaurant Discovery via API Key** | `/api/proofs/discovery` (`GET /restaurants`) | `FLYNET_API_KEY` (`discovery`) | Implemented via `FlynetDiscoveryClient` | **IMPLEMENTED / LIVE UNVERIFIED** |
| **FLY Balance via API Key** | `/api/proofs/balance` (`GET /balance`) | `FLYNET_API_KEY` (`read:balance`) | Implemented via `FlynetDiscoveryClient` | **IMPLEMENTED / LIVE UNVERIFIED** |
| **FLY Reward Issuance & Idempotency** | `/api/proofs/reward` (`POST /issue_reward`) | `FLYNET_API_KEY` (`write:rewards`) | Implemented with in-memory / persistent replay check | **IMPLEMENTED / LIVE UNVERIFIED** |
| **Hosted Persistence (Neon Postgres)** | Prisma / Postgres (`DATABASE_URL`) | `DATABASE_URL` | Schema design ready | **DECIDED / UNPROVEN** |
| **Secret Guardrail** | `.claude/settings.json` | Local IDE config | Deny rule active for `/.env*` | **ACTIVE** |

---

## Security Boundaries & Hygiene
- `.gitignore` strictly protects `.env`, `.env.local`, `.env.*.local`, `.token`, `.key`.
- `.claude/settings.json` contains a deny permission on `Read(/.env*)`.
- Token mediation: Short-lived access token kept in memory; Refresh token kept in HttpOnly secure cookie scoped to `/api/auth`.
- Zero secrets committed to git. Working tree is clean.

---

## Next Actions
1. Human owner registers `BlackPalate` on Flynet Make (`https://make.flynet.org/`).
2. Human owner copies generated credentials directly into `C:\Users\HomePC\Desktop\BlackPalate\.env.local`.
3. Run `npm run doctor` to confirm credentials are detected.
4. Execute live end-to-end capability proofs A through G.
