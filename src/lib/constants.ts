import { defineChain, type Address } from 'viem';
import { 
  contracts, futureRewardsVaultABI, PVGTreasuryABI, PrizeVaultABI, GameEngineABI, 
  RoyaltyTreasuryABI, NftABI, InspectorABI
} from './contracts_abi';

// ─────────────────────────────────────────────────────────────
// ONE FILE TO REPLACE AFTER DEPLOYMENT
// Addresses can come from .env; ABIs live here intentionally.
// ─────────────────────────────────────────────────────────────
export const curtis = defineChain({
  id: 33111,
  name: 'ApeChain Curtis',
  nativeCurrency: { name: 'ApeCoin', symbol: 'APE', decimals: 18 },
  rpcUrls: { default: { http: ['https://curtis.rpc.caldera.xyz/http'] } },
  blockExplorers: { default: { name: 'Curtis ApeScan', url: 'https://curtis.apescan.io' } },
  testnet: true,
});
const Z = '0x0000000000000000000000000000000000000000' as Address;
const addr=(v?:string)=>((v && /^0x[a-fA-F0-9]{40}$/.test(v)) ? v : Z) as Address;
export const CONTRACTS = {
  gluttonNFT: addr(contracts.nft),
  gameEngine: addr(contracts.gameEngine),
  inspector: addr(contracts.inspector),
  prizeVault: addr(contracts.prizeVault),
  pvgTreasury: addr(contracts.pvgTreasury),
  royaltyTreasury: addr(contracts.royaltyTreasury),
  communityController: addr(process.env.NEXT_PUBLIC_COMMUNITY_MINT_CONTROLLER_ADDRESS),
} as const;
export const MINT_PRICE = 4_000_000_000_000_000n;
export const FEED_PRICE = 600_000_000_000_000n;
export const POISON_PRICE = 400_000_000_000_000n;
export const POWER_PRICE = 300_000_000_000_000n;
export const MAX_SUPPLY = 2000;
export const OPENSEA_URL = process.env.NEXT_PUBLIC_OPENSEA_COLLECTION_URL || 'https://opensea.io';

export const INSPECTOR_ABI = InspectorABI;
export const GAME_ENGINE_ABI = GameEngineABI;
export const GLUTTON_NFT_ABI = NftABI;
export const PRIZE_VAULT_ABI = PrizeVaultABI;
export const ROYALTY_TREASURY_ABI = RoyaltyTreasuryABI;
export const PVG_TREASURY_ABI = PVGTreasuryABI;
export const COMMUNITY_CONTROLLER_ABI = [
 {type:'function',name:'COMMUNITY_MANAGER_ROLE',stateMutability:'view',inputs:[],outputs:[{type:'bytes32'}]},
 {type:'function',name:'PAUSER_ROLE',stateMutability:'view',inputs:[],outputs:[{type:'bytes32'}]},
 {type:'function',name:'hasRole',stateMutability:'view',inputs:[{name:'role',type:'bytes32'},{name:'account',type:'address'}],outputs:[{type:'bool'}]},
 {type:'function',name:'totalReservedRemaining',stateMutability:'view',inputs:[],outputs:[{type:'uint256'}]},
 {type:'function',name:'communityCount',stateMutability:'view',inputs:[],outputs:[{type:'uint256'}]},
 {type:'function',name:'communities',stateMutability:'view',inputs:[{name:'id',type:'uint256'}],outputs:[{name:'collection',type:'address'},{name:'walletRoot',type:'bytes32'},{name:'allocation',type:'uint32'},{name:'minted',type:'uint32'},{name:'mode',type:'uint8'},{name:'active',type:'bool'}]},
 {type:'function',name:'createCommunity',stateMutability:'nonpayable',inputs:[{name:'mode',type:'uint8'},{name:'collection',type:'address'},{name:'walletRoot',type:'bytes32'},{name:'allocation',type:'uint32'}],outputs:[]},
 {type:'function',name:'setAllocation',stateMutability:'nonpayable',inputs:[{name:'id',type:'uint256'},{name:'newAllocation',type:'uint32'}],outputs:[]},
 {type:'function',name:'setEligibility',stateMutability:'nonpayable',inputs:[{name:'id',type:'uint256'},{name:'mode',type:'uint8'},{name:'collection',type:'address'},{name:'walletRoot',type:'bytes32'}],outputs:[]},
 {type:'function',name:'setCommunityActive',stateMutability:'nonpayable',inputs:[{name:'id',type:'uint256'},{name:'active',type:'bool'}],outputs:[]},
 {type:'function',name:'setCommunityMintsPaused',stateMutability:'nonpayable',inputs:[{name:'paused',type:'bool'}],outputs:[]},
 {type:'function',name:'communityMintByToken',stateMutability:'payable',inputs:[{name:'id',type:'uint256'},{name:'tokenIds',type:'uint256[]'}],outputs:[]},
 {type:'function',name:'communityMintByProof',stateMutability:'payable',inputs:[{name:'id',type:'uint256'},{name:'proof',type:'bytes32[]'}],outputs:[]},
 {type:'function',name:'closeCommunityPhase',stateMutability:'nonpayable',inputs:[],outputs:[]}
] as const;
