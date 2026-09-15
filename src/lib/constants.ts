import { defineChain, type Address } from 'viem';
import {
  contracts as CONTRACTS_FILE,
  GameEngineABI,
  GluttonsNftABI,
  InspectorABI,
  PrizeVaultABI,
  PVGTreasuryABI,
  RoyaltyTreasuryABI,
} from './Contracs_and_ABIs';

const compactUrls = (...values: Array<string | undefined>) => [...new Set(values.filter((v): v is string => Boolean(v && v.trim())).map(v => v.trim()))];
// Browser transport is a low-volume wallet/network fallback only. Never put paid/private RPC keys in NEXT_PUBLIC env vars.
export const CURTIS_RPC_URLS = compactUrls(
  process.env.NEXT_PUBLIC_WALLET_RPC_URL,
  'https://curtis.rpc.caldera.xyz/http',
  'https://rpc.curtis.apechain.com/',
);
export const ETHEREUM_RPC_URLS = compactUrls(
  process.env.NEXT_PUBLIC_WALLET_RPC_URL,
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
  rpcUrls: { default: { http: CURTIS_RPC_URLS } },
  blockExplorers: { default: { name: 'Curtis ApeScan', url: 'https://curtis.apescan.io' } },
  testnet: true,
});

export const ethereumMainnet = defineChain({
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ETHEREUM_RPC_URLS } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io' } },
});

export const CHAIN_MODE = (process.env.NEXT_PUBLIC_CHAIN_MODE || 'curtis').toLowerCase();
export const ACTIVE_CHAIN = CHAIN_MODE === 'ethereum' ? ethereumMainnet : curtis;

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const addr = (v?: string) => ((v && /^0x[a-fA-F0-9]{40}$/.test(v)) ? v : undefined) as Address | undefined;

// ── Single-file deployment connection point ──────────────────────────
// Carlos' workflow: edit src/lib/Contracs_and_ABIs.ts (addresses + ABIs)
// and the frontend connects. .env.local vars still OVERRIDE the file when
// set, so Amplify/CI can pin a deployment without editing code. If both
// are unknown, the value is ZERO_ADDRESS (fail-safe: reads fail instead
// of fabricating state).
const fileAddr = (k: keyof typeof CONTRACTS_FILE) => {
  const v = CONTRACTS_FILE[k];
  return ((v && /^0x[a-fA-F0-9]{40}$/.test(String(v))) ? String(v) : undefined) as Address | undefined;
};
const pick = (envValue: string | undefined, fileKey: keyof typeof CONTRACTS_FILE): Address =>
  addr(envValue) ?? fileAddr(fileKey) ?? ZERO_ADDRESS;

export const CONTRACTS = {
  gluttonNFT: pick(process.env.NEXT_PUBLIC_GLUTTON_NFT_ADDRESS, 'GluttonsNFT'),
  gameEngine: pick(process.env.NEXT_PUBLIC_GAME_ENGINE_ADDRESS, 'gameEngine'),
  inspector: pick(process.env.NEXT_PUBLIC_INSPECTOR_ADDRESS, 'inspector'),
  prizeVault: pick(process.env.NEXT_PUBLIC_PRIZE_VAULT_ADDRESS, 'prizeVault'),
  pvgTreasury: pick(process.env.NEXT_PUBLIC_PVG_TREASURY_ADDRESS, 'pvgTreasury'),
  royaltyTreasury: pick(process.env.NEXT_PUBLIC_ROYALTY_TREASURY_ADDRESS, 'royaltyTreasury'),
  futureRewardsVault: pick(process.env.NEXT_PUBLIC_FUTURE_REWARDS_VAULT_ADDRESS, 'futureRewardsVault'),
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

// ── ABIs — canonical single source: src/lib/Contracs_and_ABIs.ts ─────
// Verified 2026-09-14: identical to forge build artifacts of the current contracts.
export const INSPECTOR_ABI = InspectorABI;

// Fast client-side discovery of invited NFT ownership.
// The reviewed GameEngine independently re-verifies balanceOf(msg.sender)
// inside preMint(), so this preview is UX only — contract state is authoritative.
export const PARTNER_ERC721_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const GAME_ENGINE_ABI = GameEngineABI;
export const GLUTTON_NFT_ABI = GluttonsNftABI;
export const PRIZE_VAULT_ABI = PrizeVaultABI;

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const ROYALTY_TREASURY_ABI = RoyaltyTreasuryABI;
export const PVG_TREASURY_ABI = PVGTreasuryABI;
