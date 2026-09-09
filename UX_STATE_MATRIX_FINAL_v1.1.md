# GLUTTONS FRONTEND — FINAL GAME-COMPLETE UI/UX LOCK v1.1

This file is the implementation checklist for Carlos. The deployed contracts remain the execution authority. The frontend must never invent a friendlier state than the chain can prove.

## 1. Global layout lock

- Desktop content max-width: **1540px** centered.
- Page horizontal padding: **22px desktop**, fluid via `clamp(12px,2vw,22px)`, **12px mobile**, **10px ≤430px**.
- Default page top/bottom: **26px / 55px**; mobile **16px / 38px**.
- Core card radius: **13px**. Action buttons: **9px**. Secondary controls: **8px**.
- Core gap: **16px** between primary panels; 8–12px inside dense telemetry groups.
- No horizontal page scroll at 320px+.
- Header is sticky. Desktop nav collapses to menu below 980px.
- Matrix never reorders token IDs.
- The moving orange scanline is behind content (`z-index:1`), never over typography.
- Motion is ambient only: subtle scanline/noise, small hover lifts, danger pulse only for genuinely urgent actions. No constant flashing on normal Alive state.

## 2. Chain trust policy

### Unknown stage
Show **SYNCING PROTOCOL**. Do not render Awareness/Mint from zero/default contract values.

### LIVE deployment known, coherent snapshot not ready
Show only:
- `LIVE DEPLOYMENT CONFIRMED`
- `RESTORING THE STADIUM.`
- spinner/heartbeat

Do not paint Alive=0, Supply=0, Pot=0, or PRE_GAME.

### Mint deployment known, coherent mint snapshot not ready
Show `RESTORING MINT STATE.` and hide price/supply/backstop controls until pre-mint switch, supply, price and backstop are all coherently read.

### RPC fails after a good snapshot
Keep last confirmed values and show **CHAIN SYNC DEGRADED**. Never roll LIVE back to Mint.

### One-way LIVE latch
Once `s_gameStart > 0` is observed for `chainId + GameEngine address`, Mint/Pre-Mint routes can never render again for that deployment.

## 3. Website macro stages

| Stage | Main page | Header | Primary purpose | Must disappear |
|---|---|---|---|---|
| Awareness | Teaser / wallet capture / X | minimal | announce | all mint/gameplay |
| Community Pre-Mint | Community access console | Mint, Rules | holder allocations | awareness form |
| Public Mint | Public mint console | Mint, Rules | FCFS public mint | community claim actions |
| LIVE / Feast | Stadium | Live, My Gluttons, Leaderboard, Rules, OpenSea | survival | all mint UI forever |
| Plague | Stadium, redder pressure | same | Devour unlocked | nothing from Feast except phase copy changes |
| LS Warning | warning panel above Stadium | same | 1H warning | nothing from previous phase yet |
| Last Supper | final-table treatment | same | finite food / devour / truce | Feed, Fast, Poison, Keep Fresh permanently |
| Settled | final verdict | Live, My Gluttons, Final Table, Rules | claim/archive | all gameplay controls + live Matrix/clock ranking |

## 4. Game phase UX exact behavior

### FEAST
Hero: `FEAST` / `FOOD IS STILL GOOD. THE CLOCK IS NOT.`
Open: Feed, Fast, Poison, Fresh, Rotten, Keep Fresh.
Closed: Live Devour, Truce.

### PLAGUE
Hero: `PLAGUE` / `THE LIVING ARE NOW FOOD.`
Trigger shown from chain logic: Alive ≤ ceil(50% of S) OR Meal = +2H.
Open: all Feast actions + Live Devour.

### LAST SUPPER WARNING
Place the warning **above all Stadium content**.
Copy:
- `THE LAST SUPPER IS COMING.`
- `BELL IN HH:MM:SS`
- `THE PREVIOUS PHASE CONTINUES UNTIL ZERO.`

If Plague had already unlocked, Live Devour remains available during the warning. If warning arrived by Day 120 while still Feast, Devour stays closed until the bell.

At zero:
- 0H Fasters die at bell timestamp.
- Feed closes.
- Fast closes.
- Poison closes.
- Keep Fresh closes.
- Existing fridge power is capped at the bell.

### LAST SUPPER
Hero: `LAST_SUPPER` / `NO MORE NORMAL FEEDING. EAT WHAT REMAINS.`
Only open: Fresh, Rotten, Live Devour, Truce when threshold is met.

Inventory must show a persistent lock strip:
`LAST SUPPER ACTION LOCK — FEED · FAST · POISON · KEEP FRESH ARE PERMANENTLY CLOSED.`

### TRUCE LOCKED
If Alive > `trucePopulationThreshold()`:
- show `THE TRUCE IS LOCKED.`
- show current Alive
- show `UNLOCKS ≤ N`
- no vote transaction button enabled.

### TRUCE OPEN
If LAST_SUPPER and 1 < Alive ≤ threshold:
- show `THE TRUCE IS OPEN.`
- read `s_truceEpoch` and each live token's `s_truceVotes(tokenId)`.
- show `X / N RETIRE` progress.
- each surviving NFT shows `RETIRE ✓` or `WAITING`.
- My Gluttons shows per-NFT `RETIRE / VOTE TRUCE` only if its current-owner vote is not already valid.
- clocks keep counting.
- explain: death/Devour resets vote epoch; transfer invalidates old-owner vote.
- enable `SETTLE UNANIMOUS TRUCE` only at N/N and only when the locally read final table count equals onchain Alive.

### ONE SURVIVOR
This terminal condition overrides the current macro phase. If onchain Alive reaches 1 in Feast, Plague, LS Warning or Last Supper, show a dedicated terminal immediately; the final player does not wait for the warning/bell.

Show:
- `LAST GLUTTON STANDING`
- token ID
- current owner
- `ONE REMAINS.`
- `CLOSE THE TABLE`

The button calls `settleGame([tokenId])`. Do not show Truce UX.

### ZERO ALIVE
Do not attempt `settleGame([])`.
Show:
- `NO CLOCKS REMAIN.`
- `DETERMINISTIC TIEBREAK`
- latest logical death wins; exact timestamp tie → lowest tokenId.
Wait for canonical Reap/keeper settlement.

## 5. Settlement / winner UX

After `isSettled == true`, gameplay is read-only everywhere.

### Wallet disconnected
`CONNECT A WALLET TO CHECK YOUR ENTITLEMENT.`
No Claim button.

### Losing wallet
Read `getWinningShares(wallet) == 0`.
Show:
- `YOU DID NOT SURVIVE.`
- no Claim button
- Final Table remains public.

### Winning wallet
Read:
- `getWinningShares(wallet)`
- PrizeVault total shares
- ETH snapshot
- WETH snapshot

Calculate and display exact proportional claim.

If total shares = 1:
- `YOU SURVIVED.`
- `CLAIM THE POT`

If total shares > 1:
- `YOU SURVIVED.`
- `X / N WINNING SHARES`
- `% OF FINAL POT`
- `CLAIM YOUR SHARE`

After successful claim in-session show `CLAIM CONFIRMED ✓`. PrizeVault remains the protection against duplicate claims.

## 6. Token visual/status states

- UNREVEALED: mint period only.
- ALIVE: normal living state.
- HUNGRY: ≤12H and >0H.
- FASTING: living status badge; Shield DOWN. 0H stays alive pre-bell.
- FINAL BITE: living status badge with 1H rescue countdown.
- FRESH: corpse art + freshness bar + ROTS IN.
- ROTTEN: rotten art + emergency-food copy.
- CONSUMED/BURNED: fixed Matrix cell remains, no inspector action.

FASTING and FINAL BITE never replace the Alive art family; they are status overlays.

## 7. My Gluttons action visibility

### Alive/Hungry before bell
- Feed: enabled only at ≤12H or rescue state.
- Fast: enabled only at ≤12H and not already fasting.
- Poison: enabled only if attacker valid and target preflight valid.
- Inspect + Sync Metadata: utility.

### Plague / eligible LS Warning
Live Devour appears only if Plague condition is actually unlocked.

### Last Supper
Feed, Fast, Poison controls remain visible only as clearly CLOSED where context helps; no transaction can fire. Keep Fresh is removed from corpse cards. Fresh/Rotten consumption and Live Devour remain.

### Settled
All action grids disappear. Cards become read-only final records.

## 8. Poison target UX

No victim discovery list. User types target token ID.
Before opening wallet, read target and simulate the transaction.

Show:
- Life clock
- Shield `UP · countdown` or `DOWN`
- Fasting target → `FASTING — VULNERABLE`
- Final Bite target → blocked
- Dead/burned → blocked
- Normal target ≤1H → blocked
- Self target → blocked

Success feedback:
- normal: before → after clock, Shield UP, attacker −1H
- Faster: `FINAL BITE TRIGGERED · 1H · FEED OR DIE.`
Button identity returns to `POISON` after transient confirmation.

## 9. Corpse UX

Fresh card always shows:
- Freshness %
- freshness bar
- ROTS IN
- Fridge OFF / ON countdown

KEEP FRESH:
- available only before Last Supper bell
- costs protocol price
- slows spoil 4×
- never resets freshness
- any power beyond bell is visually and mathematically capped at bell.

Fresh eat:
- eater must be Hungry
- +12H capped at 36H

Rotten eat:
- eater must be strictly <1H
- sets eater to +2H

After settlement corpse cards are read-only. Final-table owned positions display `FINALIST / CLOSED`; raw expiry cannot make a settled winner look newly dead in My Gluttons.

## 10. Stadium / Matrix / Leaderboard

Matrix:
- fixed one cell per starting token ID
- progressive 50-token RPC pages
- rotating refresh after initial scan
- states visibly distinct
- click only readable non-consumed token cells

If full Matrix scan derives a different logical-living count than `s_aliveCount`, show **CHAIN ACCOUNTING CATCHING UP**. Do not secretly rewrite GameEngine phase. This flags pending permissionless Reap/keeper accounting without making Reap a gameplay button.

Leaderboard before settlement:
- longest remaining clocks first
- public owner, state, shield
- no weakest sort
- no vulnerable-only/Fasting-only filters
- no Poison CTA

After settlement:
- remove the live clock ranking and live Matrix from the public result surfaces;
- `/leaderboard` becomes `FINAL TABLE`;
- show settlement shares/snapshots/tiebreak outcome instead of allowing raw post-settlement expiry to rewrite the final story.

## 11. RPC/performance rules

- Stage boot uses direct `s_gameStart()` first.
- First LIVE render requires coherent critical snapshot: phase, alive, meal, settled, supply, S, game-hour.
- Failed batch reads bisect until single direct `eth_call` with retry.
- Inventory metadata is lazy and non-critical.
- Inventory loads 50 token IDs/page.
- Matrix loads 50 IDs/page.
- Endgame final-table scan remains dormant until Truce threshold / one-survivor / settled state.
- On focus/visibility return, trigger immediate global refresh.

## 12. Production requirement outside UI

`reap()` is not a player gameplay mechanic, but GameEngine accounting (`s_aliveCount`, phase threshold arming, zero-survivor settlement) still needs permissionless deaths to be materialized. Production must run a reliable keeper/batcher. The UI detects accounting lag and says so; it does not pretend the phase changed before GameEngine records it.

## 13. Acceptance tests

Test same URL in:
1. Admin Chrome profile.
2. Different-wallet Chrome profile.
3. Incognito no wallet.
4. Mobile 375px.
5. 320px viewport.

All sessions must converge to the same GameEngine stage. Repeat for FEAST, PLAGUE, LS_WARNING, LAST_SUPPER locked, TRUCE open, one survivor, SETTLED winner wallet, SETTLED loser wallet, RPC outage, inventory RPC failure, Fresh→Rotten, FAST 0H, Final Bite expiration, and wallet transfer during Truce.
