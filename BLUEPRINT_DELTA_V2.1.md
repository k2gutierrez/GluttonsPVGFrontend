# Gluttons Frontend V2.1 — Latest Integration Manual Delta

This build updates the prior V2.0 frontend to the newly supplied **Gluttons Protocol: Frontend Integration Manual**.

## Contract/API changes implemented

1. **Community mint no longer uses a CommunityMintController.**
   - All community configuration and pre-mint execution now point to `GameEngine`.
   - `NEXT_PUBLIC_COMMUNITY_MINT_CONTROLLER_ADDRESS` was removed.

2. **Two mint phases are now read directly from `GameEngine.s_preMintEnd`.**
   - `false` → Community Pre-Mint.
   - `true` → Public Mint.
   - Game Start still overrides both and automatically unlocks the live experience.

3. **Community Pre-Mint**
   - Reads `getInvitedNftCommunities()`.
   - Reads dynamic `s_communityMintprice`.
   - Uses `preMint(amount, collectionId)`.
   - The UI checks connected-wallet `balanceOf()` against each invited ERC-721 collection for discovery/UX.

4. **Public Mint**
   - Uses `mint(amount)` instead of the older no-argument mint call.
   - Multiplies `MINT_PRICE × amount` for `msg.value`.
   - Quantity selector enforces 1–4 per transaction; the contract remains authoritative for the lifetime 4-mint cap.

5. **`/communities` is now the Owner-only GameEngine Pre-Mint Admin Console.**
   - `addInviteCollection`
   - `allowCommunityMint`
   - `modifyCollectionMaxAllowed`
   - `modifyCollectionMaxPerWallet`
   - `changeCommunityMintPrice`
   - `endPreMintedPhase`
   - Caps are UI-gated to increases only.
   - Ending Pre-Mint is presented as irreversible.

6. **Error translation updated** for the new mint-specific custom errors.

7. **Rules page updated** to explain Community Pre-Mint → Public Mint before the game begins.

## IMPORTANT SECURITY MISMATCH FOUND IN THE SUPPLIED DOCUMENT

The prose says Community Pre-Mint is **only for users holding invited NFTs**. The frontend follows that product requirement and checks `balanceOf()` for the connected wallet.

However, the supplied `GameEngine.preMint(amount, collectionId)` implementation shown in the same document does **not** call `balanceOf(msg.sender)` or `ownerOf(...)` on the invited collection before minting. It only checks:

- community is allowed;
- community total cap;
- per-wallet amount mapping;
- max supply;
- payment value.

Therefore the current Solidity excerpt does **not cryptographically enforce invited-NFT ownership**. Frontend gating is not security because a user can call the contract directly.

### Required contract-side fix before production

Carlos should add an onchain holder check inside `preMint`, e.g. against the configured `collection.collectionAddress`, before allowing the mint. The exact implementation should be chosen by the smart-contract developer and tested in Foundry.

Until that is fixed, this frontend labels its holder detection as a UX/discovery check only.

## Additional source limitations preserved

- `s_amountMintPerCollection` is private and has no public getter, so the frontend cannot display the exact number of Pre-Mints already used by a wallet for one invited collection. The contract still enforces the cap.
- `s_normalMintAmount` is private and has no public getter, so the frontend cannot reliably display remaining Public Mint allowance for a wallet from a simple view call. The contract still enforces the 4-mint cap.
- The new GameEngine community system does not expose the old `reservedRemaining` accounting invariant. Do not label collection caps as guaranteed reserved supply unless the Solidity is changed to enforce reservation math.

## TWO MORE SOLIDITY CONSISTENCY ITEMS FOUND

### 1. `IGluttonNFT.gameMint` signature mismatch

The supplied `GluttonNFT.sol` implements:

```solidity
function gameMint(address to, uint256 amount) external
```

and `GameEngine` calls:

```solidity
IGluttonNFT(s_gluttonNFT).gameMint(msg.sender, amount);
```

but the `IGluttonNFT.sol` excerpt at the end of the same document declares only:

```solidity
function gameMint(address to) external;
```

Those signatures must be reconciled in the Solidity interface before compilation/deployment. The frontend uses `GameEngine.mint/preMint` and is not directly affected, but the protocol contracts are.

### 2. Fridge spoilage vs `getVisualState` mismatch

`powerFridge()` and `_syncSpoilage()` use `spoilQ4` and `poweredUntil`, making powered spoilage advance at one quarter speed. But the supplied `getVisualState()` determines Fresh vs Rotten using raw `block.timestamp - actualDeadAt < 24 hours`, without consulting `spoilQ4` or `poweredUntil`.

That can make Inspector/tokenURI report **ROTTEN** after 24 real hours while the consumption logic still treats the refrigerated corpse as **FRESH**.

Frontend V2.1 therefore derives **gameplay Fresh/Rotten eligibility** from the stored spoilage record for action gating, while still resolving the tokenURI returned by the contract for the displayed NFT image. The Solidity visual-state function should be reconciled so metadata and gameplay state cannot disagree in production.
