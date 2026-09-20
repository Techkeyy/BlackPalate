# BlackPalate

Recruit diners by what they have actually eaten.

**[Live App](https://blackpalate.vercel.app)** · **[GitHub](https://github.com/Techkeyy/BlackPalate)**

## What BlackPalate does

BlackPalate is a two-sided restaurant research marketplace. Restaurants create
tasting opportunities, diners connect Blackbird, Flynet check-in history
determines qualification, qualified diners apply, and restaurant operators
review and confirm applicants.

> How does a restaurant recruit people who actually have the dining experience
> it needs, without trusting a self-reported survey?

Traditional research recruitment asks people what they eat. BlackPalate can
use verified Blackbird/Flynet dining history instead, so qualification is
based on a provider-backed history boundary rather than a claim typed into a
form.

Built for Runtime NYC 2026, Blackbird track: Best Use of Flynet.

## What it does

1. A restaurant operator signs in with Google through managed Neon Auth.
2. The operator creates a restaurant workspace and a tasting research mission.
3. A diner connects their Blackbird account through Flynet OAuth.
4. The server reads the member profile and check-in history from Flynet.
5. Deterministic rules evaluate the campaign requirements.
6. A qualified diner applies to the tasting.
7. The restaurant sees the persisted application and can confirm it.
8. The diner sees the same application status in My Tastings.
9. After a real visit, Flynet check-ins can provide the attendance boundary
   needed for feedback.
10. Completed feedback can become eligible for FLY reward settlement when the
    reward provider is configured and the attendance requirement is satisfied.

The final owner human UAT covered steps 1 through 8 in production. It did not
exercise a real physical tasting check-in at the campaign venue or issue a
live reward.

## Why Flynet is load-bearing

Flynet is part of the product boundary, not a decorative integration. It
supplies the Blackbird member OAuth identity, real member check-in history,
restaurant and network metadata where used, and the attendance evidence
boundary. The server also contains the FLY reward rail and stable
application-based idempotency, but no live FLY reward issuance was claimed in
the final owner UAT.

An HTTP 200 response with an empty check-in list is a valid empty history. It
does not become a provider error. A campaign that requires history evaluates
the empty list as not qualified, while a first-time diner campaign can still
qualify a member with no previous visits.

## Dual identity in one browser

A person may have both identities at once:

- a Google/Neon restaurant operator identity;
- a Blackbird/Flynet diner identity.

BlackPalate resolves them independently. It does not merge users by email or
attach a Flynet identity to a Google user.

Navigation selects the relevant capability:

- Discover, My Tastings, tasting detail, qualification, and apply use the diner
  identity;
- Create Tasting and Restaurant Studio use the restaurant identity.

The two sessions remain available in the same browser, so opening Restaurant
Studio does not log out the diner session and opening My Tastings does not
replace the restaurant operator.

## Architecture

| Module | Job |
| --- | --- |
| `app/api/auth/[...path]/route.ts` | Mount managed Neon Auth handlers |
| `app/api/auth/login*` and `callback` | Complete Flynet OAuth and PKCE handoff |
| `middleware.ts` | Complete the Neon verifier and session handoff |
| `lib/flynet.ts` | Configure Flynet OAuth and discovery clients |
| `lib/flynet-member.ts` | Fetch raw member profile and check-in data |
| `lib/auth/diner.ts` | Resolve a Flynet member to an internal diner |
| `lib/auth/neon-server.ts` | Configure the server-side Neon Auth client |
| `lib/qualification.ts` | Evaluate deterministic dining-history rules |
| `lib/db/repository.ts` | Persist users, restaurants, campaigns, applications, and rewards |
| `app/api/campaigns/*` | Serve campaign, qualification, application, and feedback flows |
| `app/api/restaurants/route.ts` | Create restaurant workspaces |
| `scripts/doctor.mjs` | Check local configuration and Flynet reachability |
| `scripts/migrate.mjs` | Apply `lib/db/schema.sql` and seed explicit demo records |

The normal marketplace filters out demo campaigns. The separate Live Flynet
Demo is read-only and does not create applications, slots, feedback, or
rewards.

## How I tried to break it

| Case | Result |
| --- | --- |
| Member has zero check-ins | Valid empty history, not provider failure |
| Campaign requires two visits and the member has zero | Deterministically not qualified |
| First-time diner campaign with zero history | Can qualify when the rule allows it |
| Provider failure versus empty history | Kept as distinct states |
| Duplicate application | Blocked by the application boundary |
| Duplicate feedback submission | Blocked and kept idempotent |
| Restaurant manages another workspace | Forbidden by membership checks |
| Google and Blackbird are both connected | Both identities are preserved |
| Pending reward or zero live balance | No fake transaction hash or successful issuance |

These cases are covered by the repository's unit, security, workflow, auth,
and error-handling tests. Run `npm test` to execute the supported suite.

## Current limits

- The final owner journey did not include a real physical tasting check-in at
  the campaign venue, so attendance verification was not completed in that
  journey.
- The Flynet app wallet balance observed during the build was 0 FLY, so no live
  reward issuance is claimed.
- The isolated Neon integration suite skips when `TEST_DATABASE_URL` is not
  configured. It never falls back to the production `DATABASE_URL`.

## Quickstart

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env.local
```

Provide the following variable types in `.env.local`:

- Flynet environment, API key, OAuth client ID, OAuth client secret, redirect
  URI, and approved scopes;
- Neon Auth base URL and cookie secret;
- hosted PostgreSQL `DATABASE_URL`;
- an isolated `TEST_DATABASE_URL` only when running real integration tests.

### Check and run

```bash
npm run doctor
npm run dev
```

The doctor reports credential presence without printing values and performs an
unauthenticated Flynet reachability check.

### Test and build

```bash
npm test
npx tsc --noEmit
npm run build
```

For a database migration or explicit demo seed, use `npm run migrate` only
against the intended database.

## Security and trust boundaries

- Flynet and Neon credentials remain server-side.
- OAuth tokens are stored in HttpOnly cookies.
- The client cannot choose an arbitrary user identity for application
  ownership.
- Restaurant mutations require workspace membership.
- Diner and restaurant identities are not auto-merged by email.
- Reward execution uses a stable application-based idempotency key.

## License

No license is currently declared in this repository.
