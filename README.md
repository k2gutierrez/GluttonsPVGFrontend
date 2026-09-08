# Gluttons Frontend — FINAL CANONICAL v1.0

This is the complete frontend handoff for Carlos. It supersedes every earlier v2.x / v0.x frontend package.

## Stack
Next.js App Router (`src/`) · TypeScript · Tailwind · Wagmi · RainbowKit · Viem · Jotai.

## Canonical behavior included
- Awareness -> Community Pre-Mint -> Public Mint -> irreversible LIVE.
- `s_gameStart > 0` is the permanent LIVE latch. The local cache key is deployment-address-specific, so a new contract deployment cannot inherit the previous deployment's LIVE state.
- Runtime supply. Pre-game reads `GameEngine.MAX_SUPPLY()`; after Game Start inventory/matrix geometry uses `S`. A 100-token Curtis deployment and 2,000-token mainnet deployment use the same code.
- FASTING survives 0H before Last Supper. Failed Final Bite is death. Normal non-Fasting expiry is death.
- Poison has **NO attacker cooldown**. Attacker must have >1 game-hour and loses 1H. Normal target must have >1H and unprotected; protection/shield is read from `poisonProtectedUntil` (canonical 10H). Poisoning FASTING triggers Final Bite.
- Canonical TokenState ABI has no `poisonCooldownUntil`.
- No player-facing Reap / Register Death / Sync Corpse action. Death resolves to Fresh; corpse actions rely on canonical backend synchronization.
- Freshness bar + ROTS IN + separate Fridge timer. KEEP FRESH slows spoilage and never resets freshness.
- LIVE order: global phase/progress -> live matrix -> compact leaderboard. Full `/leaderboard` exists separately.
- Matrix population is deployment-sized, fixed by tokenId, and never reorders. Fresh/Rotten remain visible; consumed/burned becomes empty/ash.
- Inventory is wallet-owned only, paginated, RPC-resilient, and lazy-hydrates metadata after state cards paint.
- Responsive: page width never exceeds viewport; no horizontal page scroll; mobile leaderboard becomes cards.

## Configure
Copy `.env.example` to `.env.local` and set current deployment addresses.

For accelerated Curtis where **1 real minute = 1 game hour**:
```env
NEXT_PUBLIC_CHAIN_MODE=curtis
NEXT_PUBLIC_GAME_HOUR_SECONDS=60
```

For Ethereum mainnet:
```env
NEXT_PUBLIC_CHAIN_MODE=ethereum
NEXT_PUBLIC_GAME_HOUR_SECONDS=3600
NEXT_PUBLIC_ETHEREUM_RPC_URL=YOUR_RPC
```

## Run
```bash
npm install
npm run check
npm run build
npm run dev
```

## Validation
See `BUILD_NOTES_FINAL_CANONICAL_V1.0.md` for the deployment checklist.

The deployed ABI/contracts are the source of truth for callable surfaces. The package ABI is aligned to the canonical Sep 2026 TokenState layout and must be updated if Carlos changes that deployed layout.
