# Gluttons Frontend FINAL CANONICAL v1.1 — GAME COMPLETE

Base: v1.0.2 Stage Sync. This revision closes the missing endgame/UI state gaps and strengthens first-paint trust behavior.

## Major changes
- LIVE metrics stay hidden until a coherent critical onchain snapshot exists.
- Partial RPC failure after first good snapshot preserves last confirmed state and marks degraded.
- Full Last Supper Warning countdown and rule-change copy.
- Truce locked/open UX with actual N/N vote progress from `s_truceEpoch` + `s_truceVotes`.
- Per-NFT Truce vote state in My Gluttons.
- One-survivor `CLOSE THE TABLE` UX.
- Zero-survivor tiebreak waiting state.
- Settled winner/loser wallet differentiation using `getWinningShares`.
- Exact ETH/WETH proportional claim preview from PrizeVault snapshots.
- `CLAIM THE POT` / `CLAIM YOUR SHARE`; no Claim button for losers.
- All gameplay removed after settlement.
- Keep Fresh removed at Last Supper; fridge calculations cap at the bell.
- LS Warning preserves previous-phase Devour eligibility instead of blanket disabling it.
- Dynamic `GAME_HOUR()` used in critical clocks/status thresholds rather than trusting environment alone.
- Matrix detects logical-death vs `s_aliveCount` accounting lag and exposes a neutral chain-accounting banner.
- Complete canonical Rules page and UX state matrix.
- Endgame scanner is dormant until Truce threshold / one-survivor / settlement to avoid unnecessary RPC load.

## Validation in this environment
- TypeScript syntax/transpile pass: run across all `src/**/*.ts(x)`.
- `npm install` could not complete in the sandbox before timeout, therefore full dependency-resolved `npm run check` / `npm run build` must be run by Carlos locally or in CI.

## Required local validation
```bash
npm install
npm run check
npm run build
npm run dev
```
Then run the acceptance matrix in `UX_STATE_MATRIX_FINAL_v1.1.md`.

## Final hardening pass
- Browser LIVE cache is now a **hint only**. If repeated authoritative `s_gameStart()` reads prove zero, the stale chainId+GameEngine cache is discarded and pre-game facts are re-read directly.
- `liveLocked` is no longer inferred from `currentPhaseCode`; Game Start is the latch authority.
- `/leaderboard` and `/inspect` are now gated to LIVE just like `/my-gluttons`.
- Settled My Gluttons freezes final-table positions from settlement accounting (`deathSettled`) instead of allowing raw post-settlement clock expiry to visually "kill" a winner again.
- Header renames Leaderboard to `FINAL TABLE` after settlement.
- Active Pot copy uses the active chain native symbol rather than hard-coded ETH.
- Royalty Rules copy now shows both active and post-settlement routing.
- Bundled GameEngine settlement validation now rejects fake/dead sole-survivor IDs, duplicate Truce IDs, dead/burned Truce entries and stale-owner votes.
- Terminal population now overrides macro phase: if onchain Alive reaches 1 during Feast, Plague or LS Warning, the UI immediately shows `LAST GLUTTON STANDING` and can settle; it does not wait for Last Supper.
- Settled Stadium no longer renders the live Matrix/clock board; it shows a final archive handoff instead. The Final Table route uses settlement shares/snapshots, not aging live clocks.
- Token Inspector displays an explicit settlement warning because raw contract timestamps may keep aging after the outcome is final.
- First Mint paint now also requires a coherent phase-aware snapshot including backstop, pre-mint switch and community price. LS Warning/Last Supper paints require their timing/threshold reads.
