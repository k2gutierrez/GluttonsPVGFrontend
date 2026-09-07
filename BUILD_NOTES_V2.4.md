# Gluttons Frontend V2.4 — Curtis stress-test changes

## Why
A wallet may own all 2,000 Gluttons during Curtis testing. Reading the complete supply in one multicall can exceed testnet RPC payload/gas limits even if Multicall3 configuration is fixed.

## Implementation
- `useOwnedGluttons.ts`: progressive 50-token scanning and hydration.
- `balanceOf(wallet)`: exact wallet inventory count.
- `ownerOf(id)`: only 50 token IDs per scan page.
- Inspector / GameEngine state / tokenURI: only hydrate owned IDs from that page, max 50.
- All multicalls set `deployless: true`.
- Scroll `IntersectionObserver` triggers next inventory page; manual button is fallback.
- Actions refresh only already-loaded positions, so Feed/Poison/Reap/KEEP FRESH do not reset a deep inventory scan.
- `FULL RESCAN` is available when ownership itself may have changed.
- `/inspect` added as a public token-ID reader.

## Local validation
Run:

```bash
npm run check
npm run build
npm run dev
```

The generation environment could not complete `npm install` because the registry timed out. A TypeScript compiler syntax pass over all 28 TS/TSX source files found zero syntax errors.
