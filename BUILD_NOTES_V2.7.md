# Gluttons Frontend v2.7 — Live Stadium / Game Readability

This build is a full-project replacement for v2.6, not a patch-only bundle.

## Added

- 2,000-cell fixed Live Glutton Matrix on `/` during the live game.
  - 50 × 40 cells on desktop.
  - IDs never reorder.
  - Alive / Hungry / Fasting / Final Bite / Fresh / Rotten / Consumed / Unminted states each have a distinct visual state.
  - Clicking a loaded token opens `/inspect?token=<id>`.
  - Reads are progressive in 50-token RPC pages and then rotate one small page at a time.
  - No 2,000-token single multicall.
- Compact Top Clocks Survival Board on the Live Stadium.
- Full `/leaderboard` route.
  - Longest clock first only.
  - No weakest, Fasting-only, vulnerable-only, or best-target filtering.
  - No one-click Poison action from the board.
- Corpse Freshness visualization.
  - Freshness percentage bar.
  - `ROTS IN` dynamic timer.
  - Separate Fridge timer.
  - Mirrors GameEngine `spoilQ4 / spoilCheckpoint / poweredUntil` math.
- Clear Keep Fresh copy: slows rot 4× for the next 24H and does not reset the corpse.
- Poison success feedback.
  - Target clock before → after.
  - Shield status.
  - `-1H` attacker consequence.
  - Fasting target feedback shows Final Bite trigger.
- Poison Shield vocabulary changed to `UP` / `DOWN`.
- Transaction success labels are transient instead of permanently showing `CONFIRMED ✓`.
- Player-facing manual Reap tool removed from Protocol Tools.

## Current Curtis compatibility note: death materialization

The currently deployed Curtis GameEngine requires `deadAt != 0` before `powerFridge()` and `consumeCorpse()` can execute. That means the deployed contract still requires `reap()` to materialize a logical death.

The player-facing `REGISTER DEATH / REAP` gameplay button is removed. A corpse only shows a compatibility `SYNC CORPSE STATE` control when this test deployment has not materialized the death yet. The Freshness bar continues from the logical death time even before this sync, so delaying sync never resets Freshness.

Production target: contract actions should auto-materialize touched dead tokens and/or a keeper should batch `reap()` so no player transaction is required for accounting sync.

## Curtis stress-test behavior

- My Gluttons inventory: 50 token IDs per page.
- Public Matrix: 50 token IDs per RPC page.
- All multicalls use `deployless: true` because the custom Curtis chain definition does not expose Multicall3.
- After the initial Matrix scan, only one 50-token page is refreshed per rotation.

## Test checklist

1. `npm run check`
2. `npm run build`
3. Open LIVE with 2,000 minted tokens and verify matrix progressively fills without `payload too large`.
4. Poison a normal vulnerable target and verify success feedback shows before/after clock and Shield UP.
5. Inspect a protected target and verify Shield `UP · hh:mm:ss`; vulnerable target must show `DOWN`.
6. Let a loaded Glutton die and verify it moves into Corpse Inventory.
7. Verify Freshness begins decaying from logical death, not from the sync transaction.
8. Activate Keep Fresh and verify Freshness decay slows while a separate 24H Fridge timer counts down.
9. Eat a Fresh corpse using a Hungry Glutton owned by the wallet and verify corpse is burned/removed and eater refreshes.
10. Verify `/leaderboard` shows longest clocks first and does not expose hunter filters.
