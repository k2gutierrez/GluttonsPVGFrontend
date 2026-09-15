# Gluttons Frontend FINAL CANONICAL v1.0.2

## Purpose
This build is aligned to the corrected Carlos contract surface and specifically hardens protocol-stage resolution and Curtis RPC behavior.

## Critical stage-sync change
The website no longer decides PRE-MINT / PUBLIC MINT / LIVE from a large multicall, wallet state, Inspector state, or browser defaults.

1. On boot it performs a direct `GameEngine.s_gameStart()` read with fast retry.
2. `s_gameStart > 0` permanently locks the deployment to LIVE.
3. The LIVE cache is keyed by chain ID + GameEngine address and is only a same-deployment boot hint.
4. If a fresh browser has no cache, Mint UI is not allowed to render until `s_gameStart`, `s_preMintEnd`, `s_totalMinted`, and `MAX_SUPPLY` have been resolved onchain.
5. If the RPC temporarily fails, the app displays SYNCING / last confirmed LIVE state. It never falls back to PRE_GAME, 0/2,000, or a guessed mint phase.
6. Once LIVE, no failure can move the frontend backwards to Mint.

## Global reads
Global phase is now read directly from `GameEngine.currentPhaseCode()` rather than depending on Inspector for stage authority. The frontend also reads:
- `GAME_HOUR()`
- `lastSupperWarningAt()`
- `lastSupperAt()`
- `lastSupperPopulationThreshold()`
- `trucePopulationThreshold()`

The Inspector remains the canonical aggregate for token-facing read UX, but it cannot decide which website stage to show.

## RPC resilience
- Fast direct `eth_call` stage probe.
- Deployless multicall for efficient global snapshots.
- Automatic individual-read fallback if the multicall endpoint fails.
- Inventory already uses recursive batch splitting and direct-call fallback.
- Stadium now uses the same resilient batch fallback.
- Window focus / visibility immediately refreshes protocol state.
- Pre-game stage probe ~1.8s fallback poll; LIVE global state ~3s.
- Optional `NEXT_PUBLIC_CURTIS_RPC_URL` supports a dedicated Curtis endpoint.

## UX guarantees
- Different Chrome profiles and different connected wallets resolve the same deployment stage from GameEngine.
- A live deployment never flashes Community Pre-Mint/Public Mint.
- Cached LIVE while RPC reconnects displays `LIVE_SYNCING`, not `PRE_GAME`.
- `CHAIN SYNC DEGRADED` preserves and labels the last confirmed state instead of blanking/resetting it.
- Runtime supply has no 2,000 fallback in Mint/Community/Live operational UI.
- Scanline remains behind content; it cannot cut through headings.

## Contract alignment
The frontend ABI includes the corrected TokenState tuple with NO poison cooldown field and the corrected phase/timing helper reads. Reference contract package is included under `/docs/Gluttons_Carlos_CORRECTED_CONTRACTS_v1.0.1.zip`.

## Important contract-package correction
The previous generated corrected-contract package accidentally contained a self-referential `GAME_HOUR` constant. The included v1.0.1 reference fixes Curtis to:

```solidity
uint64 public constant GAME_HOUR = 60;
```

Carlos should still run `forge fmt`, `forge build`, and `forge test -vvv` before deployment.

## Local verification
```bash
npm install
npm run check
npm run build
npm run dev
```

A TypeScript transpile/syntax pass was run over all source TS/TSX files in this package before export.
