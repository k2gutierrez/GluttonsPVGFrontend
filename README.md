# Gluttons Frontend — Curtis V2.3 Wallet Mint Counters

Deploy-ready Next.js frontend updated to the **latest reviewed Gluttons Frontend Integration Manual**.

## V2.3 change
The GameEngine now exposes both wallet mint counters publicly, so the frontend can show the user's exact mint usage before a transaction:

```solidity
s_normalMintAmount(address wallet)
s_amountMintPerCollection(address wallet, address collection)
```

### Public Mint UX
The console now displays:
- `YOUR PUBLIC MINTS X / 4`;
- exact remaining public allowance;
- wallet usage progress bar;
- quantity capped to the exact remaining allowance;
- `PUBLIC MINT LIMIT USED` when the connected wallet reaches 4/4.

### Community Pre-Mint UX
For each invited collection the UI now displays:
- invited NFT holder detection;
- `YOU X / maxPerWallet`;
- exact Community mints left for that wallet;
- total Community allocation minted / remaining;
- quantity capped by wallet allowance, Community allocation and global supply.

These are canonical GameEngine reads. The contract still performs the final validation at execution.

## Important counter behavior
The current Solidity contract keeps Community and Public counters separate:

```text
Community: s_amountMintPerCollection(wallet, collection)
Public:    s_normalMintAmount(wallet)
```

Therefore Community Pre-Mints do **not** consume the 4 Public Mint counter unless the smart contract is intentionally changed later.

## Stack
- Next.js 15 App Router (`src/`)
- React 19
- TailwindCSS
- Wagmi v2
- RainbowKit
- Viem
- Jotai
- TanStack Query

Dependency versions remain pinned to avoid the connector/x402 drift encountered in the earlier install.

## Install

```bash
npm install
cp .env.example .env.local
npm run check
npm run dev
```

Open `http://localhost:3000`.

## Required Curtis addresses

```env
NEXT_PUBLIC_GLUTTON_NFT_ADDRESS=
NEXT_PUBLIC_GAME_ENGINE_ADDRESS=
NEXT_PUBLIC_INSPECTOR_ADDRESS=
NEXT_PUBLIC_PRIZE_VAULT_ADDRESS=
NEXT_PUBLIC_PVG_TREASURY_ADDRESS=
NEXT_PUBLIC_ROYALTY_TREASURY_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Community Pre-Mint lives inside GameEngine. There is no CommunityMintController address.

## Website lifecycle

### Awareness
```env
NEXT_PUBLIC_SITE_STAGE=awareness
```
Only teaser + X follow + pasted-wallet registration.

### Mint
```env
NEXT_PUBLIC_SITE_STAGE=mint
```
GameEngine chooses the mint surface automatically:
- `s_preMintEnd=false` → Community Pre-Mint
- `s_preMintEnd=true` → Public Mint

### Live
Once `s_gameStart > 0`, contract state overrides marketing config. The home route becomes the live Stadium and `MY GLUTTONS` unlocks.

## Separate Community Admin URL
`/communities` remains the GameEngine Owner console for community configuration and is intentionally outside the main player navigation.

## My Gluttons
The inventory discovers NFTs currently owned by the connected wallet and uses Inspector/GameEngine/tokenURI for live state, clocks, gameplay statuses and artwork.

## Art replacement
Replace:

```text
public/art/pre-reveal.png
```

with final unrevealed art. Fallback paths are centralized in `src/lib/constants.ts -> ASSETS`.

## Validation

```bash
npm run check
npm run build
```

See `BLUEPRINT_DELTA_V2.3.md` and `IMPLEMENTATION_NOTES.md` for the exact contract/frontend delta and Curtis test plan.

## V2.4 — Curtis-safe inventory pagination + public Inspector

- `My Gluttons` no longer scans/hydrates the entire 1..2000 supply in one hook pass.
- Inventory discovery uses 50-token ID pages (`INVENTORY_PAGE_SIZE = 50`) and loads the next page when the pagination sentinel approaches the viewport; a manual `LOAD NEXT 50` fallback remains visible.
- The exact wallet NFT balance is read with `GluttonNFT.balanceOf(address)` so the UI can show `WALLET / LOADED / SCANNED` without pretending the partially loaded state counts are complete.
- All Curtis multicalls use `deployless: true`; individual `/inspect` reads use `readContract` and do not need multicall.
- `/inspect` is now a real public route and the Live Dashboard INSPECT link points to it.
- `My Gluttons` has `FULL INSPECT` per token; `SYNC METADATA` remains a separate action.
- TxButton React 19 type fix included: `useRef<string | undefined>(undefined)`.
- Final-table scanning was reduced from 200-token calls to 50-token calls as an additional Curtis RPC safety measure.

For a stress-test wallet holding all 2,000 Gluttons, the expected behavior is: load 50 -> render -> scroll -> load next 50, rather than issuing one 2,000-token RPC payload.
