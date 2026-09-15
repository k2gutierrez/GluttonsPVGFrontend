# UX State Matrix v2.2 — Production Lock

The visual/game-state behavior from v1.1 remains canonical; v2.2 changes the read architecture underneath it. No state may be invented because a read fails.

| Protocol state | Main experience | Visible actions | Must disappear / stay locked |
|---|---|---|---|
| Awareness | teaser, wallet capture, X follow | awareness CTA | Mint, Live, inventory gameplay |
| Community Pre-Mint | community access + supply + backstop | eligible `PRE-MINT` | Live Stadium |
| Public Mint | public supply + 4/wallet counter + backstop | `MINT` | community claim controls |
| LIVE / Feast | Stadium, Matrix, Board, My Gluttons | Feed, Fast, Poison when token gates allow; corpse actions | Live Devour until Plague |
| Plague | same Stadium with phase response | Feed, Fast, Poison, corpse actions, Live Devour | Truce |
| LS Warning | warning countdown above previous phase | previous-phase actions continue | Truce until bell + threshold |
| Last Supper | final table emphasis | Fresh, Rotten, Live Devour; Truce when threshold reached | Feed, Fast, Poison, Keep Fresh permanently |
| Truce open | N/N RETIRE progress | Vote per surviving NFT; settle only at unanimity | fake majority settlement |
| 1 survivor | Last Glutton Standing takeover | `CLOSE THE TABLE` | normal gameplay hierarchy |
| 0 survivors | deterministic tiebreak waiting state | none until canonical settlement | caller-supplied empty settlement shortcut |
| Settled winner | final result + exact entitlement | `CLAIM THE POT` or `CLAIM YOUR SHARE` | survival actions/clocks |
| Settled loser | final result / Final Table | inspect/archive only | claim button |

## Read-service states

### First load, no trustworthy snapshot
Show `SYNCING PROTOCOL` or `RESTORING THE STADIUM`. Do not show zero supply, PRE_GAME, CONSUMED, DEAD, or a Mint page as a fallback.

### Previously confirmed LIVE + temporary backend problem
Keep the last confirmed game state visible. Show a compact `CHAIN SYNC DEGRADED` notice. Never revert to Mint.

### Indexer stale beyond threshold
Keep last confirmed values, mark them stale, and pause official GameEngine/PrizeVault action buttons with `STATE SYNCING — ACTION PAUSED`. The user should not be asked to sign from stale display state.

### Transaction submitted
Button: `CONFIRMING ONCHAIN…`. Once receipt is found: `CONFIRMED ✓`. If indexer has not caught up yet, action-specific UI says `CONFIRMED ONCHAIN / READ MODEL CATCHING UP`; no made-up post-transaction clock/shield value.

## Layout lock

- page content max-width: 1540px;
- desktop horizontal page padding: 22px;
- mobile horizontal padding: 12px; <=430px: 10px;
- desktop top/bottom spacing: ~26px / 55px; mobile: ~16px / 38px;
- primary panel gap: 16px;
- panel radius: 13px; action controls: 9px; secondary controls: 8px;
- no page-level horizontal scroll from 320px upward;
- mobile tables become cards/stacked rows;
- Matrix uses fixed token-ID positions and responsive columns;
- scanline/noise/code-rain are ambient layers behind readable content;
- urgent pulse reserved for Final Bite/danger states, not normal Alive positions.

## Trust rules

1. Unknown is shown as unknown.
2. Last confirmed state is preferable to a fabricated default.
3. Missing response never means burned/dead/zero.
4. Wallet identity can change personal inventory/eligibility, never the protocol phase.
5. Game Start is deployment-specific and irreversible in the UI after `s_gameStart > 0`.
6. Contract execution is authoritative; read model is presentation acceleration.
