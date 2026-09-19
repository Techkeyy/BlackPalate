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
**DIRECTIVE 002A COMPLETE — PRODUCT EXPERIENCE & PERSISTENCE OPERATIONAL WHILE AWAITING BLACKBIRD APPROVAL**

Flynet Maker account status: **BLOCKED / AWAITING BLACKBIRD ADMIN APPROVAL**.
All credential-independent product flows, database persistence, sensory feedback pipelines, AI drafting/synthesis, responsive UI views, and test suites are built, verified, and deployed.

---

## Workspace & Build Health
- **Location**: `C:\Users\HomePC\Desktop\BlackPalate`
- **Toolchain**: Next.js 14.2.14, React 18.3.1, `@flynetdev/core` (0.8.1), `@neondatabase/serverless`, TypeScript 5.6.2.
- **Production URL**: `https://blackpalate.vercel.app`
- **Public GitHub Repo**: `https://github.com/Techkeyy/BlackPalate`
- **Build Status**: `npm run build` PASS (15 static and dynamic routes compiled).
- **Automated Test Suites**:
  - `node lib/campaign.test.mjs` PASS (10/10 core product, lifecycle, capacity, and duplicate prevention tests).
  - `node lib/qualification.test.mjs` PASS (5/5 deterministic qualification engine test cases).
  - **Total Tests**: 15/15 PASS.
- **Doctor Script**: `npm run doctor` PASS.
- **Secret Guardrail**: `ACTIVE` (`.claude/settings.json`).

---

## Design System & UX Standards (Applied from Local Skills)
- **Visual Identity**: Modern culinary research marketplace. Editorial typography, warm culinary amber accents (`#F59E0B`, `#D97706`), deep obsidian slate surfaces (`#0F172A`, `#0B0F17`), accessible high-contrast text, clear qualification badges.
- **Tone**: Trustworthy, food/hospitality-oriented, contemporary. No crypto/DeFi clutter.
- **Responsive Behavior**: Mobile and desktop friendly layouts with tap-friendly controls and accessible states.

---

## Pages & User Flows Implemented
1. **Page 1 — Landing / Entry Flow**: Editorial hero explaining BlackPalate ("Get paid to shape what restaurants serve next"), value pillars, dual CTAs (*Find Tastings*, *Create a Tasting*).
2. **Page 2 — Diner Discover (Marketplace)**: Real database-backed cards displaying tasting titles, restaurants, NYC neighborhoods, timing, available spots, $FLY rewards, and qualification summaries.
3. **Page 3 — Tasting Detail**: Detailed view with research focus, time commitment, reward, deterministic qualification requirements, questions preview, and dynamic action states.
4. **Page 4 — My Tastings (Diner Dashboard)**: Grouped into *Upcoming*, *Needs Action*, and *Completed* sessions with obvious next-step actions.
5. **Page 5 — Restaurant Create Tasting (Campaign Builder)**: Human-labeled form supporting deterministic rules (min check-ins, cuisine visits, new-to-venue), capacity, rewards, timing, and custom questions.
6. **Page 6 — AI Campaign Drafting**: Integrated AI assistant (`/api/ai/draft-campaign`) translating freeform dish concepts into campaign specifications and research questions.
7. **Page 7 — Restaurant Campaign Dashboard**: Real campaign management, capacity tracking, privacy-minimized participant records, and attendance states.
8. **Page 8 — Feedback Flow**: Focused structured questionnaire (ratings, scale, yes/no, choice, text notes) persisting to database with duplicate prevention.
9. **Page 9 — Restaurant Results & AI Synthesis**: Executive consensus summary, flavor analysis, behavioral cohort trends, actionable chef recommendations, and raw submitted responses table.
10. **Page 10 — System Diagnostics & State Matrix**: Authentic monitor reflecting Blackbird admin approval status.

---

## Truthful Capability Matrix

| Capability / Component | Route / Module | Scope Required | Status | Blocker / Notes |
|---|---|---|---|---|
| **Public Host & Callback** | `https://blackpalate.vercel.app` | Vercel production | **INTEGRATION PROVEN** | Live & verified |
| **Relational Persistence** | `lib/db/repository.ts` | PostgreSQL / Neon | **COMPONENT PROVEN** | Active with seed data & DB layer |
| **Deterministic Qualification Engine** | `lib/qualification.ts` | Pure Logic | **COMPONENT PROVEN** | 5/5 unit tests pass |
| **Product Lifecycle & Capacity Rules** | `lib/campaign.test.mjs` | Pure Logic / DB | **COMPONENT PROVEN** | 10/10 unit tests pass |
| **AI Campaign Architect & Synthesis** | `lib/ai.ts` | DeepSeek / OpenAI | **COMPONENT PROVEN** | Operational with heuristic fallbacks |
| **Flynet OAuth PKCE** | `/api/auth/login` + `/callback` | `NEXT_PUBLIC_FLYNET_CLIENT_ID` | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **Member Profile & Check-ins** | `/api/auth/me` | `read:profile read:user_checkins` | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **Restaurant Discovery** | `GET /restaurants` | `FLYNET_API_KEY` (`discovery`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **FLY Balance Inquiries** | `GET /balance` | `FLYNET_API_KEY` (`read:balance`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |
| **FLY Reward Issuance & Idempotency**| `POST /issue_reward` | `FLYNET_API_KEY` (`write:rewards`) | **IMPLEMENTED / AWAITING APPROVAL** | Blocked on Flynet Make approval |

---

## Next Recommended Action
Awaiting Blackbird admin approval in Flynet Make. Once approved:
1. Generate Staging API key (`fly_test_...`) and OAuth Client ID / Secret with redirect URI `https://blackpalate.vercel.app/api/auth/callback`.
2. Input credentials into `.env.local`.
3. Run `npm run doctor` and execute live capability proofs (Proofs A through G).
