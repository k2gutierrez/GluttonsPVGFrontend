# Gluttons Frontend v1.2 — RPC Stability / 429 Hardening

This release fixes the Curtis failure mode observed after gameplay actions: the public RPC returned HTTP 429 and independent component retries amplified the outage into a request storm.

## Architectural changes
- One shared read-side RPC governor (`src/lib/rpc.ts`) for all manual Viem reads.
- Maximum 2 concurrent read POSTs per browser tab.
- Global 429 circuit breaker with progressive 5s → 60s backoff.
- A 429 NEVER triggers recursive multicall splitting.
- Non-429 multicall fallback is sequential rather than parallel.
- Last confirmed canonical state is retained while the RPC is unavailable.
- Global state polling reduced to 12s LIVE / 10s pre-game.
- Public Matrix rotating refresh reduced to one page every 15s.
- Public Matrix initial progressive scan pauses 500ms between pages.
- Prize/WETH/block reads reduced to 20s.
- React Query/Wagmi automatic focus/reconnect retries are disabled globally.
- Poison target no longer polls every 5s; it reads on target change and after the transaction.
- Endgame shared table refresh reduced to 12s while active; settlement entitlement to 20s.
- Inventory metadata is delayed and skipped while the RPC circuit is open.

## UX invariant
HTTP 429 can degrade freshness but must never change the protocol stage. The UI keeps the last confirmed state and shows a degraded/syncing message instead of inventing PRE_GAME, supply, phase, or wallet state.

## Production RPC recommendation
Mainnet should use a dedicated authenticated Ethereum RPC URL. The frontend governor remains necessary even with a paid provider. A second provider/fallback endpoint is recommended operationally.

## Transport failover
Wagmi/Viem now uses an ordered fallback transport. Configure a primary and optional secondary URL:
- `NEXT_PUBLIC_CURTIS_RPC_URL`
- `NEXT_PUBLIC_CURTIS_RPC_FALLBACK_URL`
- `NEXT_PUBLIC_ETHEREUM_RPC_URL`
- `NEXT_PUBLIC_ETHEREUM_RPC_FALLBACK_URL`

Do not configure the same endpoint twice. For mainnet, use two independent providers where possible.
