# Gluttons Frontend v2.2 — Production Final Candidate

This release replaces the v1.x browser-as-indexer architecture.

## Release-critical fixes
- Public pages read shared `/api/read/*` snapshots rather than scanning the chain from every browser.
- Matrix, inventory, leaderboard and endgame no longer perform full-supply browser scans.
- One persistent indexer + Redis read model serves all spectators/players.
- Paid RPC credentials stay server-side; browser wallet transport is low-volume only.
- API/browser circuit breaker deduplicates requests and backs off on 429/5xx without recursive fan-out.
- Missing/failed reads never become PRE_GAME, DEAD, CONSUMED, zero balance, or zero entitlement.
- Stage authority remains deployment-specific `s_gameStart > 0`.
- Token/protocol snapshots are commit-ordered to avoid mixed-block presentation.
- Account-switch guards prevent the previous wallet inventory/mint eligibility/settlement entitlement from flashing under the new wallet.
- Settled zero-survivor tiebreak winner is retained in the final-table read model.
- Transaction submission is duplicate-guarded; server preflight + bounded receipt tracking are included.
- Indexer includes safe-block reads, reorg checkpointing, leader lock, catch-up reconciliation and primary/fallback RPC.

## Packaging QA completed
- `npm run audit`: PASS.
- Static TypeScript parser pass: 65 files, 0 syntax errors.
- Node `.mjs` script syntax: PASS.
- A full `npm install` timed out in this packaging environment, so a real `npm run build` is still a mandatory deployment gate on Carlos's machine/CI.
- The 2,000-user load test is included but must be run against staging infrastructure; it is not meaningful without the deployed Redis/indexer/CDN stack.

## Mandatory production gate
Do not expose production traffic until `DEPLOYMENT_CHECKLIST_v2.2.md` is complete, `/api/read/health` is healthy, the Next production build succeeds, and the 2,000-VU staging test is within the agreed latency/error targets.
