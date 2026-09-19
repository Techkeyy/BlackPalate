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
**DIRECTIVE 002C COMPLETE — UX REDESIGN, DARK VISUAL SYSTEM, HERO IMAGE & REACTIVE MOTION DEPLOYED**

Flynet Maker account status: **BLOCKED / AWAITING BLACKBIRD ADMIN APPROVAL**.
All credential-independent flows, full-dark visual system, reactive motion, and research marketplace UX patterns are completely hardened and deployed to production.

---

## Directive 002C Implementation Summary

### 1. Research-Backed UX Architecture (Respondent, UserTesting, Dscout)
- **Respondent Pattern**: High-information Opportunity Cards featuring prominent incentive badges (`35 FLY`), estimated duration (`45m`), real-time capacity (`5 spots left`), and clear qualification criteria boxes.
- **UserTesting Pattern**: Single obvious status progression for diners (`APPLIED` → `ACCEPTED` → `ATTENDED` → `FEEDBACK_SUBMITTED` → `REWARDED`) with primary next-action CTAs.
- **Dscout Pattern**: Progressive 7-Step Mission Builder for restaurant creators:
  1. *What are you testing?* (Tasting Title, Dish Concept, Photo URL)
  2. *What do you want to learn?* (Research Objective, Focus Areas)
  3. *Who qualifies?* (Deterministic Flynet behavioral rules: visit counts, cuisine history, new vs returning)
  4. *When & Where?* (Tasting Date, Time Window, NYC Neighborhood)
  5. *Capacity & Rewards* (Max Diners, $FLY Incentive per Diner)
  6. *Research Questions* (Custom structured prompts: Rating, Multi-choice, Yes/No, Long text)
  7. *Review & Publish* (Summary review with AI assistance)
- **Intentionally Omitted**: Cluttered crypto/token speculation charts, generic multi-column white cards, and distracting gamified visual noise.

### 2. Full-Bleed Dark Hero with Extended Length & Sourced Asset
- **Image Sourced**: `C:\Users\HomePC\Downloads\727a2da7a0dae3be5d55efe7e1c194b1.jpg` (Chef plating culinary tasting dish), safely mirrored to `public/images/blackpalate-hero.jpg`.
- **Cinematic Height & Focal Framing**: Extended hero height to `clamp(780px, 120svh, 130svh)` with `objectPosition: 'center 22%'`, ensuring the chef's delicate plating action is fully visible.
- **Top-Weighted Text & Extended Deep Fade**: Foreground copy sits gracefully in the upper 40% (`padding: clamp(110px, 15vh, 150px) 24px clamp(160px, 24vh, 280px)`), allowing the visual storytelling to breathe downward before melting smoothly into the `#080808` background via a multi-stage linear gradient.
- **Hero Presentation**: Full viewport bleed with triple-layered ambient overlays (navbar protection, soft center vignette, deep bottom fade), editorial typography (*"Get paid to shape what restaurants serve next."*), and dual action CTAs.

### 3. Dark Visual System & Culinary Aesthetics
- **Color Palette**:
  - Base background: `#080808` (Obsidian Jet)
  - Card & Container surfaces: `#121212` / `#181818` (Deep Charcoal)
  - Accent / Highlights: `#F59E0B` (Culinary Amber) / `#D97706`
  - High-Contrast Text: `#F5F5F4` (Primary) / `#A8A29E` (Muted)
  - Border Tokens: `#262626` / `#333333`
- **Zero White Card Rule**: All pages and interactive modules strictly adhere to dark theme tokens with no unstyled bright white backgrounds.

### 4. Reactive Scroll Motion & Micro-Interactions
- **Motion Primitives Module** (`components/MotionPrimitives.tsx`):
  - `Reveal`: Scroll-triggered reveal (`opacity: 0, y: 60, filter: blur(10px)` → `opacity: 1, y: 0, filter: blur(0px)`) with cubic-bezier easing (`[0.22, 1, 0.36, 1]`) and threshold triggers.
  - `StaggerContainer` & `StaggerItem`: Fluid cascade animations for marketplace card grids.
  - `InteractiveCard`: Smooth hover lift (`-3px`) and border highlight transitions.
  - `InteractiveButton`: Tactile scale on hover/tap.
- **Accessibility & Reduced Motion**: Automatically queries `useReducedMotion()`; completely bypasses transitions for users with motion sensitivity.

### 5. Strict Zero-Emoji Compliance
- Replaced all public UI and dashboard emojis with crisp, semantic Lucide SVG icons (`Compass`, `Utensils`, `Calendar`, `Coins`, `Clock`, `Users`, `ShieldCheck`, `ChefHat`, `BarChart3`, `Sparkles`, `Lock`, `Flame`, etc.).
- Enforced zero-emoji system prompts in `lib/ai.ts` for AI draft generation and synthesis.
- Verified via codebase regex audit (`0` emoji matches across `app/`, `lib/`, `components/`).

---

## Workspace & Build Health
- **Location**: `C:\Users\HomePC\Desktop\BlackPalate`
- **Toolchain**: Next.js 14.2.14, React 18.3.1, `@flynetdev/core` (0.8.1), `@neondatabase/serverless`, `framer-motion` (11.5.4), `lucide-react` (0.441.0), TypeScript 5.6.2.
- **Production URL**: `https://blackpalate.vercel.app`
- **Public GitHub Repo**: `https://github.com/Techkeyy/BlackPalate`
- **Build Status**: `npm run build` PASS (15 static and dynamic routes compiled).
- **Automated Test Suites**:
  - `node lib/campaign.test.mjs` PASS (10/10 core product, lifecycle, capacity, and duplicate prevention tests).
  - `node lib/qualification.test.mjs` PASS (5/5 deterministic qualification engine test cases).
  - `node lib/audit.test.mjs` PASS (11/11 security audit tests: IDOR isolation, duplicate join, duplicate feedback, capacity race, reward idempotency, production DB fail-closed, AI transparency, zero emoji).
  - **Total Tests**: 26/26 PASS (`npm test`).
- **Doctor Script**: `npm run doctor` PASS.
- **Secret Guardrail**: `ACTIVE` (`.claude/settings.json`).

---

## Truthful Capability Matrix

| Capability / Component | Route / Module | Scope Required | Status | Blocker / Notes |
|---|---|---|---|---|
| **Public Host & Callback** | `https://blackpalate.vercel.app` | Vercel production | **INTEGRATION PROVEN** | Live & verified |
| **Relational Persistence** | `lib/db/repository.ts` | PostgreSQL / Neon | **COMPONENT PROVEN** | Active with seed data & DB layer |
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
2. Input credentials into `.env.local`.
3. Run `npm run doctor` and execute live capability proofs (Proofs A through G).
