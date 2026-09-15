import 'dotenv/config';
import { createPublicClient, getAddress, http, isAddress, parseAbi } from 'viem';

const mode=(process.env.NEXT_PUBLIC_CHAIN_MODE||'curtis').toLowerCase();
const expectedChain=mode==='ethereum'?1:33111;
const rpc=process.env.RPC_URL;
if(!rpc)throw new Error('RPC_URL is required for deployment verification. Use a private/server RPC.');
const env={
 gameEngine:process.env.NEXT_PUBLIC_GAME_ENGINE_ADDRESS,
 gluttonNFT:process.env.NEXT_PUBLIC_GLUTTON_NFT_ADDRESS,
 inspector:process.env.NEXT_PUBLIC_INSPECTOR_ADDRESS,
 prizeVault:process.env.NEXT_PUBLIC_PRIZE_VAULT_ADDRESS,
 pvgTreasury:process.env.NEXT_PUBLIC_PVG_TREASURY_ADDRESS,
 royaltyTreasury:process.env.NEXT_PUBLIC_ROYALTY_TREASURY_ADDRESS,
};
for(const[k,v]of Object.entries(env))if(!v||!isAddress(v)||/^0x0{40}$/i.test(v))throw new Error(`${k} address is missing or invalid.`);
const A=Object.fromEntries(Object.entries(env).map(([k,v])=>[k,getAddress(v)]));
const client=createPublicClient({transport:http(rpc,{timeout:15_000,retryCount:0})});
const chainId=await client.getChainId();if(chainId!==expectedChain)throw new Error(`RPC chain mismatch: expected ${expectedChain}, got ${chainId}`);
for(const[k,a]of Object.entries(A)){const code=await client.getCode({address:a});if(!code||code==='0x')throw new Error(`${k} has no contract bytecode at ${a}`);console.log(`PASS bytecode ${k} ${a}`);}

const engineAbi=parseAbi(['function MAX_SUPPLY() view returns (uint256)','function GAME_HOUR() view returns (uint64)','function s_gameStart() view returns (uint64)','function S() view returns (uint256)','function s_totalMinted() view returns (uint256)','function s_gluttonNFT() view returns (address)','function s_prizeVault() view returns (address)','function s_pvgTreasury() view returns (address)']);
const nftAbi=parseAbi(['function gameEngine() view returns (address)','function royaltyTreasury() view returns (address)','function ownerOf(uint256) view returns (address)']);
const vaultAbi=parseAbi(['function getGameEngineAddress() view returns (address)']);
const inspectorAbi=parseAbi(['function getGlobalView() view returns ((uint256 aliveCount,uint256 currentMealSeconds,bool isSettled,string currentPhase))','function getTokenView(uint256) view returns ((address owner,uint8 visualState,uint64 expiry,bool isHungry))']);
const calls=[
 {address:A.gameEngine,abi:engineAbi,functionName:'MAX_SUPPLY'},
 {address:A.gameEngine,abi:engineAbi,functionName:'GAME_HOUR'},
 {address:A.gameEngine,abi:engineAbi,functionName:'s_gameStart'},
 {address:A.gameEngine,abi:engineAbi,functionName:'S'},
 {address:A.gameEngine,abi:engineAbi,functionName:'s_totalMinted'},
 {address:A.gameEngine,abi:engineAbi,functionName:'s_gluttonNFT'},
 {address:A.gameEngine,abi:engineAbi,functionName:'s_prizeVault'},
 {address:A.gameEngine,abi:engineAbi,functionName:'s_pvgTreasury'},
 {address:A.gluttonNFT,abi:nftAbi,functionName:'gameEngine'},
 {address:A.gluttonNFT,abi:nftAbi,functionName:'royaltyTreasury'},
 {address:A.prizeVault,abi:vaultAbi,functionName:'getGameEngineAddress'},
 {address:A.inspector,abi:inspectorAbi,functionName:'getGlobalView'},
];
const rows=await client.multicall({allowFailure:false,deployless:true,batchSize:0,contracts:calls});
const eq=(a,b,label)=>{if(String(a).toLowerCase()!==String(b).toLowerCase())throw new Error(`${label} mismatch: ${a} != ${b}`);console.log(`PASS ${label}`)};
eq(rows[5],A.gluttonNFT,'GameEngine → GluttonNFT');eq(rows[6],A.prizeVault,'GameEngine → PrizeVault');eq(rows[7],A.pvgTreasury,'GameEngine → PVGTreasury');eq(rows[8],A.gameEngine,'GluttonNFT → GameEngine');eq(rows[9],A.royaltyTreasury,'GluttonNFT → RoyaltyTreasury');eq(rows[10],A.gameEngine,'PrizeVault → GameEngine');
console.log(`PASS Inspector getGlobalView() callable: phase=${rows[11]?.[3]??'unknown'}`);
const totalMinted=BigInt(rows[4]);
if(totalMinted>0n){
 const [owner,view]=await Promise.all([
  client.readContract({address:A.gluttonNFT,abi:nftAbi,functionName:'ownerOf',args:[1n]}),
  client.readContract({address:A.inspector,abi:inspectorAbi,functionName:'getTokenView',args:[1n]}),
 ]);
 eq(view[0],owner,'Inspector token #1 owner → GluttonNFT');
}
console.log(`PASS chain=${chainId} maxSupply=${rows[0]} gameHour=${rows[1]} gameStart=${rows[2]} S=${rows[3]} minted=${rows[4]}`);

const base=(process.env.READ_BASE_URL||'').replace(/\/$/,'');
if(base){
 const r=await fetch(`${base}/api/read/health`,{headers:{accept:'application/json'}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Read service health failed: HTTP ${r.status}`);
 if(Number(j.chainId)!==expectedChain)throw new Error(`Read service chain mismatch: ${j.chainId}`);
 if(String(j.deployment||'').toLowerCase()!==A.gameEngine.toLowerCase())throw new Error('Read service GameEngine deployment mismatch.');
 console.log(`PASS read service health ${base}`);
}
console.log('\nDEPLOYMENT VERIFICATION PASS');
