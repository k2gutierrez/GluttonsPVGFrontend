import { defineChain, type Address } from 'viem';

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
  fallbackFresh: '/art/glutton-3.png',
  fallbackRotten: '/art/glutton-4.png',
} as const;

export const INSPECTOR_ABI = [
  { type: 'function', name: 'getGlobalView', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'tuple', components: [
    { name: 'aliveCount', type: 'uint256' },
    { name: 'currentMealSeconds', type: 'uint256' },
    { name: 'isSettled', type: 'bool' },
    { name: 'currentPhase', type: 'string' },
  ] }] },
  { type: 'function', name: 'getTokenView', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [
    { name: 'owner', type: 'address' },
    { name: 'visualState', type: 'uint8' },
    { name: 'expiry', type: 'uint64' },
    { name: 'isHungry', type: 'bool' },
  ] }] },
] as const;

const COMMUNITY_COMPONENTS = [
  { name: 'name', type: 'string' },
  { name: 'collectionAddress', type: 'address' },
  { name: 'maxTotalAmountAllowed', type: 'uint256' },
  { name: 'maxPerWallet', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
  { name: 'amountMinted', type: 'uint256' },
] as const;

export const GAME_ENGINE_ABI = [
  // Custom errors — included so Viem/Wagmi can decode human-facing reverts.
  { type: 'error', name: 'GameEngine__ZeroAddress', inputs: [] },
  { type: 'error', name: 'GameEngine__MintClosed', inputs: [] },
  { type: 'error', name: 'GameEngine__MaxSupplyExceeded', inputs: [] },
  { type: 'error', name: 'GameEngine__InvalidMintValue', inputs: [] },
  { type: 'error', name: 'GameEngine__TransferFailed', inputs: [] },
  { type: 'error', name: 'GameEngine__AlreadyStarted', inputs: [] },
  { type: 'error', name: 'GameEngine__NotOwner', inputs: [] },
  { type: 'error', name: 'GameEngine__NotHungry', inputs: [] },
  { type: 'error', name: 'GameEngine__Dead', inputs: [] },
  { type: 'error', name: 'GameEngine__InvalidValue', inputs: [] },
  { type: 'error', name: 'GameEngine__InvalidState', inputs: [] },
  { type: 'error', name: 'GameEngine__ClockTooLow', inputs: [] },
  { type: 'error', name: 'GameEngine__OnCooldown', inputs: [] },
  { type: 'error', name: 'GameEngine__SelfPoison', inputs: [] },
  { type: 'error', name: 'GameEngine__Protected', inputs: [] },
  { type: 'error', name: 'GameEngine__AlreadySettled', inputs: [] },
  { type: 'error', name: 'GameEngine__NotLastSupper', inputs: [] },
  { type: 'error', name: 'GameEngine__NotUnanimous', inputs: [] },
  { type: 'error', name: 'GameEngine__AlreadyConfigured', inputs: [] },
  { type: 'error', name: 'GameEngine__NoConfigurationToStart', inputs: [] },
  { type: 'error', name: 'GameEngine__AlreadyAllowed', inputs: [] },
  { type: 'error', name: 'GameEngine__NormalMintNotAllowed', inputs: [] },
  { type: 'error', name: 'GameEngine__InvalidMaxPerWalletAmount', inputs: [] },
  { type: 'error', name: 'GameEngine__PreMintPhaseEnded', inputs: [] },
  { type: 'error', name: 'GameEngine__MaxSupplyForInviteExceeded', inputs: [] },
  { type: 'error', name: 'GameEngine__CommunityMintNotAllowed', inputs: [] },
  { type: 'error', name: 'GameEngine__NotCommunityHolder', inputs: [] },

  // Ownable / configuration reads
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },

  // Mint phases — latest manual
  { type: 'function', name: 's_preMintEnd', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 's_communityMintprice', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 's_invitedNftIds', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  // Per-wallet mint counters — public mappings added in the latest reviewed GameEngine.
  { type: 'function', name: 's_normalMintAmount', stateMutability: 'view', inputs: [{ name: 'minter', type: 'address' }], outputs: [{ name: 'mintedAmount', type: 'uint256' }] },
  { type: 'function', name: 's_amountMintPerCollection', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'collection', type: 'address' }], outputs: [{ name: 'amount', type: 'uint256' }] },
  { type: 'function', name: 'getInvitedNftCommunities', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'tuple[]', components: COMMUNITY_COMPONENTS }] },
  { type: 'function', name: 'preMint', stateMutability: 'payable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'collectionId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'mint', stateMutability: 'payable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },

  // Owner-only pre-mint admin
  { type: 'function', name: 'addInviteCollection', stateMutability: 'nonpayable', inputs: [
    { name: 'name_', type: 'string' }, { name: 'collection_', type: 'address' }, { name: 'maxAllowed_', type: 'uint256' }, { name: 'maxPerWallet_', type: 'uint256' },
  ], outputs: [] },
  { type: 'function', name: 'allowCommunityMint', stateMutability: 'nonpayable', inputs: [{ name: 'collectionId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'modifyCollectionMaxAllowed', stateMutability: 'nonpayable', inputs: [{ name: 'collectionId', type: 'uint256' }, { name: 'newAmount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'modifyCollectionMaxPerWallet', stateMutability: 'nonpayable', inputs: [{ name: 'collectionId', type: 'uint256' }, { name: 'newAmount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'changeCommunityMintPrice', stateMutability: 'nonpayable', inputs: [{ name: 'newPrice', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'endPreMintedPhase', stateMutability: 'nonpayable', inputs: [], outputs: [] },

  // Game start + gameplay
  { type: 'function', name: 'ensureStarted', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'feed', stateMutability: 'payable', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'enterFast', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'poison', stateMutability: 'payable', inputs: [{ name: 'attackerId', type: 'uint256' }, { name: 'targetId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'powerFridge', stateMutability: 'payable', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'liveDevour', stateMutability: 'nonpayable', inputs: [{ name: 'eaterId', type: 'uint256' }, { name: 'preyId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'consumeCorpse', stateMutability: 'nonpayable', inputs: [{ name: 'eaterId', type: 'uint256' }, { name: 'corpseId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'reap', stateMutability: 'nonpayable', inputs: [{ name: 'tokenIds', type: 'uint256[]' }], outputs: [] },
  { type: 'function', name: 'voteTruce', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'settleGame', stateMutability: 'nonpayable', inputs: [{ name: 'liveTokenIds', type: 'uint256[]' }], outputs: [] },

  // Canonical reads
  { type: 'function', name: 'getWinningShares', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 's_totalMinted', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 's_aliveCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 's_currentMealSeconds', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 's_gameStart', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 's_initialExpiry', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 'S', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 's_totalNormalFeeds', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 's_completedBars', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'i_startBackstop', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 'isSettled', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'effectiveExpiry', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 'getVisualState', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 's_tokenStates', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [
    { name: 'expiry', type: 'uint64' },
    { name: 'poisonCooldownUntil', type: 'uint64' },
    { name: 'poisonProtectedUntil', type: 'uint64' },
    { name: 'finalBiteDeadline', type: 'uint64' },
    { name: 'deadAt', type: 'uint64' },
    { name: 'spoilCheckpoint', type: 'uint64' },
    { name: 'poweredUntil', type: 'uint64' },
    { name: 'spoilQ4', type: 'uint32' },
    { name: 'fasting', type: 'bool' },
    { name: 'deathSettled', type: 'bool' },
  ] },
] as const;

export const GLUTTON_NFT_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'refreshMetadata', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [] },
] as const;

// Fast client-side discovery of invited NFT ownership.
// The reviewed GameEngine independently re-verifies balanceOf(msg.sender)
// inside preMint(), so this preview is UX only — contract state is authoritative.
export const PARTNER_ERC721_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const PRIZE_VAULT_ABI = [
  { type: 'function', name: 'claimPrize', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'getWethAddress', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'getEthSnapshot', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getWethSnapshot', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getTotalShares', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getTotalClaimedShares', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const ROYALTY_TREASURY_ABI = [
  { type: 'function', name: 'flushWETH', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;

export const PVG_TREASURY_ABI = [
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'getImmutables', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }, { type: 'address' }, { type: 'address' }] },
  { type: 'function', name: 'getEthBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getWethBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getPendingTransactionStatus', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'getTransaction', stateMutability: 'view', inputs: [], outputs: [{ type: 'tuple', components: [
    { name: 'receiver', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'currency', type: 'uint8' }, { name: 'user1Approved', type: 'uint8' }, { name: 'user2Approved', type: 'uint8' },
  ] }] },
  { type: 'function', name: 'setTransactionApproval', stateMutability: 'nonpayable', inputs: [{ name: 'receiver_', type: 'address' }, { name: 'amount_', type: 'uint256' }, { name: 'currency_', type: 'uint8' }], outputs: [] },
  { type: 'function', name: 'approveTransaction', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;
