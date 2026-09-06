# Gluttons Frontend Curtis — V2.0

This revision fixes the product-stage gating and removes the mock `My Gluttons` inventory. It is built around Carlos's Curtis frontend blueprint: Next.js App Router + `/src`, Tailwind, Wagmi, RainbowKit, Jotai, Inspector for canonical reads, GameEngine for writes.

## What changed in V2

### 1. Correct website stages
The main URL now has three product states:

- **AWARENESS** — only teaser + Follow @GluttonGame + pasted wallet registration. No wallet connection, Mint, Rules, My Gluttons or OpenSea nav is exposed.
- **MINT** — Mint + Rules + Connect Wallet. `My Gluttons` stays hidden and its direct URL redirects home.
- **LIVE** — automatically activates whenever `GameEngine.s_gameStart() > 0` (sellout auto-start or permissionless backstop start). The homepage becomes the public Stadium and `My Gluttons` unlocks.

Set the pre-game marketing state with:

```env
NEXT_PUBLIC_SITE_STAGE=awareness
# later change to:
NEXT_PUBLIC_SITE_STAGE=mint
```

Or use `auto` + `NEXT_PUBLIC_MINT_UI_OPEN_AT`.

**Important:** the frontend cannot infer "awareness vs mint marketing launch" from PRE_GAME because both are the same onchain phase. This one env switch is intentional. Game Start itself is onchain and automatic.

### 2. Real My Gluttons inventory
The old sample IDs (`#0842`, `#1190`, etc.) are gone.

`src/hooks/useOwnedGluttons.ts` now:

1. Reads `GameEngine.s_totalMinted()`.
2. Scans token IDs `1..s_totalMinted` in **batched multicalls** using `GluttonNFT.ownerOf()` because ERC721A/721AC is not ERC721Enumerable.
3. Keeps only token IDs owned by the connected wallet.
4. Reads each token's `Inspector.getTokenView()` + `GameEngine.s_tokenStates()` + `GluttonNFT.tokenURI()`.
5. Fetches the metadata image from tokenURI/IPFS.
6. Separates real survivors, Fresh corpses and Rotten corpses.

This also means transfers are respected: ownership is discovered from the current chain state, not from mint history.

### 3. Pre-reveal art is used before Game Start
During Awareness and Mint the UI NEVER shows a revealed Glutton as the product image.

**Replace this file with final pre-reveal art:**

```text
/public/art/pre-reveal.png
```

The included file is only a temporary user-supplied Glutton rendered as a black silhouette by CSS so Carlos can test immediately.

Fallback live-art files are configured in one place:

```text
src/lib/constants.ts -> ASSETS
```

If real token metadata is reachable, those fallbacks are not used.

### 4. `POWER` renamed to `KEEP FRESH`
The Solidity function remains `powerFridge(tokenId)`, but player-facing copy is now:

> **KEEP FRESH** — Refrigerator slows spoilage 4× for 24H.

Fresh corpses that are logically dead but have not been materialized first show **REGISTER CORPSE / REAP** so the user does not hit `powerFridge` / `consumeCorpse` before `deadAt` exists.

### 5. Gameplay buttons are wired to the provided functions
The UI now contains live paths for:

- `mint()`
- `ensureStarted()`
- `feed(tokenId)`
- `enterFast(tokenId)`
- `poison(attackerId,targetId)`
- `powerFridge(tokenId)` → UI label **KEEP FRESH**
- `consumeCorpse(eaterId,corpseId)`
- `liveDevour(eaterId,preyId)`
- `reap(tokenIds[])`
- `voteTruce(tokenId)`
- `settleGame(liveTokenIds[])`
- `GluttonNFT.refreshMetadata(tokenId)`
- `PrizeVault.claimPrize()`
- `RoyaltyTreasury.flushWETH()`

The frontend still never substitutes itself for the contracts; invalid final state is expected to revert onchain.

### 6. Public Stadium contains real state only
The LIVE homepage shows real contract reads:

- Minted
- Alive / Starting Population
- Native APE Pot balance at PrizeVault
- Current Meal
- Completed Metabolism Bars
- Total normal feeds
- Phase
- Next threshold copy
- Curtis block heartbeat

Fake Feed/Poison/death event tape data has been removed.

### 7. Creative FX pass
The design now includes active effects even while idle:

- CRT scanline
- animated code rain
- lightweight animated noise/vignette
- periodic title glitch
- periodic letter rotation
- letter-weight cycling that forms words such as HUNGER / FEED / ROT
- animated terminal ticker
- blinking urgency timers at different speeds
- scroll reveal using IntersectionObserver
- animated grid and pre-reveal eyes
- more rounded panels/buttons while keeping a terminal/DEX feel
- opt-in WebAudio UI bleeps through `SND OFF / ON`

Audio must be opt-in because browsers block unsolicited autoplay. No audio files are needed; the interface synthesizes tiny square-wave bleeps with Web Audio.

Users with `prefers-reduced-motion` automatically get a reduced-motion version.

## Awareness wallet registration
The teaser POSTs to:

```text
POST /api/register
```

Production can use either:

### A. Webhook
```env
REGISTRATION_WEBHOOK_URL=https://...
REGISTRATION_WEBHOOK_BEARER=optional-secret
```

### B. Supabase
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_KEY
```

Create this table:

```sql
create table if not exists public.glutton_registrations (
  wallet text primary key,
  follow_ack boolean not null default true,
  source text,
  created_at timestamptz not null default now()
);
```

The service-role key stays server-side. Never rename it to `NEXT_PUBLIC_*`.

In local development only, if neither backend is configured, registrations are appended to `.local-data/registrations.ndjson` so the flow can still be tested.

## Install cleanly
Use Node 20 or 22, then:

```bash
rm -rf node_modules .next package-lock.json
npm install
npm run check
npm run dev
```

Do **not** run `npm audit fix --force` blindly on the wallet stack.

## Contract addresses / ABIs
All deployment addresses and ABIs remain centralized here:

```text
src/lib/constants.ts
```

CommunityMintController remains based on the approved V2 handoff interface. Reconcile that ABI with Carlos's final deployed controller ABI if his implementation differs.

## Community allocations
`/communities` remains a separate URL/control surface and is not exposed as a page in the main Gluttons navigation.

## One contract/frontend warning to reconcile before mainnet
The supplied frontend blueprint's `voteTruce()` code calculates `maxTrucePop` as `(S * 15) / 1000` (1.5%), while the Final Design/Math documentation describes a different final threshold. The frontend does not override the deployed contract. Carlos should reconcile that contract/document mismatch before mainnet.


## Carlos test handoff

See `IMPLEMENTATION_NOTES.md` for the exact Curtis test sequence and asset/backend swap points.
