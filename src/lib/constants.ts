import { defineChain, type Address } from 'viem';
import { InspectorABI, GameEngineABI, NftABI, PrizeVaultABI, RoyaltyTreasuryABI, PVGTreasuryABI } from './contracts_abi';

// ─────────────────────────────────────────────────────────────
// GLUTTONS FRONTEND SINGLE CONFIG SURFACE
// Reviewed Integration Manual: Sep 2026
//
// IMPORTANT ARCHITECTURE CHANGE:
// Community pre-mint now lives INSIDE GameEngine. There is no
// CommunityMintController dependency in this frontend version.
// Replace only deployment addresses in .env.local after deploy.
// ─────────────────────────────────────────────────────────────
export const curtis = defineChain({
  id: 33111,
  name: 'ApeChain Curtis',
  nativeCurrency: { name: 'ApeCoin', symbol: 'APE', decimals: 18 },
  rpcUrls: { default: { http: ['https://curtis.rpc.caldera.xyz/http'] } },
  blockExplorers: { default: { name: 'Curtis ApeScan', url: 'https://curtis.apescan.io' } },
  testnet: true,
});

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const addr = (v?: string) => ((v && /^0x[a-fA-F0-9]{40}$/.test(v)) ? v : ZERO_ADDRESS) as Address;

export const CONTRACTS = {
  gluttonNFT: addr(process.env.NEXT_PUBLIC_GLUTTON_NFT_ADDRESS),
  gameEngine: addr(process.env.NEXT_PUBLIC_GAME_ENGINE_ADDRESS),
  inspector: addr(process.env.NEXT_PUBLIC_INSPECTOR_ADDRESS),
  prizeVault: addr(process.env.NEXT_PUBLIC_PRIZE_VAULT_ADDRESS),
  pvgTreasury: addr(process.env.NEXT_PUBLIC_PVG_TREASURY_ADDRESS),
  royaltyTreasury: addr(process.env.NEXT_PUBLIC_ROYALTY_TREASURY_ADDRESS),
} as const;

export const MINT_PRICE = 4_000_000_000_000_000n;
export const FEED_PRICE = 600_000_000_000_000n;
export const POISON_PRICE = 400_000_000_000_000n;
export const POWER_PRICE = 300_000_000_000_000n;
export const MAX_SUPPLY = 2000;
export const PUBLIC_MAX_PER_WALLET = 4;
export const NATIVE_SYMBOL = 'APE';

export const SITE = {
  // awareness | mint | auto. Game Start always overrides this and switches to LIVE.
  mode: (process.env.NEXT_PUBLIC_SITE_STAGE || 'awareness').toLowerCase(),
  mintUiOpenAt: process.env.NEXT_PUBLIC_MINT_UI_OPEN_AT || '',
  xUrl: process.env.NEXT_PUBLIC_X_URL || 'https://x.com/GluttonGame',
  openSeaUrl: process.env.NEXT_PUBLIC_OPENSEA_COLLECTION_URL || 'https://opensea.io',
  ipfsGateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
} as const;

// ASSET SWAP POINTS — no component hunting required.
// Replace public/art/pre-reveal.png with final pre-reveal artwork.
export const ASSETS = {
  preReveal: '/art/pre-reveal.png',
  fallbackAlive: '/art/glutton-1.png',
  fallbackFresh: '/art/freshdead.png',
  fallbackRotten: '/art/rottendead.png',
} as const;

export const INSPECTOR_ABI = InspectorABI;

const COMMUNITY_COMPONENTS = [
  { name: 'name', type: 'string' },
  { name: 'collectionAddress', type: 'address' },
  { name: 'maxTotalAmountAllowed', type: 'uint256' },
  { name: 'maxPerWallet', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
  { name: 'amountMinted', type: 'uint256' },
] as const;

export const GAME_ENGINE_ABI = GameEngineABI;

export const GLUTTON_NFT_ABI = NftABI;

// Fast client-side discovery of invited NFT ownership.
// The reviewed GameEngine independently re-verifies balanceOf(msg.sender)
// inside preMint(), so this preview is UX only — contract state is authoritative.
export const PARTNER_ERC721_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const PRIZE_VAULT_ABI = PrizeVaultABI;

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const ROYALTY_TREASURY_ABI = RoyaltyTreasuryABI;

export const PVG_TREASURY_ABI = PVGTreasuryABI;
