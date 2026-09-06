# Gluttons Frontend V2 — Carlos Handoff

## What changed

### 1. Real wallet inventory
`/my-gluttons` no longer contains sample token IDs or sample Glutton cards.

The collection is ERC721A/ERC721AC and is not enumerable, so the frontend discovers a connected wallet's actual tokens by multicalling `GluttonNFT.ownerOf(tokenId)` from `1..GameEngine.s_totalMinted()`, then hydrates only owned token IDs with:

- `Inspector.getTokenView(tokenId)` — canonical player-facing state
- `GameEngine.s_tokenStates(tokenId)` — cooldown / FAST / Final Bite / fridge internals required for legal-action UX
- `GluttonNFT.tokenURI(tokenId)` — state-aware metadata/image

Burned IDs are ignored because ownerOf reverts for them.

### 2. Website stages
Set `NEXT_PUBLIC_SITE_STAGE` in `.env.local`:

- `awareness`: teaser only. Follow X + paste wallet. No wallet connect, Mint, Rules, or My Gluttons nav.
- `mint`: Mint + Rules. Artwork remains pre-reveal. My Gluttons is inaccessible.
- `auto`: awareness until `NEXT_PUBLIC_MINT_UI_OPEN_AT`, then mint.

**Onchain Game Start always overrides the marketing stage.** Once `s_gameStart > 0`, `/` becomes the Live Stadium and My Gluttons unlocks.

Sellout starts the supplied GameEngine automatically. If the immutable `i_startBackstop` is reached first, the Mint screen exposes `START GAME`, which calls the supplied permissionless `ensureStarted()`.

There is intentionally no frontend-only force-start button. If Curtis testing needs an earlier start and the deployed backstop is still in the future, redeploy the test GameEngine with a nearer test backstop rather than bypassing the contract rule in UI.

### 3. Pre-reveal asset
Replace exactly:

`public/art/pre-reveal.png`

The component is `src/components/PreRevealArt.tsx` and the path is centralized in `src/lib/constants.ts -> ASSETS.preReveal`.

### 4. KEEP FRESH
The Solidity function remains `powerFridge(tokenId)`. Player-facing copy is now **KEEP FRESH** / **FRIDGE ON**.

The UI explains the actual supplied mechanic: the refrigerator powers the Fresh corpse for 24 real hours and slows spoilage 4x. Contract function names are not exposed as product language.

### 5. Awareness wallet capture
`POST /api/register` validates an EVM address. For production, configure one backend:

**Webhook**
- `REGISTRATION_WEBHOOK_URL`
- optional `REGISTRATION_WEBHOOK_BEARER`

or **Supabase**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The local NDJSON fallback is development-only and is not durable on serverless deployments.

The "follow complete" step is explicitly an acknowledgement, not a fake X API verification. Add OAuth/X verification later only if the project gets approved API access.

### 6. Visual FX
The global FX layer adds active CRT scanlines, noise/vignette, falling code, idle title glitches, text scramble, rotating/weight-changing words, blinking timers, chain heartbeat, scroll reveal, marquee movement and optional Web Audio UI bleeps.

Sound is OFF by default due browser autoplay policy. `SND ON` enables it after a user gesture.

`prefers-reduced-motion` is respected.

### 7. Community route remains isolated
`/communities` is not in the main navigation. Its allocation-critical values are read from `CommunityMintController`.

The repository deliberately does **not** invent a Merkle leaf/hash convention for CSV lists because that exact convention was not specified in the supplied controller handoff. Reconcile `COMMUNITY_CONTROLLER_ABI` and the proof-builder/API with Carlos's final deployed controller before enabling wallet-list publishing in production.

## First run

Keep the existing working contract addresses from the previous `.env.local`, then add the new stage/registration variables from `.env.example`.

```bash
rm -rf node_modules .next package-lock.json
npm install
npm run check
npm run dev
```

Then, before deployment:

```bash
npm run build
```

## Curtis test checklist

1. `NEXT_PUBLIC_SITE_STAGE=awareness` -> no Connect Wallet, no Mint/Rules/My Gluttons nav.
2. `NEXT_PUBLIC_SITE_STAGE=mint` -> pre-reveal only; mint transaction succeeds; minted count increments from GameEngine.
3. Reach sellout OR immutable backstop + click `START GAME` -> `s_gameStart` becomes nonzero.
4. Home automatically changes to Live Stadium without changing env.
5. Connect a wallet that minted -> My Gluttons shows only its actual token IDs.
6. tokenURI metadata resolves to the actual alive/corpse art; if it does not, inspect the URI/gateway before blaming ownership discovery.
7. Feed/FAST/Poison buttons operate on selected owned token IDs.
8. A logical corpse that has not been materialized first offers `REGISTER CORPSE / REAP`; then Eat/Keep Fresh become available.
9. `KEEP FRESH` calls `powerFridge` and shows fridge countdown.
10. Plague exposes Devour only when phase permits it.
11. Last Supper exposes Truce only according to deployed contract behavior.
12. Settled state exposes PrizeVault `claimPrize`.
