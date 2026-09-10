import { defineChain, type Address } from 'viem';
import { contracts, ABIS } from './Contracs_and_ABIs';

const compactUrls = (...values: Array<string | undefined>) => [...new Set(values.filter((v): v is string => Boolean(v && v.trim())).map(v => v.trim()))];
export const CURTIS_RPC_URLS = compactUrls(
  process.env.NEXT_PUBLIC_CURTIS_RPC_URL,
  process.env.NEXT_PUBLIC_CURTIS_RPC_FALLBACK_URL,
  'https://curtis.rpc.caldera.xyz/http',
);
export const ETHEREUM_RPC_URLS = compactUrls(
  process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
  process.env.NEXT_PUBLIC_ETHEREUM_RPC_FALLBACK_URL,
  'https://ethereum-rpc.publicnode.com',
);

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
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_CURTIS_RPC_URL || 'https://curtis.rpc.caldera.xyz/http'] } },
  blockExplorers: { default: { name: 'Curtis ApeScan', url: 'https://curtis.apescan.io' } },
  testnet: true,
});

export const ethereumMainnet = defineChain({
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com'] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io' } },
});

export const CHAIN_MODE = (process.env.NEXT_PUBLIC_CHAIN_MODE || 'curtis').toLowerCase();
export const ACTIVE_CHAIN = CHAIN_MODE === 'ethereum' ? ethereumMainnet : curtis;

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const addr = (v?: string) => ((v && /^0x[a-fA-F0-9]{40}$/.test(v)) ? v : ZERO_ADDRESS) as Address;

export const CONTRACTS = {
  gluttonNFT: addr(contracts.GluttonsNFT), // addr(process.env.NEXT_PUBLIC_GLUTTON_NFT_ADDRESS),
  gameEngine: addr(contracts.gameEngine), // addr(process.env.NEXT_PUBLIC_GAME_ENGINE_ADDRESS),
  inspector: addr(contracts.inspector), // addr(process.env.NEXT_PUBLIC_INSPECTOR_ADDRESS),
  prizeVault: addr(contracts.prizeVault), // addr(process.env.NEXT_PUBLIC_PRIZE_VAULT_ADDRESS),
  pvgTreasury: addr(contracts.pvgTreasury), // addr(process.env.NEXT_PUBLIC_PVG_TREASURY_ADDRESS),
  royaltyTreasury: addr(contracts.royaltyTreasury) // addr(process.env.NEXT_PUBLIC_ROYALTY_TREASURY_ADDRESS),
} as const;

export const MINT_PRICE = 4_000_000_000_000_000n;
export const FEED_PRICE = 600_000_000_000_000n;
export const POISON_PRICE = 400_000_000_000_000n;
export const POWER_PRICE = 300_000_000_000_000n;
export const DEFAULT_MAX_SUPPLY = 2000;
// Compatibility fallback only. Runtime UI reads GameEngine.MAX_SUPPLY() / S.
export const MAX_SUPPLY = DEFAULT_MAX_SUPPLY;
// Canonical mainnet = 3600. Accelerated Curtis can set 60 (1 test minute = 1 game hour).
export const GAME_HOUR_SECONDS = Math.max(1, Number(process.env.NEXT_PUBLIC_GAME_HOUR_SECONDS || 3600));
export const PUBLIC_MAX_PER_WALLET = 4;
export const NATIVE_SYMBOL = ACTIVE_CHAIN.nativeCurrency.symbol;

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
  fallbackFresh: '/art/glutton-3.png',
  fallbackRotten: '/art/glutton-4.png',
} as const;

export const INSPECTOR_ABI = ABIS.Inspector;

const COMMUNITY_COMPONENTS = [
  { name: 'name', type: 'string' },
  { name: 'collectionAddress', type: 'address' },
  { name: 'maxTotalAmountAllowed', type: 'uint256' },
  { name: 'maxPerWallet', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
  { name: 'amountMinted', type: 'uint256' },
] as const;

export const GAME_ENGINE_ABI = ABIS.GameEngine;

export const GLUTTON_NFT_ABI = ABIS.Nft;
// Fast client-side discovery of invited NFT ownership.
// The reviewed GameEngine independently re-verifies balanceOf(msg.sender)
// inside preMint(), so this preview is UX only — contract state is authoritative.
export const PARTNER_ERC721_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const PRIZE_VAULT_ABI = ABIS.PrizeVault;

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const ROYALTY_TREASURY_ABI = ABIS.RoyaltyTreasury;

export const PVG_TREASURY_ABI = ABIS.PVGTreasury;
