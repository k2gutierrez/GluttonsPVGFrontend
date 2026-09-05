
## v1.1 dependency lock

If you received the first ZIP and saw `@x402/evm/upto/client` missing, use this version instead. See `DEPENDENCY_FIX.md`. Dependency versions are now exact and the x402 peers required by the transitive Coinbase/Base connector are included.

Recommended clean install:

```bash
rm -rf node_modules package-lock.json .next
npm cache verify
npm install
npm run check
npm run dev
```

# Gluttons Frontend — ApeChain Curtis

Copy-paste deployable Next.js App Router frontend using `src/`, TailwindCSS, Wagmi, RainbowKit, React Query and Jotai.

## 1. Install
```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Replace contract addresses
Edit `.env.local`. All contract ABIs and address bindings live in **`src/lib/constants.ts`** by design.

## 3. Curtis network
The frontend is configured for ApeChain Curtis testnet (chain id `33111`, native gas token `APE`, Caldera Curtis RPC, Curtis ApeScan explorer). If your deployment tooling gives you a different RPC endpoint, replace only `curtis.rpcUrls` in `src/lib/constants.ts`.

## 4. Routes
- `/` — phase-aware landing / mint / Live Stadium.
- `/my-gluttons` — survival desk and action UI.
- `/rules` — one-screen rules and phase explanation.
- `/admin` — PVG Treasury restricted console.
- `/communities` — **separate Community Allocation surface**. It is intentionally not linked into the main Gluttons navigation.

## 5. Important handoff notes
- `Inspector` is read-only. Never execute gameplay through it.
- `GameEngine` handles mint/feed/FAST/poison/corpse/devour actions.
- `PrizeVault` claim and `RoyaltyTreasury.flushWETH()` ABIs are included.
- Community allocations use their own `CommunityMintController`. The included ABI follows the Community V2 handoff surface. **Compare it against Carlos' final deployed controller ABI before production.**
- Community name/logo and Merkle source storage are presentation/offchain concerns; allocation, root, claim and reserved-supply truth must come from the controller.
- The `/communities` CSV preview currently demonstrates local normalization/root preview. For production, replace the demo root construction with the exact Merkle tree algorithm used by the controller/backend proof service (same sorting/leaf encoding). Do not ship mismatched Merkle construction.
- Example Glutton cards/event tape are visual placeholders until token enumeration/indexer/subgraph data is connected. Canonical per-token truth should come from `Inspector.getTokenView`.

## 6. Images
Four supplied Glutton PNGs are copied into `public/art/`. Replace/add art without touching contract code.

## 7. Build
```bash
npm run build
npm start
```

## Design system
Dark operational terminal, orange/red pressure states, scanlines, hover/glitch microinteractions, old programming/financial terminal language, DEX-style dashboards after Game Start. Teaser/mint remains cleaner and more conventional.
