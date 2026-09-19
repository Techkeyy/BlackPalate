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
**BUILDING**

## Current Phase
**Directive 001B**: Stable public callback setup, Flynet Make application provisioning instructions, minimal Next.js test harness build, production persistence architecture correction, and capability proof readiness.

---

## Workspace & Build Health
- **Location**: `C:\Users\HomePC\Desktop\BlackPalate`
- **Toolchain**: Next.js 14.2.14, React 18.3.1, `@flynetdev/core` (0.8.1), TypeScript 5.6.2.
- **Build Status**: `npm run build` PASS (Compiled with zero type/lint errors, 11 static/dynamic routes generated).
- **Doctor Script**: `npm run doctor` PASS (Audits env presence, staging connectivity verified).
- **Unit Tests**: `node lib/qualification.test.mjs` PASS (5/5 deterministic qualification test cases passing).

---

## Public OAuth Callback & Environment Truth

### Expected Callback Shape
`https://<stable-blackpalate-domain>/api/auth/callback`
- **Primary Stable Target**: `https://blackpalate.vercel.app/api/auth/callback` (or custom deployment domain)
- **Local Dev Relay (if tunnel active)**: `https://<tunnel-domain>/api/auth/callback`

### Human Action Required on Flynet Make (`https://make.flynet.org/`)
1. **App Name**: `BlackPalate`
2. **Product Description**:
   > BlackPalate is a marketplace for restaurant tasting and research opportunities. Restaurants recruit diners using verified Flynet dining behavior, diners attend tastings and provide structured feedback, and qualified completed participation can be rewarded in FLY.
3. **OAuth / Member Scopes to Request**:
   - `read:profile`
   - `read:user_checkins`
   - `read:wallets` (optional/if needed for wallet balance display)
4. **API Key / App Scopes to Request**:
   - `restaurant/location discovery`
   - `read:balance`
   - `write:rewards`
   - `read:checkins` (if venue check-in feed is utilized)
5. **Registered Redirect URI**: Register `https://blackpalate.vercel.app/api/auth/callback` (and any active tunnel callback URI).
6. **Secret Handling**: Copy the `API Key` (prefix `fly_test_`) and `client_secret` immediately upon generation and insert directly into `C:\Users\HomePC\Desktop\BlackPalate\.env.local`. Do not paste secret values into chat.

---

## Persistence Architecture Correction

### Decision: Neon Hosted PostgreSQL via `DATABASE_URL`
- **Rejected**: Local SQLite / ephemeral JSON storage (incompatible with serverless production and multi-user concurrent state).
- **Rationale**:
  - Hosted, serverless-friendly PostgreSQL (e.g. Neon / Supabase).
  - Handles multi-user concurrent diner sessions, persistent campaign definitions, feedback submissions, and idempotent reward receipts across deployments.
  - Retains a minimal single-database schema without overengineering.

---

## Staging vs. Production Environment Finding
- **Development Target**: Flynet Staging (`https://api.staging.blackbird.xyz/flynet/v1`, OAuth `https://api.staging.blackbird.xyz/oauth`, consent `https://passport.staging.flynet.org`).
- **Final Submission Environment Requirement**: **UNVERIFIED** / Permissive of Staging.
  - Official Blackbird Track guide specifically states: *"In your demo, make clear which parts use staging data and which are live."*
  - Production credentials (`fly_live_`) require partner sign-off from Flynet, which is separate from self-serve staging credentials.

---

## Capability Matrix & Proof Sequence Status

| Capability / Proof | Target Endpoint | Scope / Credential Required | Real Test Result | Status | Blocker / Notes |
|---|---|---|---|---|---|
| **Proof A: Restaurant Discovery** | `GET /restaurants` | `FLYNET_API_KEY` | Unauth probe returns 401 | **COMPONENT PROVEN** (Harness ready) | Awaiting `FLYNET_API_KEY` in `.env.local` |
| **Proof B: Real OAuth PKCE** | `/oauth/authorize` + `/oauth/token` | `NEXT_PUBLIC_FLYNET_CLIENT_ID` + `FLYNET_CLIENT_SECRET` | Route `/api/auth/login` & `/api/auth/callback` implemented & built | **COMPONENT PROVEN** (Harness ready) | Awaiting Client ID & Secret from Make |
| **Proof C: Member Identity** | `GET /users/me` | Bearer JWT (`read:profile`) | `/api/auth/me` implemented | **COMPONENT PROVEN** (Harness ready) | Awaiting OAuth consent |
| **Proof D: Member Check-ins** | `GET /users/me/check_ins` | Bearer JWT (`read:user_checkins`) | Schema & embedded restaurant parser verified | **COMPONENT PROVEN** (Harness ready) | Awaiting OAuth consent |
| **Proof E: Deterministic Qualification** | Local qualification engine | None (Pure logic on check-in array) | 5/5 unit tests pass (`qualification.test.mjs`) | **INTEGRATION PROVEN (Logic)** | Evaluates real check-ins once authenticated |
| **Proof F: App FLY Balance** | `GET /balance` | `FLYNET_API_KEY` (`read:balance`) | `/api/proofs/balance` implemented | **COMPONENT PROVEN** (Harness ready) | Awaiting `FLYNET_API_KEY` with balance scope |
| **Proof G: FLY Reward & Idempotency** | `POST /issue_reward` | `FLYNET_API_KEY` (`write:rewards`) | `/api/proofs/reward` implemented with replay check | **COMPONENT PROVEN** (Harness ready) | Awaiting funded wallet & reward scope |

---

## Security Boundaries & Hygiene
- `.gitignore` strictly protects `.env`, `.env.local`, `.env.*.local`, `.token`, `.key`.
- `.env.example` updated with clean documentation, removing assumptions of mandatory merchant IDs.
- Token mediation: Short-lived access token kept in memory / HttpOnly session cookie; Refresh token kept in HttpOnly secure cookie.
- Zero secrets committed to git. Working tree is clean.

---

## Next Actions
1. Human owner creates app at `https://make.flynet.org/` and enters credentials in `.env.local`.
2. Run `npm run doctor` to verify credential presence.
3. Trigger live capability proofs A, B, C, D, E, F, G on the test harness.
