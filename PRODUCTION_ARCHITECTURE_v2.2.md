# Gluttons Production Architecture v2.2

## Goal

2,000 players plus spectators must be able to view the same canonical game without multiplying blockchain read load by the number of browsers.

## Read path

```text
Canonical contracts
      |
      | private RPC / event + targeted state reads
      v
Indexer worker (ONE logical leader)
      |
      v
Redis canonical read model
      |
      v
Next /api/read/*
      |
      v
CDN / shared HTTP cache
      |
      +---- Browser 1
      +---- Browser 2
      +---- ...
      +---- Browser 10,000
```

The indexer is a display acceleration layer, not protocol authority. Transactions are always executed by the wallet against the canonical contracts.

## Write path

```text
Browser -> wallet confirmation -> GameEngine / NFT / PrizeVault
                              |
                              v
                         chain state
                              |
                              v
                         indexer catches up
                              |
                              v
                      all viewers converge
```

No optimistic UI value may overwrite a canonical value. After a transaction is confirmed, the UI may say `CONFIRMED ONCHAIN / READ MODEL CATCHING UP` until the indexed block arrives.

## Scaling changes versus v1.x

- Matrix no longer performs per-browser 1..S contract reads.
- Wallet inventory no longer discovers ownership with per-browser `ownerOf(1..S)`.
- Endgame no longer scans 1..S from every spectator.
- Global state, pot, phase, supply, meal and metabolism come from one indexed protocol snapshot.
- Browser countdowns advance locally every second; no chain read is needed for each tick.
- Stadium payload is compact numeric rows rather than verbose token JSON and is CDN-cacheable.
- Metadata is lazy and cacheable.
- Per-wallet mint eligibility is not continuously polled; it is read on connect/config change/confirmed mint while the contract re-verifies on execution.
- Transaction receipt polling is bounded and cached once final.

## Consistency model

The indexer hydrates changed tokens at a specific safe block and publishes the corresponding protocol snapshot after token writes. Read service detects a token snapshot newer than the protocol snapshot and refuses to publish a mixed commit until protocol catches up.

A failed subcall is not proof that an NFT burned. Unknown or partial reads preserve the last confirmed state.

## Staleness

`ProtocolSnapshot.indexedAt` is the freshness clock. The frontend marks the read model degraded after `NEXT_PUBLIC_READ_STALE_MS` (default 45s). GameEngine / PrizeVault actions are paused by the official UI while degraded. This prevents a player from signing based on obviously stale display data; the contracts remain the ultimate authority.

## Indexer safety

- private RPC endpoints only;
- optional second provider fallback;
- chain confirmations configurable;
- safe-block hydration;
- reorg checkpoint hash validation;
- distributed Redis leader lock prevents duplicate workers from racing;
- large downtime gap triggers a current-state rebuild rather than replaying unlimited blocks;
- periodic reconciliation catches missed/non-event state changes;
- Redis token writes are batched, not one HTTP call per token.

## Public API cache policy

Public shared resources (`protocol`, `stadium`, `endgame`, `communities`) advertise short `s-maxage` plus stale-while-revalidate. Dynamic wallet/token reads use Redis rather than chain reads. Only transaction simulation, receipt lookup, lazy metadata cache miss and mint-holder verification can need server-side chain RPC.

## RPC credential policy

`RPC_URL` and `RPC_FALLBACK_URL` are server/indexer environment variables. Never put paid keys under `NEXT_PUBLIC_*`. `NEXT_PUBLIC_WALLET_RPC_URL` is only a non-secret browser/wallet network fallback.

## Operational dependency: Reap

Current GameEngine accounting still needs permissionless `reap()` materialization for global `s_aliveCount`, phase thresholds and zero-survivor tiebreak when no gameplay action touches an expired token. The player UI never exposes Reap. Run the included keeper or the eventual user-funded/opportunistic sync design after it is implemented in the contracts.
