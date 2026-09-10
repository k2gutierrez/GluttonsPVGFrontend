# Gluttons Frontend FINAL CANONICAL v1.1 — GAME COMPLETE

This is the current frontend handoff for Carlos.

Start with:
1. Copy `.env.example` to `.env.local`.
2. Insert the addresses from ONE deployment only.
3. `npm install`
4. `npm run check`
5. `npm run build`
6. `npm run dev`

The frontend reads `GameEngine.GAME_HOUR()` and `MAX_SUPPLY()` dynamically. `NEXT_PUBLIC_GAME_HOUR_SECONDS` remains a boot/display fallback and should still match the deployment.

## Read these before deploy
- `UX_STATE_MATRIX_FINAL_v1.1.md` — every macro stage, token state, button, copy, margin, effect and transition.
- `BUILD_NOTES_FINAL_GAME_COMPLETE_v1.1.md` — delta from v1.0.2.
- `docs/contracts/` — corrected Curtis reference contracts used for this integration.

## Trust rule
If chain state is unknown, the UI says **SYNCING**. It never invents PRE_GAME, 0 supply, 0 Alive or a fake phase.

## Mainnet operational note
The player UI intentionally has no Reap gameplay button. A production keeper/batcher is still required to materialize permissionless logical deaths so `s_aliveCount` and phase accounting stay current. The Matrix detects and visibly reports accounting lag.

## Final bundled contract note
The `docs/contracts/GameEngine.sol` in this package contains an additional settlement-input validation hardening pass. Its ABI is unchanged, so the frontend integration remains the same. Carlos should compile/test/deploy this bundled revision rather than an earlier v1.0/v1.0.1 GameEngine copy.

---

## v1.2 RPC-STABLE — Curtis 429 fix

This build replaces the independent aggressive read/retry behavior that could saturate the Curtis public RPC after a gameplay transaction.

Key runtime invariants:
- Game stage never falls back to Mint/PRE_GAME because an RPC read failed.
- Last confirmed LIVE snapshot remains visible during temporary RPC degradation.
- Browser-wide read concurrency is capped.
- HTTP 429 opens one shared circuit breaker; all manual reads back off together.
- 429 never triggers recursive multicall splitting.
- Public Matrix, balances, endgame and mint reads use slower coordinated refresh intervals.
- Poison target state is read on selection and after confirmation instead of polling every 5 seconds.
- Ordered RPC fallback transport is supported through the primary/fallback environment variables.

See `BUILD_NOTES_RPC_STABILITY_v1.2.md` for deployment details.
