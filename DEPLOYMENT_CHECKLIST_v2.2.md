# Production Deployment Checklist v2.2

## 1. Contract identity
- [ ] All frontend addresses are from ONE deployment.
- [ ] Inspector was constructed with that exact GameEngine and GluttonNFT.
- [ ] Chain mode matches deployment.
- [ ] Curtis test supply is read dynamically; mainnet supply is 2,000 from GameEngine.

## 2. Private infrastructure
- [ ] Create production Redis.
- [ ] Configure `RPC_URL` with a dedicated provider.
- [ ] Configure `RPC_FALLBACK_URL` from a different provider.
- [ ] Do not expose either RPC key in a `NEXT_PUBLIC_` variable.
- [ ] Set `DEPLOYMENT_BLOCK`.
- [ ] Run exactly one logical indexer leader; duplicate containers are safe because of the Redis lock but should be used only for failover.

## 3. Bootstrap
- [ ] `npm run indexer:once` succeeds.
- [ ] Redis protocol snapshot has correct chain/deployment.
- [ ] Token count matches `S`/minted population.
- [ ] Wallet ownership sets spot-check correctly.
- [ ] `/api/read/health` returns HTTP 200 and `healthy:true`.

## 4. Frontend
- [ ] `npm install`
- [ ] `npm run check`
- [ ] `npm run audit`
- [ ] `npm run build`
- [ ] no horizontal scroll at 320/360/375/390/430/768/desktop widths.
- [ ] no private RPC key appears in browser bundle/network requests.

## 5. State-machine acceptance
- [ ] Awareness does not show Mint unless configured.
- [ ] Community Pre-Mint uses shared protocol + eligibility read.
- [ ] Public Mint uses correct wallet cap and supply.
- [ ] Sellout/backstop causes irreversible LIVE transition.
- [ ] FEAST actions/gates correct.
- [ ] PLAGUE unlocks Live Devour correctly.
- [ ] LS_WARNING retains prior-phase rules until bell.
- [ ] LAST_SUPPER removes Feed/Fast/Poison/Keep Fresh.
- [ ] Truce appears only at threshold and displays N/N current-epoch votes.
- [ ] 1 survivor gets `CLOSE THE TABLE` flow.
- [ ] zero-survivor UI waits for deterministic tiebreak settlement.
- [ ] SETTLED removes live clocks/actions.
- [ ] winner sees claim; losing wallet does not.

## 6. Failure acceptance
- [ ] Stop indexer: last confirmed state remains visible, marked degraded.
- [ ] After stale threshold official gameplay actions are disabled.
- [ ] Restart indexer: UI converges without reload.
- [ ] Kill primary RPC: worker uses secondary provider.
- [ ] Simulate token read failure: token never becomes CONSUMED solely because of failure.
- [ ] Redis/API failure never opens Mint or changes LIVE to PRE_GAME.
- [ ] New deployment address cannot reuse old local cached protocol state.

## 7. Concurrency
- [ ] Load test staging with 2,000 virtual GET requests.
- [ ] Repeat at 10,000 spectator-read scale if infrastructure budget permits.
- [ ] Origin/API error rate <1%.
- [ ] p95 read latency target <500ms with warm CDN/Redis.
- [ ] Verify blockchain RPC request volume is approximately independent of spectator count for public read endpoints.

## 8. Operations
- [ ] Reap keeper funded with gas-only wallet if current GameEngine requires it.
- [ ] Indexer health monitoring + alert on stale age.
- [ ] Redis availability monitoring.
- [ ] RPC quota/429 alerts.
- [ ] CDN/WAF/rate limiting enabled for abuse protection.
- [ ] Backups/export of deployment env and contract addresses.
