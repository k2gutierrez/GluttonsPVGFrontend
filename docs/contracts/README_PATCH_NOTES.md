# Gluttons — Carlos Corrected Contracts v1.0

Basis: the latest three Solidity files supplied by Carlos, corrected to the current canonical Gluttons rules and the FINAL CANONICAL frontend integration.

## What changed in GameEngine.sol

- Poison remains NO attacker cooldown.
- Normal target protection remains 10 game-hours (Curtis: 10 real minutes).
- Attacker and normal target both require strictly >1 game-hour.
- Attacker pays exactly -1 game-hour.
- FASTING survives at 0H before Last Supper.
- Poisoning a Faster starts Final Bite for 1 game-hour.
- Final Bite death uses its exact deadline.
- Added canonical Last Supper machine:
  - population warning at ceil(2.5% of Starting Population S), or Day 120;
  - 1 game-hour LS warning;
  - Last Supper starts at the bell;
  - Truce remains max(2, ceil(1% of S)) and only during Last Supper.
- Feed / Fast / Poison / Power are blocked onchain after the Last Supper bell.
- Fresh / Rotten / Live Devour remain usable during Last Supper.
- During LS_WARNING, the pre-warning phase rules continue.
- A 0H Faster dies at the exact Last Supper bell.
- Fridge protection stops at the Last Supper bell even if poweredUntil is later.
- Corpse actions auto-materialize logical death. Player-facing Reap is no longer required before KEEP FRESH or EAT CORPSE.
- Reap remains permissionless infrastructure and cannot run before Game Start.
- Live Devour prey is marked deathSettled so Reap cannot double-decrement aliveCount.
- Fixed live-devour hunger handling for a Faster at 0H (avoids timestamp subtraction underflow).
- Added phase/threshold helper views and gameplay events useful for frontend/event tape.

## Inspector.sol

- Inspector no longer duplicates phase math.
- It reads GameEngine.currentPhaseCode() and supports PRE_GAME / FEAST / PLAGUE / LS_WARNING / LAST_SUPPER / SETTLED.
- Hunger window derives from GAME_HOUR so the same logic supports compressed Curtis timing.

## GluttonNFT.sol

- Gameplay behavior unchanged. Removed one unused IERC20 import only.

## Required companion interface change

Replace `interfaces/IGameEngine.sol` with the included version because Inspector now reads `currentPhaseCode()` and `GAME_HOUR()` from GameEngine.

## Curtis timing in this package

This is still the accelerated 100-supply Curtis test build:

- MAX_SUPPLY = 100
- 1 game-hour = 1 real minute
- 1 game-day = 24 real minutes
- Last Supper Day-120 route = 48 real hours after Game Start
- LS warning = 1 real minute
- 10H Poison protection = 10 real minutes
- 24H Fresh/Fridge window = 24 real minutes

For mainnet, Carlos must restore the intended mainnet time scale and MAX_SUPPLY=2,000 while keeping the formulas/state machine unchanged.

## Deployment warning

These are contract-code changes, so deploy a NEW GameEngine and NEW Inspector. The Inspector constructor must receive the addresses of this exact new GameEngine and the corresponding GluttonNFT. Update Amplify/frontend environment addresses together. Do not point a new frontend at an old Inspector.

## Validation

Structural sanity checks were performed (balanced braces/parentheses and removal of old cooldown symbols). A full Foundry compile/test was not possible in the packaging environment because `forge`/`solc` are not installed here. Carlos should run:

```bash
forge fmt
forge build
forge test -vvv
```

before deploying.


## GAME_HOUR compile hotfix
Curtis accelerated build uses `uint64 public constant GAME_HOUR = 60;`. The previous generated package accidentally contained a self-reference in this constant; this copy is corrected.
