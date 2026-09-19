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
**FOUNDATION PASS** (Directive 001D Complete: Public Vercel Deployment, Proven Callback, Public GitHub Repo, Token Model Verified)

---

## Public Infrastructure & Deployment Truth

### Vercel Deployment Details
- **Vercel Account Scope**: `techkeyys-projects` (Authenticated CLI: `techkeyy`)
- **Vercel Project Name**: `blackpalate`
- **Latest Deployment ID**: `dpl_GTMYfUrpBPWsxVwDo5zADDJJbt7s`
- **Actual Production URL**: `https://blackpalate.vercel.app`
- **Exact Proven OAuth Callback URL**: `https://blackpalate.vercel.app/api/auth/callback`

### Public Reachability Proofs
1. **Root URL**: `https://blackpalate.vercel.app/`
   - **Result**: `HTTP/1.1 200 OK` (Rendered HTML test harness shell)
2. **OAuth Login Route**: `https://blackpalate.vercel.app/api/auth/login`
   - **Result**: `HTTP/1.1 400 Bad Request` (`{"error":"NEXT_PUBLIC_FLYNET_CLIENT_ID is not configured in server environment."}`)
   - **Safety**: Controlled error message, zero secrets or stack traces leaked.
3. **OAuth Callback Route**: `https://blackpalate.vercel.app/api/auth/callback`
   - **Result**: `HTTP/1.1 307 Temporary Redirect` (`Location: https://blackpalate.vercel.app/?error=missing_authorization_code`)
   - **Safety**: Safe redirect on missing code, zero crash, zero stack traces.

---

## Public GitHub Repository
- **Repository URL**: `https://github.com/Techkeyy/BlackPalate`
- **Account**: `Techkeyy`
- **Visibility**: Public
- **Public Reachability Proof**: `HTTP/1.1 200 OK`
- **Pre-Publication Audit**:
  - `0` secret files committed (`.gitignore` protects all `.env*` files).
  - `0` hardcoded keys, tokens, or connection strings in git history.
  - `.claude/settings.json` deny rule active for `Read(/.env*)`.
  - Minimal truthful `README.md` published.

---

## OAuth Token-Storage Model
- **Client Secret (`FLYNET_CLIENT_SECRET`)**: Stored server-side only in environment variables (`process.env.FLYNET_CLIENT_SECRET`), never bundled or sent to the browser.
- **Refresh Token (`refresh_token`)**: Stored in an `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookie named `bp_refresh_token`, strictly scoped to `path: '/api/auth'`. Rotated on demand via `/api/auth/refresh`.
- **Access Token (`access_token`)**: Short-lived (`maxAge: 3600s`), kept in an `HttpOnly` session cookie (`bp_access_token`) for Next.js SSR and in-memory for client requests. Never persisted in `localStorage` or `sessionStorage`.

---

## Workspace & Build Health
- **Location**: `C:\Users\HomePC\Desktop\BlackPalate`
- **Toolchain**: Next.js 14.2.14, React 18.3.1, `@flynetdev/core` (0.8.1), TypeScript 5.6.2.
- **Build Status**: `npm run build` PASS (12 static/dynamic routes compiled cleanly).
- **Doctor Script**: `npm run doctor` PASS (Audits env presence, staging connectivity verified).
- **Unit Tests**: `node lib/qualification.test.mjs` PASS (5/5 deterministic qualification test cases passing).
- **Secret Guardrail**: `ACTIVE` (`.claude/settings.json`).

---

## Persistence Architecture
- **Decision**: Neon Hosted PostgreSQL via `DATABASE_URL`
- **State**: `DECIDED / UNPROVEN`
- **Rationale**: Hosted, serverless-friendly PostgreSQL handles multi-user concurrent diner sessions, persistent campaign definitions, feedback submissions, and idempotent reward receipts across deployments.

---

## Capability Matrix & Status Truth

| Capability / Component | Target / Route | Scope / Credential Required | Real Test Result | Truthful Status |
|---|---|---|---|---|
| **Public Deployment & Callback** | `https://blackpalate.vercel.app` | Vercel production | HTTP 200 / 307 verified | **INTEGRATION PROVEN (Host)** |
| **Deterministic Qualification Engine** | `lib/qualification.ts` | None (Pure logic) | 5/5 unit tests pass (`qualification.test.mjs`) | **COMPONENT PROVEN** |
| **Real Flynet OAuth PKCE Flow** | `/api/auth/login` + `/api/auth/callback` + `/api/auth/refresh` | `NEXT_PUBLIC_FLYNET_CLIENT_ID` + `FLYNET_CLIENT_SECRET` | Token-mediating backend pattern deployed & verified | **IMPLEMENTED / LIVE UNVERIFIED** |
| **Member Profile & Check-ins** | `/api/auth/me` (`GET /users/me`, `GET /users/me/check_ins`) | Bearer JWT (`read:profile`, `read:user_checkins`) | Implemented with embedded restaurant parsing | **IMPLEMENTED / LIVE UNVERIFIED** |
| **Restaurant Discovery via API Key** | `/api/proofs/discovery` (`GET /restaurants`) | `FLYNET_API_KEY` (`discovery`) | Implemented via `FlynetDiscoveryClient` | **IMPLEMENTED / LIVE UNVERIFIED** |
| **FLY Balance via API Key** | `/api/proofs/balance` (`GET /balance`) | `FLYNET_API_KEY` (`read:balance`) | Implemented via `FlynetDiscoveryClient` | **IMPLEMENTED / LIVE UNVERIFIED** |
| **FLY Reward Issuance & Idempotency** | `/api/proofs/reward` (`POST /issue_reward`) | `FLYNET_API_KEY` (`write:rewards`) | Implemented with in-memory / persistent replay check | **IMPLEMENTED / LIVE UNVERIFIED** |
| **Hosted Persistence (Neon Postgres)** | Prisma / Postgres (`DATABASE_URL`) | `DATABASE_URL` | Schema design ready | **DECIDED / UNPROVEN** |
| **Secret Guardrail** | `.claude/settings.json` | Local IDE config | Deny rule active for `/.env*` | **ACTIVE** |

---

## Next Action Required (Human Boundary)
Human owner creates the application on [Flynet Make](https://make.flynet.org/) using the exact registered callback URL `https://blackpalate.vercel.app/api/auth/callback` and inputs credentials directly into `.env.local`.
