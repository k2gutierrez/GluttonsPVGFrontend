# DEPLOY NOW — Gluttons Frontend v2.2

This package is intentionally different from v1.x. **Do not deploy only the browser bundle and expect it to work.** The browser no longer indexes the chain.

## 1. Create the read store
Create Upstash Redis and set these variables in BOTH the Next.js runtime and the indexer worker:

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## 2. Configure the exact deployment
Copy `.env.example` to your environment and set all `NEXT_PUBLIC_*_ADDRESS` values to one deployment. Set `DEPLOYMENT_BLOCK` to the GameEngine deployment block.

Server/indexer only:

```env
RPC_URL=PRIVATE_PRIMARY_RPC
RPC_FALLBACK_URL=PRIVATE_SECOND_PROVIDER_RPC
```

Never put paid/private RPC keys in `NEXT_PUBLIC_*`.

## 3. Build locally / CI

```bash
npm install
npm run check
npm run audit
npm run build
```

Do not continue if any command fails.

## 4. Bootstrap and run the persistent indexer

```bash
npm run indexer:once
npm run indexer
```

For production, run the indexer as an always-on container/VM process using `Dockerfile.indexer`; it is not a browser task and should not depend on an open laptop.

## 5. Deploy Next.js + API routes
Deploy the project to Amplify or another Next.js server runtime with the public address variables plus Redis credentials. The `/api/read/*` routes require a server runtime; this is not a static export.

## 6. Verify before players enter
Set `READ_BASE_URL` to the deployed site and run:

```bash
npm run verify:deployment
```

Then open:

```text
/api/read/health
```

It must return HTTP 200 with `healthy: true`, the correct chain, and the exact GameEngine address.

## 7. Staging load test

```bash
LOAD_TEST_URL=https://YOUR-STAGING-DOMAIN \
LOAD_TEST_VUS=2000 \
LOAD_TEST_CONCURRENCY=100 \
LOAD_TEST_CONFIRM=YES \
npm run load:test
```

The browser Network tab during ordinary LIVE / My Gluttons / Leaderboard navigation should primarily show `/api/read/*`. It must **not** show a continuous flood of POST requests to Curtis/Ethereum RPC. Low-volume wallet/provider traffic during connect/sign/write is expected.

## Release rule
Do not send production traffic until `DEPLOYMENT_CHECKLIST_v2.2.md` is complete. If Redis/indexer is absent or unhealthy, the correct UI behavior is SYNCING/DEGRADED rather than invented game state.
