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
Restaurants can collect reviews and survey opinions, but ordinary surveys and recruitment cannot reliably prove that participants are members of the actual customer segment the restaurant wants to understand (e.g. frequent patrons of high-end Italian dining in NYC, or exploratory diners who have never visited a competitor).

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
**Directive 001**: Foundation, official-document grounding, local-skill intake, and Flynet capability proof.

---

## Local Skills Discovered & Extracted

**Discovered Skill Directory**: `C:\Users\HomePC\Desktop\skill`

### 1. `audit-skill` (`C:\Users\HomePC\Desktop\skill\audit-skill\SKILL.md`)
- **Read & Understood**: Yes.
- **Key Requirements**:
  - Distinguish facts from claims: every statement in documentation/README is a test case to be verified against reality.
  - Zero tolerance for debug leftovers (`TODO`, `FIXME`, bare `unwrap`/`panic`, secrets in git history).
  - Claim verification against live endpoints, test count matching, and honest reporting of limitations.
- **Impact on Build**:
  - We will implement automated doctor/self-check routines.
  - No claims of passing integrations without live verifiable proof.

### 2. `build-process` (`C:\Users\HomePC\Desktop\skill\build-process\SKILL.md`)
- **Read & Understood**: Yes.
- **Key Requirements**:
  - Build the risky core first (Flynet OAuth + Check-in history parsing + Deterministic Qualification + Reward issuance).
  - Deterministic core, optional AI: Rules decide; AI only synthesizes/drafts.
  - Every user flow requires 4 states: Loading, Success, Empty, Error.
  - 90-Second Build Rule: Value must be reachable in under 90 seconds without configuration friction.
  - Working demo before expansion; never fake success.
- **Impact on Build**:
  - Pure logic for campaign rule evaluation isolated and unit tested.
  - AI scoped strictly to drafting campaign descriptions and summarizing feedback reports.

### 3. `perfect-readme` (`C:\Users\HomePC\Desktop\skill\perfect-readme\SKILL.md`)
- **Read & Understood**: Yes.
- **Key Requirements**:
  - Proof before prose: Link bar at top (Live site, Demo video, Real output).
  - Numbered pipeline (verb, mechanism, output).
  - Adversarial trust table: "How I tried to break it" with real edge cases.
  - Differentiator visible in the first scroll.
- **Impact on Build**:
  - README will follow the exact structured template with live verification links, architecture table, and adversarial edge case table.

### 4. `design-skill` (`C:\Users\HomePC\Desktop\skill\design-skill\SKILL.md`)
- **Read & Understood**: Yes.
- **Key Requirements**:
  - Product-specific hospitality/research identity: Reject generic purple Web3 gradients, glowing orbs, and crypto dashboards.
  - One clear primary action per screen.
  - Human copy without jargon; no long dashes (en/em dashes) in UI text.
  - Full support for mobile responsive layouts and semantic accessibility.
- **Impact on Build**:
  - Aesthetic will follow a refined, editorial culinary marketplace tone (clean typography, rich photography, clear state feedback).

### 5. `project-understanding` (`C:\Users\HomePC\Desktop\skill\project-understanding\SKILL.md`)
- **Read & Understood**: Yes.
- **Key Requirements**:
  - One sentence product thesis.
  - Technology necessity test: Classify every piece (Load-bearing vs. Decorative).
  - Explicit trust model: Name what is centralized, what relies on Flynet, and what is deterministic.
  - Non-goals in writing.
- **Impact on Build**:
  - Flynet is load-bearing for dining history and token reward rails.
  - Web3 complexity hidden behind natural diner and operator experiences.

### 6. `project-edge` (`C:\Users\HomePC\Desktop\skill\project-edge\SKILL.md`)
- **Read & Understood**: Yes.
- **Key Requirements**:
  - Differentiate against rivals and standard track submissions.
  - Do not merely build a dining guide or passport: BlackPalate is a two-sided dining research economy.
  - Verify every submission checklist item.
- **Impact on Build**:
  - Strong differentiation: Direct economic incentives ($FLY) tied to cryptographically/authoritatively verified physical dining proof.

### 7. `hackathon-onboarding` (`C:\Users\HomePC\Desktop\skill\hackathon-onboarding\SKILL.md`)
- **Read & Understood**: Yes.
- **Key Requirements**:
  - Audit machine and verify official dependencies before starting.
  - Clean environment isolation, safe secret hygiene (.gitignore before commit).
  - Smoke test external APIs and SDKs before building product layers.
- **Impact on Build**:
  - Flynet npm skills and rules installed (`@flynetdev/skills`).
  - Staging environment verified live.

---

## Official Hackathon & Flynet Grounding

### Official Hackathon Requirements (Verified from `https://runtime.nyc/handbook` & `/tracks/blackbird`)
1. **Organizer & Dates**: Runtime NYC, September 13–19, 2026.
2. **Submission Deadline**: `2026-09-20T00:00:00-04:00` (Midnight EDT Saturday night).
3. **Demo Day**: Live demos at 5:00 PM EDT on Saturday, September 19, 2026.
4. **Track Requirements for Blackbird / Best Use of Flynet**:
   - Use Flynet API or SDK in a working project.
   - Clearly demonstrate where Flynet powers the experience.
   - Select Blackbird on the Runtime submission form.
   - Public recorded video demo required for online submissions (Loom/YouTube/X).
   - Public repository with integration walkthrough.

### Official Flynet Documentation Findings (Verified from `https://docs.flynet.org/llms.txt`)
1. **Authentication Architecture**:
   - **Discovery routes (`/restaurants*`, `/locations*`)**: Require `X-API-Key` (server-side only, `fly_test_` or `fly_live_`).
   - **Member routes (`/users/me/*`, `/payment_intents/*`)**: Require OAuth 2.0 Bearer JWT with PKCE (`code_challenge` / `code_verifier`).
   - **Venue feed routes (`/check_ins`, `/check_ins/{id}`)**: Require `X-API-Key` with `read:checkins` scope.
   - **OAuth Scopes**: `read:profile` (profile + status), `read:user_checkins` (personal check-in history), `read:wallets` (FLY wallets).
   - **Auth Error Envelopes**: Missing bearer/key returns HTTP 401 with **empty body** and reason in `WWW-Authenticate` header (not JSON). Scope errors return HTTP 403 `insufficient_scope`.
2. **Environments**:
   - **Staging**:
     - API Base: `https://api.staging.blackbird.xyz/flynet/v1`
     - OAuth Base: `https://api.staging.blackbird.xyz/oauth`
     - Consent Host: `https://passport.staging.flynet.org`
     - JWT Issuer: `https://api-staging.blackbird.xyz`
   - **Production**:
     - API Base: `https://api.blackbird.xyz/flynet/v1`
     - OAuth Base: `https://api.blackbird.xyz/oauth`
     - Consent Host: `https://passport.flynet.org`
     - JWT Issuer: `https://api.blackbird.xyz`
3. **Data Models for BlackPalate**:
   - `GET /users/me/check_ins`: Returns array of `check_in` objects. Each check-in embeds `location` with its `restaurant` (`id`, `name`) and `neighborhood`.
   - `GET /restaurants`: Returns restaurant list including `id`, `name`, `cuisine` (array of strings e.g. `["American"]`), `cohort`, `price`, `tags`, `asset` images, and `website_url`.
   - **Qualification Resolution**: Authenticated diner check-ins are correlated against restaurant metadata to evaluate deterministic rules (e.g. `>= 2 visits to Japanese venues`, `visited Anton's in the past 60 days`).
4. **Reward & Balance Primitives**:
   - `GET /balance`: Returns app wallet FLY balance (in 18-decimal wei string) and USD value. Requires API key with `read:balance`.
   - `POST /issue_reward`: Immediately transfers FLY from app wallet to target `user_id`. Requires API key with `write:rewards`. Uses `idempotency_key` for safe retries. Rewards are irreversible.

---

## AI Tooling Status
- **Flynet Docs MCP**: Configured (`https://docs.flynet.org/mcp`).
- **Flynet API MCP**: Package available (`@flynetdev/mcp`).
- **Flynet Agent Skill**: Installed at `.claude/skills/flynet/SKILL.md` via `npx @flynetdev/skills`.
- **Flynet Cursor Rules**: Installed at `.cursor/rules/flynet.mdc`.

---

## Credential Inventory & Environment Status

| Credential / Item | Expected Scope / Type | Presence in Environment | Source / How to Obtain |
|---|---|---|---|
| Flynet Staging API Key | `read:restaurants`, `read:locations`, `read:balance`, `write:rewards` | **MISSING** | Register application at `https://make.flynet.org/` |
| Flynet OAuth Client ID | Staging UUID | **MISSING** | Register application at `https://make.flynet.org/` |
| Flynet OAuth Client Secret | Server-side secret string | **MISSING** | Generated upon app creation at `https://make.flynet.org/` |
| Flynet Redirect URI | e.g. `http://localhost:3000/api/auth/callback` | Configured in template | Must be registered at `https://make.flynet.org/` |
| Flynet Merchant ID | App Wallet UUID | **MISSING** | Provisioned with Flynet app in Make dashboard |
| DeepSeek / OpenAI API Key | LLM for drafting & synthesis | **PRESENT** (`BREAKFIX_DEEPSEEK_API_KEY`) | Local environment |

*Note: In accordance with Director rules, real Flynet integration calls requiring credentials cannot be claimed as passed until valid staging credentials are provided.*

---

## Required Capability Matrix

| Capability | Needed for BlackPalate | Officially Documented | Credential Available | Real Call Tested | Status | Blocker / Notes |
|---|---|---|---|---|---|---|
| **List restaurants** | Yes (Discovery & metadata) | Yes (`GET /restaurants`) | Missing | Yes (unauth 401 verified) | **DOCUMENTED** | Need Staging API Key (`fly_test_`) |
| **Restaurant cuisine metadata** | Yes (Deterministic qualification) | Yes (`cuisine`, `tags`, `price`) | Missing | Inspected OpenAPI / docs | **DOCUMENTED** | Returned on `GET /restaurants` |
| **OAuth member login** | Yes (Diner identification) | Yes (`/oauth/authorize` PKCE) | Missing | Endpoints verified | **DOCUMENTED** | Need `client_id` & `client_secret` from make.flynet.org |
| **Member profile** | Yes (`/users/me`) | Yes (`read:profile` scope) | Missing | Awaiting OAuth | **DOCUMENTED** | Requires member OAuth bearer token |
| **Member check-in history** | Yes (`/users/me/check_ins`) | Yes (`read:user_checkins` scope) | Missing | Awaiting OAuth | **DOCUMENTED** | Embedded location & restaurant object |
| **Map check-in → restaurant** | Yes (Behavior verification) | Yes (embedded in check-in) | Missing | Direct 1-to-1 payload | **DOCUMENTED** | No multi-hop query needed |
| **Venue/check-in lookup** | Optional / Supplementary | Yes (`GET /check_ins` with key) | Missing | Awaiting API key | **DOCUMENTED** | API key route with `read:checkins` |
| **App FLY balance** | Yes (for campaign funding) | Yes (`GET /balance`) | Missing | Awaiting API key | **DOCUMENTED** | Requires `read:balance` scope |
| **Issue FLY reward** | Yes (settlement on feedback) | Yes (`POST /issue_reward`) | Missing | Awaiting API key | **DOCUMENTED** | Requires `write:rewards` scope + funded wallet |
| **Production access** | Post-hackathon | Gated approval | Missing | Staging target for build | **UNVERIFIED** | Staging is sufficient for Runtime judging |

---

## Real Call Evidence

1. **Endpoint**: `GET https://api.staging.blackbird.xyz/flynet/v1/restaurants`
   - **Environment**: Staging
   - **Credential Type**: None (Unauthenticated probe)
   - **Result**: `HTTP/1.1 401 Unauthorized`
   - **Headers Verified**: `WWW-Authenticate: Bearer resource_metadata="https://api.staging.blackbird.xyz/.well-known/oauth-protected-resource"`
   - **Body**: Empty (0 bytes)
   - **Status**: **PASS (Behavior matches official Flynet documentation exactly)**

2. **Skill / Rule Tooling Installation**:
   - **Command**: `npx -y @flynetdev/skills`
   - **Result**: Successfully generated `.claude/skills/flynet/SKILL.md` and `.cursor/rules/flynet.mdc`.
   - **Status**: **PASS**

---

## Project-Edge Analysis

1. **What existing Flynet feature/product comes closest to BlackPalate?**
   - The *User Passport* / *Member Dining App* recipe showcases past check-in history and wallet badges.
   - *Payment Intents* allow direct FLY checkout at POS.
2. **What existing external restaurant tasting/research product comes closest?**
   - Traditional mystery shopping services (e.g. Secret Shopper), restaurant market research agencies, and self-reported Yelp/Google reviews.
3. **What part of BlackPalate remains structurally differentiated?**
   - **Verifiable Proof of Dining Profile**: Diners cannot lie about their past restaurant habits; eligibility is cryptographically/authoritatively derived from Blackbird's real check-in graph.
   - **Immediate Onchain Settlement**: Once structured, high-value tasting feedback is submitted, rewards are programmatically disbursed in $FLY via Flynet.
   - **Targeted Culinary Intelligence**: Restaurants reach specific diner cohorts (e.g., Italian cuisine enthusiasts, omakase regulars) without cold recruiting.
4. **Is our differentiator visible in the user flow?**
   - Yes: During onboarding, diners see their real verified badges/qualifications computed from their Blackbird check-ins, and restaurants see deterministic qualification criteria on their campaign creation dashboard.
5. **Does any discovery materially invalidate the concept?**
   - No. The data model (`/users/me/check_ins` embedding restaurant ID + name, and `/restaurants` providing cuisine/tags) directly supports the complete qualification loop.

---

## Proposed Minimal Architecture

- **Framework**: Next.js 14+ (App Router) with TypeScript.
- **Styling**: Tailwind CSS configured to our custom culinary palette (warm charcoal `#121212`, bone cream `#F7F5F0`, amber accent `#D97706`).
- **Flynet Integration**:
  - `@flynetdev/core` for backend API and OAuth client operations.
  - Server-side route handlers (`/api/auth/*`, `/api/campaigns/*`, `/api/rewards/*`, `/api/diner/qualify`) protecting `FLYNET_API_KEY` and `FLYNET_CLIENT_SECRET`.
- **Database / State**: SQLite via Prisma or lightweight JSON/D1 storage for tasting campaigns, application state, and structured feedback records.
- **AI Synthesis**: DeepSeek/OpenAI API route for turning research goals into campaign drafts and aggregating submitted diner feedback into actionable executive summaries.
- **Deployment**: Vercel-ready with single-command local run (`npm run dev`).

---

## Security Boundaries & Hygiene
- `.gitignore` configured and verified to ignore all `.env*` files, keys, and tokens.
- `.env.example` created with sanitized variable descriptions.
- Zero secrets stored in git repository or `director.md`.
- Strict separation: `FLYNET_API_KEY` and `FLYNET_CLIENT_SECRET` will only ever be executed on Node.js / server runtime, never in React client components.

---

## Stop Conditions & Blockers
- **Stop Condition Check**: All core Flynet primitives (`/users/me/check_ins`, `/restaurants`, `/issue_reward`, `/balance`) are officially documented and supported. No blocking protocol limitation discovered.
- **Immediate Blocker**: Real end-to-end live testing of authenticated endpoints requires staging credentials from `https://make.flynet.org/` (`FLYNET_API_KEY`, `FLYNET_CLIENT_ID`, `FLYNET_CLIENT_SECRET`).

---

## Next Actions
1. Obtain/input Flynet staging credentials into `.env.local`.
2. Execute Directive 002: Project scaffolding, core deterministic qualification engine, and Flynet live client smoke test.
