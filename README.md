# BlackPalate

> **BlackPalate** is a culinary research and tasting marketplace built on Flynet, where restaurants recruit diners based on verified on-chain dining behavior and reward tasting participation in \$FLY.

## Hackathon
- **Event**: Runtime NYC (September 19, 2026)
- **Track**: Blackbird / Best Use of Flynet

## Architecture & Integration
- **Framework**: Next.js 14 (App Router), React 18, TypeScript.
- **Flynet Integration**: `@flynetdev/core` (FlynetOAuth, FlynetMemberClient, FlynetDiscoveryClient).
- **OAuth Architecture**: Token-mediating backend pattern with PKCE and HttpOnly secure cookie rotation for refresh tokens.
- **Qualification Engine**: Deterministic behavioral rules engine evaluating real Blackbird/Flynet dining history.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local` and configure your credentials from [Flynet Make](https://make.flynet.org/):
```bash
cp .env.example .env.local
```

### 3. Run Doctor Check
```bash
npm run doctor
```

### 4. Run Development Server
```bash
npm run dev
```
