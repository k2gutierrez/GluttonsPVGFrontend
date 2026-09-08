# Gluttons Frontend FINAL CANONICAL v1.0

This package supersedes v0.3 and aligns the implementation to the Sep 2026 canonical set and Carlos master handoff.

## Locked changes
- Runtime supply: reads `GameEngine.MAX_SUPPLY()` pre-game and `S` after Game Start. No 2,000-token assumption for Curtis.
- Permanent LIVE latch from `s_gameStart > 0`; mint UI never returns after LIVE.
- Canonical TokenState ABI has **no `poisonCooldownUntil`**.
- Poison: no attacker cooldown; attacker >1 game-hour; normal target >1 game-hour; normal target Shield UP for 10 game-hours onchain; Faster -> Final Bite.
- FASTING remains alive at 0H pre-Last-Supper; only failed Final Bite or normal starvation is treated as local logical death.
- No player-facing Reap/REGISTER DEATH/SYNC CORPSE action. Corpse cards assume canonical backend auto/materialization behavior.
- Dynamic game-hour scale: `NEXT_PUBLIC_GAME_HOUR_SECONDS=60` for accelerated Curtis or `3600` mainnet.
- LIVE hierarchy remains progress/stage -> matrix -> leaderboard.
- Matrix size follows deployment/start population instead of always rendering 2,000 cells.
- Inventory uses S after Game Start, paginated reads, targeted refresh and lazy metadata.
- Responsive zero-horizontal-page-scroll rules from v0.1 retained.

## Carlos validation
1. Put current deployment addresses in `.env.local`.
2. For current compressed Curtis contract set `NEXT_PUBLIC_CHAIN_MODE=curtis` and `NEXT_PUBLIC_GAME_HOUR_SECONDS=60`.
3. Run `npm install`, `npm run check`, `npm run build`, `npm run dev`.
4. Validate 100-supply sellout -> permanent LIVE.
5. Validate My Gluttons loads 100-token deployment without hardcoded 2,000 scan.
6. Validate Fasting reaches 0 without moving to corpse pre-LS.
7. Validate Poison has no cooldown UI; Shield shows UP/DOWN; target protection comes from timestamp.
8. Validate corpse action never asks player to Reap/Sync Death.
9. Before mainnet set `NEXT_PUBLIC_CHAIN_MODE=ethereum` and `NEXT_PUBLIC_GAME_HOUR_SECONDS=3600`.
