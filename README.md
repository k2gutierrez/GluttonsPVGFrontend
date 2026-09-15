# GLUTTONS // FRONTEND v2.2 PRODUCTION READ ARCHITECTURE

This is the production-oriented Gluttons frontend package. It replaces the browser-as-indexer architecture used by v1.x.

## What ships in this ZIP

- Next.js App Router frontend under `src/`
- server-side `/api/read/*` read layer
- Redis-backed canonical read model
- independent `worker/indexer.ts`
- lazy metadata service
- transaction simulation / receipt endpoints
- production health endpoint
- source architecture audit
- guarded staging load-test script
- current reviewed contract reference package in `docs/`

## Non-negotiable architecture

**Reads:** Ethereum/ApeChain -> one indexer -> Redis -> API/CDN -> all browsers.

**Writes:** browser wallet -> canonical smart contract.

The browser MUST NOT scan 1..S, discover ownership with 2,000 `ownerOf` calls, or rebuild the final table from direct RPC reads. Paid RPC credentials MUST remain server-side.

## Local frontend

```bash
cp .env.example .env.local
npm install
npm run check
npm run audit
npm run build
npm run dev
```

## Indexer

The frontend requires Upstash Redis (or API-compatible Redis) plus a continuously running indexer worker.

```bash
# server/indexer env must include RPC_URL and UPSTASH credentials
npm run indexer:once
npm run indexer
```

Do not deploy the website as production-ready until `/api/read/health` returns `healthy: true` against the exact deployment configured in the frontend.


## Deploy order — do not skip

This v2.2 package is not a browser-only frontend. The public UI intentionally depends on the shared read model so 2,000+ browsers do not hammer the chain RPC. Deploy in this order:

1. Create/configure Redis and set the server/indexer env variables.
2. Deploy/run the persistent indexer and wait for a healthy bootstrap.
3. Verify `/api/read/health` reports `healthy: true` for the exact chain + GameEngine.
4. Deploy the Next.js app/API to Amplify (or equivalent).
5. Run `npm run verify:deployment` and the full state walkthrough.
6. Load-test STAGING before production traffic.

If only the Next.js UI is deployed without Redis + the indexer, the correct behavior is `SYNCING PROTOCOL`; it must not fall back to fake onchain values.

## Required production topology

1. Next.js site/API on Amplify or equivalent.
2. Redis read store.
3. Always-on indexer worker (container/VM; Dockerfile.indexer included).
4. Private primary RPC + private fallback from a different provider.
5. Reap keeper/permissionless accounting process as required by the current GameEngine design.
6. CDN in front of public read endpoints.

## Safety behavior

- A failed read is never interpreted as DEAD, CONSUMED, PRE_GAME, or zero balance.
- Previously confirmed state remains visible during a degraded read service.
- Gameplay/mint/claim GameEngine or PrizeVault actions are paused in the official UI when the shared canonical snapshot is stale.
- `s_gameStart > 0` remains the irreversible LIVE latch for that chain + GameEngine deployment.
- Local cache is namespaced by chain ID + GameEngine address, so a redeploy cannot inherit another deployment's cached state.

## QA

Run:

```bash
npm run check
npm run audit
npm run build
```

Then deploy to staging and run the guarded load test:

```bash
LOAD_TEST_URL=https://STAGING_DOMAIN \
LOAD_TEST_VUS=2000 \
LOAD_TEST_CONCURRENCY=100 \
LOAD_TEST_CONFIRM=YES \
npm run load:test
```

The included static audit verifies that the high-traffic public UX has no direct Wagmi/Viem contract read hooks.

See `PRODUCTION_ARCHITECTURE_v2.2.md`, `DEPLOYMENT_CHECKLIST_v2.2.md`, and `QA_ACCEPTANCE_v2.2.md` before production deployment.
