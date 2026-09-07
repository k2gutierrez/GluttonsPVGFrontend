# Gluttons Frontend V2.3 — Wallet Mint Counter Integration Notes

## Authority
This build follows the latest reviewed Frontend Integration Manual, including the public `s_normalMintAmount` and `s_amountMintPerCollection` mappings.

## Website lifecycle
1. `awareness` → teaser only.
2. `mint` + `s_preMintEnd=false` → Community Pre-Mint.
3. `mint` + `s_preMintEnd=true` → Public Mint.
4. `s_gameStart>0` → Live Stadium + My Gluttons.

## Mint counters

### Public Mint
The frontend reads:

```solidity
s_normalMintAmount(wallet)
```

and displays `used / 4`, remaining allowance, and a progress bar. The quantity control is capped to the wallet's remaining public allowance and remaining collection supply.

### Community Pre-Mint
For every invited collection the frontend reads:

```solidity
s_amountMintPerCollection(wallet, collectionAddress)
```

and displays `used / maxPerWallet`. The transaction quantity is capped to:

```text
min(
  wallet community allowance remaining,
  community allocation remaining,
  global Glutton supply remaining
)
```

Holder status is still previewed with the invited NFT's `balanceOf(wallet)`. GameEngine independently re-verifies holder ownership and all mint counters at execution.

## Important distinction
Community Pre-Mint usage and Public Mint usage are separate mappings in the current GameEngine. Therefore a Community Pre-Mint does not visually reduce the `YOUR PUBLIC MINTS X / 4` counter unless the Solidity contract is changed to make those caps shared.

## Gameplay integration
- Canonical card state: Inspector `getTokenView(tokenId)`.
- FAST / Final Bite / cooldown / fridge timer / Reap data: `s_tokenStates(tokenId)`.
- Artwork: `tokenURI(tokenId)`.
- Fresh/Rotten: Inspector `visualState`, already reconciled with refrigerated spoilage.
- `powerFridge(tokenId)` remains **KEEP FRESH** in player-facing UI.

## Curtis test order
1. Deploy the latest contracts and update `.env.local` addresses.
2. Set `NEXT_PUBLIC_SITE_STAGE=mint`.
3. Add + activate an invited collection at `/communities`.
4. Connect an eligible wallet and confirm Community UI begins at `0 / maxPerWallet`.
5. Pre-Mint 1; wait for confirmation/refetch; confirm counter becomes `1 / maxPerWallet`.
6. Reload the page; confirm the same counter persists from chain state.
7. Reach the wallet Community cap; confirm quantity is capped and the button becomes `COMMUNITY MINT LIMIT USED`.
8. End Pre-Mint and confirm automatic Public Mint switch.
9. Confirm Public counter starts from `s_normalMintAmount(wallet)` rather than NFT balance.
10. Public mint 1–4 and confirm `YOUR PUBLIC MINTS` updates after each transaction.
11. Reach `4 / 4`; confirm the UI blocks further Public Mints before signing.
12. Confirm a wallet with prior Community Pre-Mints still receives the separate Public counter defined by the contract.
13. Continue Game Start / Live Stadium / My Gluttons gameplay tests.
