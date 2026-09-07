# Gluttons Frontend V2.6 — Death State Sync

This release fixes the stale-state bug found during the Curtis FASTING expiry test.

## Bug observed
A Glutton crossed its expiry while the page was open. The contract already rejected Poison/Feed as `Dead`, but My Gluttons still rendered the last cached Inspector snapshot as `FASTING`, kept living actions visible, retained the Alive image, and did not place the token in Corpse Inventory.

## V2.6 behavior
- Loaded clocks are evaluated every second for the currently deployed Curtis death boundary.
- At expiry / elapsed Final Bite, living actions disappear immediately.
- The token leaves `YOUR SURVIVORS` and appears in `CORPSE INVENTORY` as an optimistic Fresh corpse while canonical state is re-read.
- Only the affected IDs are hydrated from Inspector + GameEngine + tokenURI; no 2,000-token full refresh is triggered.
- Automatic death hydration is capped to 50 IDs per batch.
- The artwork immediately switches to the Fresh fallback while tokenURI is refreshed, then uses the canonical Dead Fresh metadata image returned by GluttonNFT.
- Before `deadAt` is materialized the card shows `REGISTER DEATH / REAP` and a disabled `KEEP FRESH — REGISTER DEATH FIRST` control.
- After Reap confirms, `KEEP FRESH` becomes available and calls `powerFridge`.
- Corpse Reap / Keep Fresh / Eat and living Feed / Fast / Poison / Devour confirmations now refresh only the affected token IDs where possible.
- Poison target read now displays `LIFE CLOCK: DEAD` and `POISON SHIELD: N/A` for dead targets rather than showing an obsolete expiry countdown.
- Token Inspector also stops presenting expired cached snapshots as living while its page is open.
- HUNGRY display is derived from the live clock rather than a stale Inspector boolean between reads.

## Contract dependency
V2.6 mirrors the **currently deployed Curtis contract**, where crossing `expiry` is logical death even if the token had entered FASTING. If the next GameEngine deployment changes FAST so that it survives at 0H, update `isLogicallyDead()` in `src/hooks/useOwnedGluttons.ts` to match the new canonical rule.

## Test sequence
1. Load a living Hungry Glutton in My Gluttons.
2. Enter FAST.
3. Leave the page open through expiry.
4. Verify living action cards disappear at the boundary.
5. Verify the token moves to Corpse Inventory and uses Fresh artwork.
6. Click `REGISTER DEATH / REAP`.
7. Verify `KEEP FRESH` unlocks after confirmation.
8. From another Glutton, enter the dead token ID in Poison and verify it reads `TARGET DEAD`, `LIFE CLOCK: DEAD`, and `POISON SHIELD: N/A` without opening a transaction.
9. Repeat with a large loaded wallet; Network panel should show small <=50-token canonical refresh batches, not a 2,000-token multicall.
