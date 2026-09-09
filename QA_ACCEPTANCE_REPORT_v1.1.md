# Gluttons Frontend FINAL CANONICAL v1.1 — QA / Acceptance Report

## Scope checked
This pass was performed against the complete v1.1 source tree and the corrected Curtis reference contracts bundled in `docs/contracts/`.

## Static checks completed
- 37 TypeScript / TSX source files transpile with **0 syntax diagnostics** using TypeScript `transpileModule`.
- No player-facing `REAP`, `REGISTER DEATH`, or `SYNC CORPSE` gameplay CTA exists.
- No `poisonCooldownUntil`, `GameEngine__OnCooldown`, or 12H Poison-protection implementation remains in frontend source.
- GameEngine ABI includes `currentPhaseCode`, `GAME_HOUR`, LS warning/bell getters, Truce thresholds, vote epoch/votes, tiebreak candidate and winning shares.
- Transaction ABIs match the corrected GameEngine function surfaces used by the UI.
- LIVE stage boot reads `s_gameStart()` before any Mint UI is allowed to render.
- A cached LIVE flag is only a boot hint. Repeated authoritative `s_gameStart()==0` reads clear a stale hint instead of trapping one browser profile on the wrong page.
- First LIVE metrics require a coherent critical snapshot; unknown counters are not replaced with zeros.
- `/mint` closes after LIVE. `/my-gluttons`, `/leaderboard`, and `/inspect` are LIVE-only player routes.
- Header changes `LEADERBOARD` to `FINAL TABLE` after settlement.
- Mobile leaderboard becomes cards; page-level horizontal overflow is clipped/hidden.
- Scanline remains behind content.

## State-machine acceptance coverage
- Awareness
- Community Pre-Mint
- Public Mint
- LIVE / Feast
- Plague
- Last Supper Warning
- Last Supper / Truce locked
- Last Supper / Truce open
- N/N retirement
- One survivor
- Zero-survivor tiebreak waiting
- Settled / disconnected
- Settled / winning wallet
- Settled / losing wallet
- RPC boot outage
- RPC degradation after a valid snapshot
- Inventory batch failure and direct-read fallback
- Alive / Hungry / Fasting / Final Bite / Fresh / Rotten / Consumed display logic

## Endgame security hardening included in bundled GameEngine
The final caller-supplied `liveTokenIds` array is validated onchain before settlement:
- one-survivor settlement verifies the supplied token is logically alive and unburned;
- Truce settlement rejects duplicate token IDs;
- every supplied Truce token must be logically alive and unburned;
- every vote must belong to the current epoch and current token owner.

This hardening does not change the frontend ABI.

## Production operational dependency
The player UI intentionally exposes no Reap action. A keeper/batcher is still required in production because logical deaths that nobody touches must be materialized for `s_aliveCount`, population phase thresholds and zero-survivor settlement to advance onchain. The Matrix detects a logical-alive/accounting mismatch and displays `CHAIN ACCOUNTING CATCHING UP` rather than inventing a new phase.

## Validation that still MUST run in Carlos' environment
Dependency installation timed out in this sandbox. Therefore the following dependency-resolved checks are not claimed as passed here:

```bash
npm install
npm run check
npm run build
npm run dev
```

Then test the same deployment URL in admin Chrome, a second Chrome profile, incognito, 320px, 375px and desktop. All sessions must converge to the same GameEngine phase.

## Final automated static result
- TypeScript / TSX syntax-transpile: **37 files checked / 0 syntax errors**.
- Canonical source assertions: **30 checks / 0 failures** covering stage authority, Mint/LIVE coherent first-paint, endgame controls, settlement views, accounting-lag messaging, mobile overflow protection, forbidden obsolete UI, Poison lock, and settlement-input hardening.
