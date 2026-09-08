# Gluttons Frontend FINAL v0.2 — One-Way LIVE Latch

This build changes frontend stage synchronization only. No smart-contract behavior was changed.

## Stage rule

`PRE-MINT / MINT -> LIVE` is now treated as a one-way frontend transition.

Once the frontend observes either:

- `s_gameStart > 0`, or
- `s_totalMinted >= MAX_SUPPLY` (Curtis compatibility fallback),

it sets `protocol.liveLocked = true`, persists a local boot hint, stops all mint-stage polling, and never renders Community Pre-Mint or Public Mint again for that deployment.

## What changed

- `protocolAtom` now includes `liveLocked`.
- `GameSync` was split into two synchronization loops:
  - PRE-GAME sync polls mint-stage fields only while `liveLocked === false`.
  - LIVE sync polls gameplay/global fields only after the terminal latch is set.
- Mint-stage polling stops permanently after LIVE is observed.
- `useProtocolStage()` gives the LIVE latch priority over marketing/site configuration.
- New `useLiveStageLatch()` performs an immediate onchain stage re-check after confirmed:
  - Public Mint
  - Community Pre-Mint
  - `ensureStarted()`
- If the final mint is made by another wallet, the pre-game watcher remains a 5-second fallback and latches LIVE when it observes the terminal state.
- `/mint` already redirects away whenever the resolved stage is not `mint`; with the latch it can no longer reappear after LIVE.
- `localStorage` key `gluttons:live-locked:v1` is used only to avoid a mint-screen flash on repeat visits. It is never allowed to revert LIVE back to Mint.

## Important backend note

The next contract revision should make `s_gameStart > 0` the sole canonical terminal signal and ideally emit a dedicated `GameStarted` event. The frontend currently also accepts sellout (`totalMinted >= MAX_SUPPLY`) as a Curtis compatibility fallback.

## Validation

A TypeScript transpilation/syntax pass was run over all 32 TS/TSX files: 0 syntax-error files.

Carlos should still run locally:

```bash
npm install
npm run check
npm run build
npm run dev
```

## Test checklist

1. Open site before sellout: Mint/Community Pre-Mint behaves normally.
2. Mint a non-final token: transaction confirms and stage remains Mint.
3. Mint token #2000: after receipt, UI immediately re-reads `s_gameStart` + `s_totalMinted`, latches LIVE, and redirects to `/`.
4. Refresh browser: LIVE remains visible; Mint must not flash or reappear.
5. Manually visit `/mint`: it redirects to `/`.
6. Open a second browser before sellout and let another wallet mint #2000: within the pre-game fallback poll, the second browser must latch LIVE permanently.
7. After LIVE, confirm network calls no longer poll pre-mint/public-mint stage fields; gameplay/global state continues updating.
