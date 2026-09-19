import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // dev; container env already set in production
import { createPublicClient, decodeEventLog, decodeFunctionData, fallback, getAddress, http, parseAbiItem, type Address } from 'viem';
import { Redis } from '@upstash/redis';
import { ACTIVE_CHAIN, CONTRACTS, GAME_ENGINE_ABI, GLUTTON_NFT_ABI, INSPECTOR_ABI, PRIZE_VAULT_ABI, ERC20_ABI, ZERO_ADDRESS } from '../src/lib/constants';
import { deriveStatus, type ProtocolSnapshot, type TokenSnapshot } from '../src/lib/read-model';

const rpcUrls=[process.env.RPC_URL,process.env.RPC_FALLBACK_URL].filter(Boolean) as string[];
if(!rpcUrls.length)throw new Error('RPC_URL is required. Keep private RPC credentials server-side.');
if(CONTRACTS.gameEngine===ZERO_ADDRESS||CONTRACTS.gluttonNFT===ZERO_ADDRESS||CONTRACTS.inspector===ZERO_ADDRESS||CONTRACTS.prizeVault===ZERO_ADDRESS)throw new Error('Deployment addresses are missing.');
if(!process.env.UPSTASH_REDIS_REST_URL||!process.env.UPSTASH_REDIS_REST_TOKEN)throw new Error('Upstash Redis env is required.');
const redis=new Redis({url:process.env.UPSTASH_REDIS_REST_URL!,token:process.env.UPSTASH_REDIS_REST_TOKEN!});
const transports=rpcUrls.map(u=>http(u,{timeout:15_000,retryCount:0}));
const client=createPublicClient({chain:ACTIVE_CHAIN,transport:transports.length>1?fallback(transports,{rank:false}):transports[0]});
const NS=`gluttons:${ACTIVE_CHAIN.id}:${CONTRACTS.gameEngine.toLowerCase()}`;
const K={protocol:`${NS}:protocol`,tokens:`${NS}:tokens`,wallet:(a:string)=>`${NS}:wallet:${a.toLowerCase()}`,lastBlock:`${NS}:lastBlock`,lastHash:`${NS}:lastHash`,initialized:`${NS}:initialized`,communities:`${NS}:communities`,stadium:`${NS}:stadium`,endgame:`${NS}:endgame`,settlementBase:`${NS}:settlement:base`,winnerShares:`${NS}:settlement:winners`,claimedShares:`${NS}:settlement:claimed`,tokenStateBlock:`${NS}:tokenStateBlock`,communityVersion:`${NS}:communityVersion`,touchQueue:`${NS}:touchQueue`,poisons:`${NS}:lb:poisons`,feeds:`${NS}:lb:feeds`,countersReady:`${NS}:lb:counters-ready`,wdigest:(a:string)=>`${NS}:wdigest:${a.toLowerCase()}`,stadiumRows:`${NS}:stadium:rows`,stadiumMeta:`${NS}:stadium:meta`,lock:`${NS}:indexer-lock`};
const TRANSFER=parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');
const PRIZE_RELEASED=parseAbiItem('event PrizeReleased(address indexed winner, uint256 ethAmount, uint256 wethAmount, uint256 sharesClaimed)');
const GAME_EVENTS=[
 parseAbiItem('event Minted(address indexed to, uint256 startTokenId, uint256 quantity)'),
 parseAbiItem('event DeathMaterialized(uint256 indexed tokenId, uint64 deadAt)'),
 parseAbiItem('event Poisoned(uint256 indexed attackerId, uint256 indexed targetId, uint64 attackerExpiryAfter, uint64 targetExpiryAfter, uint64 protectionUntil)'),
 parseAbiItem('event FinalBiteTriggered(uint256 indexed attackerId, uint256 indexed targetId, uint64 deadline)'),
 parseAbiItem('event CorpsePowered(uint256 indexed tokenId, uint64 poweredUntil)'),
 parseAbiItem('event CorpseConsumed(uint256 indexed eaterId, uint256 indexed corpseId, bool rotten)'),
 parseAbiItem('event LiveDevoured(uint256 indexed eaterId, uint256 indexed preyId)'),
 parseAbiItem('event Fed(uint256 indexed tokenId, address indexed feeder, uint64 newExpiry)'),
 parseAbiItem('event FastEntered(uint256 indexed tokenId, address indexed faster)'),
 parseAbiItem('event TruceVoted(uint256 indexed tokenId, address indexed voter, uint256 epoch)'),
 parseAbiItem('event GameSettled(address indexed winner, uint256 winnerTokenId)'),
] as const;
const BATCH=Math.max(10,Math.min(100,Number(process.env.INDEXER_BATCH_SIZE||50)));
const LOOP=Math.max(15_000,Number(process.env.INDEXER_INTERVAL_MS||30_000)); // floor protects the Redis quota
const RECONCILE=Math.max(60_000,Number(process.env.INDEXER_RECONCILE_MS||(ACTIVE_CHAIN.id===1?900_000:300_000)));
const TOUCH=Math.max(2_000,Number(process.env.INDEXER_TOUCH_INTERVAL_MS||4_000));
const MAX_CATCHUP_BLOCKS=Math.max(50,Number(process.env.INDEXER_MAX_CATCHUP_BLOCKS||300));
const CONFIRMATIONS=Math.max(0,Number(process.env.INDEXER_CONFIRMATIONS??(ACTIVE_CHAIN.id===1?2:0)));
const DEPLOYMENT_BLOCK=BigInt(process.env.DEPLOYMENT_BLOCK||'0');
const LOG_CHUNK_BLOCKS=BigInt(Math.max(1_000,Number(process.env.INDEXER_LOG_CHUNK_BLOCKS||50_000)));
if(ACTIVE_CHAIN.id===1&&DEPLOYMENT_BLOCK===0n)throw new Error('DEPLOYMENT_BLOCK is required on Ethereum mainnet for deterministic recovery and claim-history reconstruction.');
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const result=(r:any)=>r?.status==='success'?r.result:undefined;
const tuple=(v:any)=>Array.isArray(v)?v:(v?Object.values(v):[]);
let rateStrikes=0,rateBlockedUntil=0;

function isRetryable(e:unknown){const s=String((e as any)?.shortMessage||'')+' '+String((e as any)?.message||'')+' '+String((e as any)?.name||'');return /\b429\b|too many requests|rate.?limit|timeout|timed out|502|503|504|network|fetch failed|socket/i.test(s);}
function is429(e:unknown){const s=String((e as any)?.shortMessage||'')+' '+String((e as any)?.message||'');return /\b429\b|too many requests|rate.?limit/i.test(s);}
async function rpc<T>(label:string,fn:()=>Promise<T>,attempts=5):Promise<T>{let last:unknown;for(let i=0;i<attempts;i++){const wait=Math.max(0,rateBlockedUntil-Date.now());if(wait)await sleep(wait+Math.floor(Math.random()*350));try{const v=await fn();rateStrikes=Math.max(0,rateStrikes-1);return v;}catch(e){last=e;if(is429(e)){rateStrikes=Math.min(7,rateStrikes+1);rateBlockedUntil=Date.now()+Math.min(60_000,1500*2**rateStrikes)+Math.floor(Math.random()*750);}if(!isRetryable(e)||i===attempts-1)throw e;await sleep(500*2**i+Math.floor(Math.random()*350));}}throw last instanceof Error?last:new Error(`${label} failed`);}
async function multi(contracts:any[],blockNumber:bigint,allowFailure=true){return rpc('multicall',()=>client.multicall({allowFailure,deployless:false,batchSize:0,blockNumber,contracts:contracts as any}));}
function phaseName(c:number){return['PRE_GAME','FEAST','PLAGUE','LS_WARNING','LAST_SUPPER','SETTLED'][c]||'UNKNOWN';}
function supplyOf(p:ProtocolSnapshot){return Number(BigInt(p.startingPopulation||'0')||BigInt(p.totalMinted||'0'));}

let wethAddressCache:Address|undefined;
async function protocol(blockNumber:bigint):Promise<ProtocolSnapshot>{
 const names=['s_gameStart','currentPhaseCode','s_aliveCount','s_currentMealSeconds','isSettled','s_totalMinted','MAX_SUPPLY','S','s_totalNormalFeeds','s_completedBars','i_startBackstop','s_preMintEnd','s_communityMintprice','GAME_HOUR','lastSupperWarningAt','lastSupperAt','lastSupperPopulationThreshold','trucePopulationThreshold','s_truceEpoch','s_tiebreakCandidate','ROTTEN_THRESHOLD'] as const;
 const rows=await multi(names.map(functionName=>({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName})),blockNumber,true);
 if(rows.some((r:any)=>r.status!=='success'))throw new Error('GLOBAL_SNAPSHOT_INCOMPLETE');
 const v=(i:number)=>(rows[i] as any).result;const phase=Number(v(1));
 const potNative=await rpc('prize balance',()=>client.getBalance({address:CONTRACTS.prizeVault,blockNumber}));
 if(!wethAddressCache)wethAddressCache=getAddress(String(await rpc('weth address',()=>client.readContract({address:CONTRACTS.prizeVault,abi:PRIZE_VAULT_ABI,functionName:'getWethAddress',blockNumber})))) as Address;
 const potWeth=await rpc('weth balance',()=>client.readContract({address:wethAddressCache!,abi:ERC20_ABI,functionName:'balanceOf',args:[CONTRACTS.prizeVault],blockNumber}));
 const tokenStateBlock=Number((await redis.get<string>(K.tokenStateBlock))||'0');
 return{chainId:ACTIVE_CHAIN.id,deployment:CONTRACTS.gameEngine,blockNumber:Number(blockNumber),indexedAt:Date.now(),tokenStateBlock,gameStart:String(v(0)),phaseCode:phase,currentPhase:phaseName(phase),aliveCount:String(v(2)),currentMealSeconds:String(v(3)),isSettled:Boolean(v(4)),totalMinted:String(v(5)),maxSupply:String(v(6)),startingPopulation:String(v(7)),totalNormalFeeds:String(v(8)),completedBars:String(v(9)),startBackstop:String(v(10)),preMintEnd:Boolean(v(11)),communityMintPrice:String(v(12)),gameHourSeconds:String(v(13)),lastSupperWarningAt:String(v(14)),lastSupperAt:String(v(15)),lastSupperThreshold:String(v(16)),truceThreshold:String(v(17)),truceEpoch:String(v(18)),tiebreakCandidate:String(v(19)),rottenThreshold:String(v(20)),potNative:String(potNative),potWeth:String(potWeth),wethAddress:String(wethAddressCache)};
}

function sameCore(a:TokenSnapshot|undefined,b:TokenSnapshot){if(!a)return false;return a.owner?.toLowerCase()===b.owner?.toLowerCase()&&a.burned===b.burned&&a.visualState===b.visualState&&a.expiry===b.expiry&&a.poisonProtectedUntil===b.poisonProtectedUntil&&a.finalBiteDeadline===b.finalBiteDeadline&&a.deadAt===b.deadAt&&a.spoilCheckpoint===b.spoilCheckpoint&&a.poweredUntil===b.poweredUntil&&a.spoilQ4===b.spoilQ4&&a.fasting===b.fasting&&a.deathSettled===b.deathSettled&&a.voteEpoch===b.voteEpoch&&a.voteOwner?.toLowerCase()===b.voteOwner?.toLowerCase();}
async function hydrate(ids:number[],blockNumber:number){
 const unique=[...new Set(ids.filter(x=>Number.isSafeInteger(x)&&x>0))];const changed=new Set<number>();
 for(let o=0;o<unique.length;o+=BATCH){
  const part=unique.slice(o,o+BATCH),bn=BigInt(blockNumber);
  const stateCalls=part.flatMap(id=>[
   {address:CONTRACTS.inspector,abi:INSPECTOR_ABI,functionName:'getTokenView',args:[BigInt(id)]},
   {address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_tokenStates',args:[BigInt(id)]},
   {address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_truceVotes',args:[BigInt(id)]},
  ]);
  const [rows,oldRows]=await Promise.all([multi(stateCalls,bn,true),(async()=>{const q=redis.pipeline();part.forEach(id=>q.hget(K.tokens,String(id)));return q.exec<TokenSnapshot[]>();})()]);
 const candidates=new Map<number,TokenSnapshot>();const maybeBurned:number[]=[];
  for(let i=0;i<part.length;i++){
   const id=part[i],old=oldRows[i]||undefined;const view:any=result(rows[i*3]),stRaw=result(rows[i*3+1]),voteRaw=result(rows[i*3+2]);const st=tuple(stRaw),vote=tuple(voteRaw);
   if(view&&stRaw!==undefined&&voteRaw!==undefined){candidates.set(id,{id,owner:getAddress(String(view.owner??view[0])) as Address,burned:false,visualState:Number(view.visualState??view[1]??1),expiry:Number(view.expiry??view[2]??0),poisonProtectedUntil:Number(st[1]||0),finalBiteDeadline:Number(st[2]||0),deadAt:Number(st[3]||0),spoilCheckpoint:Number(st[4]||0),poweredUntil:Number(st[5]||0),spoilQ4:Number(st[6]||0),fasting:Boolean(st[7]),deathSettled:Boolean(st[8]),voteEpoch:String(vote[0]||0),voteOwner:String(vote[1]||ZERO_ADDRESS) as Address,updatedBlock:old?.updatedBlock||blockNumber,tokenUri:old?.tokenUri});}
   else if(!view&&stRaw!==undefined&&voteRaw!==undefined)maybeBurned.push(id);
  }
  if(maybeBurned.length){const ownerRows=await multi(maybeBurned.map(id=>({address:CONTRACTS.gluttonNFT,abi:GLUTTON_NFT_ABI,functionName:'ownerOf',args:[BigInt(id)]})),bn,true);for(let i=0;i<maybeBurned.length;i++){const id=maybeBurned[i],idx=part.indexOf(id),old=oldRows[idx]||undefined;if((ownerRows[i] as any)?.status==='failure'){candidates.set(id,{id,burned:true,visualState:-1,expiry:old?.expiry||0,poisonProtectedUntil:0,finalBiteDeadline:0,deadAt:old?.deadAt||0,spoilCheckpoint:old?.spoilCheckpoint||0,poweredUntil:0,spoilQ4:old?.spoilQ4||0,fasting:false,deathSettled:true,voteEpoch:'0',updatedBlock:old?.updatedBlock||blockNumber,tokenUri:undefined});}}
  }
 const needUri:number[]=[];for(const [id,t] of candidates){if(t.burned)continue;const old=oldRows[part.indexOf(id)]||undefined;if(!old?.tokenUri||old.visualState!==t.visualState)needUri.push(id);}
  if(needUri.length){const uriRows=await multi(needUri.map(id=>({address:CONTRACTS.gluttonNFT,abi:GLUTTON_NFT_ABI,functionName:'tokenURI',args:[BigInt(id)]})),bn,true);for(let i=0;i<needUri.length;i++){const u=result(uriRows[i]);if(u!==undefined)candidates.get(needUri[i])!.tokenUri=String(u);}}
  const writes=redis.pipeline();let writesCount=0;
  for(const [id,next0] of candidates){const old=oldRows[part.indexOf(id)]||undefined;const coreChanged=!sameCore(old,next0);const uriChanged=(old?.tokenUri||'')!==(next0.tokenUri||'');if(!coreChanged&&!uriChanged)continue;const next={...next0,updatedBlock:coreChanged?blockNumber:(old?.updatedBlock||blockNumber)};writes.hset(K.tokens,{[String(id)]:next});writes.hset(K.stadiumRows,{[String(id)]:JSON.stringify(compactRow(next))});writesCount++;changed.add(id);if(next.owner&&!next.burned)dirtyOwners.add(String(next.owner).toLowerCase());if(old?.owner&&old.owner.toLowerCase()!==next.owner?.toLowerCase())writes.srem(K.wallet(old.owner),String(id));if(next.owner&&!next.burned)writes.sadd(K.wallet(next.owner),String(id));}
  if(writesCount)await writes.exec();await sleep(30+Math.floor(Math.random()*40));
 }
 await flushWalletDigests();if(changed.size)await redis.set(K.tokenStateBlock,String(blockNumber));return[...changed];
}

const ROW_UNKNOWN=[-1,0,0,0,0,0,0,0,0,0,0];
function compactRow(t:TokenSnapshot){return[t.burned?1:0,t.expiry,t.poisonProtectedUntil,t.finalBiteDeadline,t.deadAt,t.spoilCheckpoint,t.poweredUntil,t.spoilQ4,t.fasting?1:0,t.deathSettled?1:0,t.updatedBlock];}
const dirtyOwners=new Set<string>();
async function flushWalletDigests(){if(!dirtyOwners.size)return;const owners=[...dirtyOwners];dirtyOwners.clear();for(const owner of owners){try{const ids=await redis.smembers(K.wallet(owner));if(!ids.length){await redis.del(K.wdigest(owner));continue;}const pipe=redis.pipeline();ids.forEach(id=>pipe.hget(K.tokens,String(id)));const rows=(await pipe.exec<TokenSnapshot[]>()).filter((t):t is TokenSnapshot=>Boolean(t&&t.owner&&!t.burned&&String(t.owner).toLowerCase()===owner));await redis.set(K.wdigest(owner),rows.sort((a,b)=>a.id-b.id));}catch(e){console.warn(`[digest] ${owner}:`,String((e as any)?.message||e));}}}
async function allTokens(){return(await redis.hgetall<Record<string,TokenSnapshot>>(K.tokens))||{};}
async function pruneAboveSupply(supply:number){
 const all=await allTokens();const ids=Object.keys(all).map(Number).filter(id=>Number.isSafeInteger(id)&&id>supply);if(!ids.length)return false;
 const pipe=redis.pipeline();for(const id of ids){const t=all[String(id)];pipe.hdel(K.tokens,String(id));if(t?.owner)pipe.srem(K.wallet(t.owner),String(id));}await pipe.exec();console.warn(`[reorg] pruned ${ids.length} token row(s) above canonical supply ${supply}`);return true;
}
function addEventImpacts(log:any,impacted:Set<number>){
 try{const d:any=decodeEventLog({abi:GAME_EVENTS as any,data:log.data,topics:log.topics,strict:false});const a=d.args||{};switch(d.eventName){
  case'Minted':{const start=Number(a.startTokenId||0),qty=Number(a.quantity||0);for(let id=start;id<start+qty;id++)if(id>0)impacted.add(id);break;}
  case'DeathMaterialized':case'CorpsePowered':if(Number(a.tokenId)>0)impacted.add(Number(a.tokenId));break;
  case'Poisoned':case'FinalBiteTriggered':if(Number(a.attackerId)>0)impacted.add(Number(a.attackerId));if(Number(a.targetId)>0)impacted.add(Number(a.targetId));break;
  case'CorpseConsumed':if(Number(a.eaterId)>0)impacted.add(Number(a.eaterId));if(Number(a.corpseId)>0)impacted.add(Number(a.corpseId));break;
  case'LiveDevoured':if(Number(a.eaterId)>0)impacted.add(Number(a.eaterId));if(Number(a.preyId)>0)impacted.add(Number(a.preyId));break;
  case'Fed':case'FastEntered':case'TruceVoted':if(Number(a.tokenId)>0)impacted.add(Number(a.tokenId));break;
  case'GameSettled':if(Number(a.winnerTokenId)>0)impacted.add(Number(a.winnerTokenId));break;
 }}catch{}
}
async function publishDerivedViews(blockNumber:number,p:ProtocolSnapshot){
 const all=await allTokens();const supply=supplyOf(p);const rows:number[][]=[];for(let id=1;id<=supply;id++){const t=all[String(id)];if(!t){rows.push([-1,0,0,0,0,0,0,0,0,0,0]);continue;}rows.push([t.burned?1:0,t.expiry,t.poisonProtectedUntil,t.finalBiteDeadline,t.deadAt,t.spoilCheckpoint,t.poweredUntil,t.spoilQ4,t.fasting?1:0,t.deathSettled?1:0,t.updatedBlock]);}
 const now=Math.floor(Date.now()/1000);const endgameActive=p.isSettled||Number(p.aliveCount)<=1||(p.currentPhase==='LAST_SUPPER'&&Number(p.aliveCount)<=Number(p.truceThreshold));let live:any[]=[];
 if(endgameActive){const tieId=Number(p.tiebreakCandidate||'0');live=Object.values(all).filter(t=>!t.burned&&(p.isSettled?(!t.deathSettled||t.id===tieId):['ALIVE','HUNGRY','FASTING','FINAL_BITE'].includes(deriveStatus(t,p,now)))).map(t=>{const status=deriveStatus(t,p,now);const voteValid=BigInt(t.voteEpoch||'0')===BigInt(p.truceEpoch||'0')&&!!t.owner&&!!t.voteOwner&&t.owner.toLowerCase()===t.voteOwner.toLowerCase();return{...t,status,voteValid};}).sort((a,b)=>a.id-b.id);}
 const rowObj:Record<string,string>={};rows.forEach((r,i)=>{rowObj[String(i+1)]=JSON.stringify(r);});const pipe=redis.pipeline();pipe.hset(K.stadiumRows,rowObj);pipe.set(K.stadiumMeta,{blockNumber,supply:rows.length});pipe.set(K.stadium,{blockNumber,rows});pipe.set(K.endgame,{blockNumber,active:endgameActive,live,voted:live.filter(t=>t.voteValid).length});await pipe.exec();
}

function idsFromGameTx(input:`0x${string}`):number[]{try{const d=decodeFunctionData({abi:GAME_ENGINE_ABI,data:input});const a=(d.args||[])as unknown as any[];switch(d.functionName){case'feed':case'enterFast':case'powerFridge':case'voteTruce':return[Number(a[0])];case'poison':case'liveDevour':case'consumeCorpse':return[Number(a[0]),Number(a[1])];case'reap':case'settleGame':return(a[0]||[]).map((x:any)=>Number(x));default:return[]}}catch{return[]}}
async function refreshCommunities(){try{const raw:any=await rpc('communities',()=>client.readContract({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'getInvitedNftCommunities'}));const rows=(raw||[]).map((c:any,id:number)=>({id,name:String(c.name??c[0]??`COMMUNITY #${id}`),collectionAddress:String(c.collectionAddress??c[1]),maxTotalAmountAllowed:Number(c.maxTotalAmountAllowed??c[2]??0),maxPerWallet:Number(c.maxPerWallet??c[3]??0),allowed:Boolean(c.allowed??c[4]),amountMinted:Number(c.amountMinted??c[5]??0)}));const prev=await redis.get<any[]>(K.communities);if(JSON.stringify(prev||[])!==JSON.stringify(rows)){const pipe=redis.pipeline();pipe.set(K.communities,rows);pipe.incr(K.communityVersion);await pipe.exec();}}catch(e){console.warn('[communities] retaining last confirmed list:',String((e as any)?.message||e));}}
let lastCommunities=0,lastReconcile=0;

async function claimSums(from:bigint,to:bigint){
 const sums=new Map<string,bigint>();
 if(from>to)return sums;
 for(let cursor=from;cursor<=to;cursor+=LOG_CHUNK_BLOCKS){
  const end=cursor+LOG_CHUNK_BLOCKS-1n>to?to:cursor+LOG_CHUNK_BLOCKS-1n;
  const logs=await rpc('prize release logs',()=>client.getLogs({address:CONTRACTS.prizeVault,event:PRIZE_RELEASED,fromBlock:cursor,toBlock:end}));
  for(const l of logs){const a=String(l.args.winner||'').toLowerCase();if(!a)continue;sums.set(a,(sums.get(a)||0n)+BigInt(l.args.sharesClaimed||0));}
  if(end<to)await sleep(25+Math.floor(Math.random()*35));
 }
 return sums;
}
async function applyClaimLogs(from:bigint,to:bigint){
 const sums=await claimSums(from,to);if(!sums.size)return false;
 for(const[a,delta]of sums){const prev=BigInt((await redis.hget<string>(K.claimedShares,a))||'0');await redis.hset(K.claimedShares,{[a]:String(prev+delta)});}return true;
}
async function rebuildClaimLogs(from:bigint,to:bigint){
 const sums=await claimSums(from,to);const exact:Record<string,string>={};for(const[a,n]of sums)exact[a]=String(n);
 const pipe=redis.pipeline();pipe.del(K.claimedShares);if(Object.keys(exact).length)pipe.hset(K.claimedShares,exact);await pipe.exec();return sums.size>0;
}
function tallyCounters(logs:any[]){const feeds=new Map<string,number>();const poisonTxs:string[]=[];for(const l of logs){try{const d:any=decodeEventLog({abi:GAME_EVENTS as any,data:l.data,topics:l.topics,strict:false});if(d.eventName==='Fed'){const w=String(d.args?.feeder||'').toLowerCase();if(w)feeds.set(w,(feeds.get(w)||0)+1);}else if(d.eventName==='Poisoned'){if(l.transactionHash)poisonTxs.push(String(l.transactionHash));}}catch{}}return{feeds,poisonTxs};}
async function poisonSenders(hashes:string[]){const out=new Map<string,number>();for(let i=0;i<hashes.length;i+=25){const part=hashes.slice(i,i+25);const txs=await Promise.all(part.map(h=>rpc('poison tx',()=>client.getTransaction({hash:h as `0x${string}`})).catch(()=>null)));for(const tx of txs){if(tx?.from){const w=tx.from.toLowerCase();out.set(w,(out.get(w)||0)+1);}}}return out;}
async function rebuildCounters(from:bigint,to:bigint){if(from>to)return;const feeds=new Map<string,number>();const poisonTxs:string[]=[];for(let cursor=from;cursor<=to;cursor+=LOG_CHUNK_BLOCKS){const end=cursor+LOG_CHUNK_BLOCKS-1n>to?to:cursor+LOG_CHUNK_BLOCKS-1n;const logs=await rpc('counter logs',()=>client.getLogs({address:CONTRACTS.gameEngine,fromBlock:cursor,toBlock:end}));const t=tallyCounters(logs as any[]);for(const [w,n] of t.feeds)feeds.set(w,(feeds.get(w)||0)+n);poisonTxs.push(...t.poisonTxs);if(end<to)await sleep(25+Math.floor(Math.random()*35));}const poisons=await poisonSenders(poisonTxs);const pipe=redis.pipeline();pipe.del(K.feeds);pipe.del(K.poisons);if(feeds.size)pipe.hset(K.feeds,Object.fromEntries([...feeds].map(([w,n])=>[w,String(n)])));if(poisons.size)pipe.hset(K.poisons,Object.fromEntries([...poisons].map(([w,n])=>[w,String(n)])));pipe.set(K.countersReady,'1');await pipe.exec();console.log(`[counters] feeds:${feeds.size} wallets · poisons:${poisons.size} wallets`);}
async function refreshSettlement(p:ProtocolSnapshot,bn:bigint){if(!p.isSettled)return;const prizeCalls=['getTotalShares','getEthSnapshot','getWethSnapshot','getTotalClaimedShares'].map(functionName=>({address:CONTRACTS.prizeVault,abi:PRIZE_VAULT_ABI,functionName}));const rows=await multi(prizeCalls,bn,true);if(rows.some((r:any)=>r.status!=='success'))throw new Error('SETTLEMENT_SNAPSHOT_INCOMPLETE');const totalShares=BigInt(String((rows[0]as any).result));const all=await allTokens();const candidates=new Set<string>();const tie=Number(p.tiebreakCandidate||'0');if(tie>0&&all[String(tie)]?.owner)candidates.add(all[String(tie)].owner!.toLowerCase());for(const t of Object.values(all))if(!t.burned&&!t.deathSettled&&t.owner)candidates.add(t.owner.toLowerCase());if(totalShares>0n&&!candidates.size)throw new Error('SETTLEMENT_WINNER_SET_UNRESOLVED');const addrs=[...candidates] as Address[];const shareRows=addrs.length?await multi(addrs.map(a=>({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'getWinningShares',args:[a]})),bn,true):[];if(shareRows.some((r:any)=>r.status!=='success'))throw new Error('WINNER_SHARES_INCOMPLETE');const winners:Record<string,string>={};addrs.forEach((a,i)=>{const n=BigInt(String((shareRows[i]as any).result));if(n>0n)winners[a]=String(n);});const knownClaims=(await redis.hgetall<Record<string,string>>(K.claimedShares))||{};const knownTotal=Object.values(knownClaims).reduce((a,v)=>a+BigInt(String(v||'0')),0n);const chainClaimed=BigInt(String((rows[3]as any).result));const base={blockNumber:Number(bn),totalShares:String(totalShares),ethSnapshot:String((rows[1]as any).result),wethSnapshot:String((rows[2]as any).result),totalClaimedShares:String(chainClaimed),tiebreakCandidate:p.tiebreakCandidate,indexedAt:Date.now(),claimsComplete:knownTotal===chainClaimed};const pipe=redis.pipeline();pipe.del(K.winnerShares);if(Object.keys(winners).length)pipe.hset(K.winnerShares,winners);pipe.set(K.settlementBase,base);await pipe.exec();}

async function checkpoint(bn:bigint){const b=await rpc('checkpoint block',()=>client.getBlock({blockNumber:bn}));const pipe=redis.pipeline();pipe.set(K.lastBlock,String(bn));pipe.set(K.lastHash,String(b.hash));pipe.set(K.initialized,'1');await pipe.exec();}
async function commitCurrent(bn:bigint,p:ProtocolSnapshot,changed:boolean){p.tokenStateBlock=Number((await redis.get<string>(K.tokenStateBlock))||p.tokenStateBlock||0);if(changed)await publishDerivedViews(Number(bn),p);if(p.isSettled)await refreshSettlement(p,bn);await redis.set(K.protocol,p);await checkpoint(bn);}
async function bootstrap(p:ProtocolSnapshot,bn:bigint){const supply=supplyOf(p);console.log(`[bootstrap] ${supply} tokens @ block ${bn}`);let changed=await pruneAboveSupply(supply);if(supply){const c=await hydrate(Array.from({length:supply},(_,i)=>i+1),Number(bn));changed=c.length>0||changed;}p.tokenStateBlock=Number((await redis.get<string>(K.tokenStateBlock))||Number(bn));if(!changed&&!await redis.get(K.stadium))changed=true;if(changed)await publishDerivedViews(Number(bn),p);if(p.isSettled&&DEPLOYMENT_BLOCK>0n)await rebuildClaimLogs(DEPLOYMENT_BLOCK,bn);if(p.isSettled)await refreshSettlement(p,bn);await redis.set(K.protocol,p);await refreshCommunities();lastCommunities=Date.now();if(DEPLOYMENT_BLOCK>0n&&!(await redis.get(K.countersReady)))await rebuildCounters(DEPLOYMENT_BLOCK,bn);await checkpoint(bn);}

async function processRange(from:bigint,to:bigint){
 const impacted=new Set<number>();
 const [transfers,gameLogs]=await Promise.all([
  rpc('transfer logs',()=>client.getLogs({address:CONTRACTS.gluttonNFT,event:TRANSFER,fromBlock:from,toBlock:to})),
  rpc('game events',()=>client.getLogs({address:CONTRACTS.gameEngine,fromBlock:from,toBlock:to})),
 ]);
 for(const l of transfers)impacted.add(Number(l.args.tokenId));
 for(const l of gameLogs)addEventImpacts(l,impacted);
 // The current deployment emits dedicated events (Fed/FastEntered/TruceVoted/
 // GameSettled) for every mutation. The GameEngine-bound transaction scan below
 // stays as a compatibility fallback for smart-account calls where tx.to is not
 // the GameEngine; browsers never perform this work.
 for(let b=from;b<=to;b++){const block=await rpc('block transactions',()=>client.getBlock({blockNumber:b,includeTransactions:true}));for(const tx of block.transactions){if(typeof tx==='string')continue;if(tx.to?.toLowerCase()===CONTRACTS.gameEngine.toLowerCase())idsFromGameTx(tx.input).forEach(id=>impacted.add(id));}}
 const counters=tallyCounters(gameLogs as any[]);
 if(counters.feeds.size){const pipe=redis.pipeline();for(const [w,n] of counters.feeds)pipe.hincrby(K.feeds,w,n);await pipe.exec();}
 if(counters.poisonTxs.length){const senders=await poisonSenders(counters.poisonTxs);if(senders.size){const pipe=redis.pipeline();for(const [w,n] of senders)pipe.hincrby(K.poisons,w,n);await pipe.exec();}}
 const p=await protocol(to),previous=await redis.get<ProtocolSnapshot>(K.protocol);
 // FIX: when the LIVE latch flips, EVERY token's effectiveExpiry changes (s_initialExpiry).
 // Any row hydrated before the start would otherwise stay unrevealed with a zero clock.
 const gameJustStarted=Boolean(previous&&Number(previous.gameStart)===0&&Number(p.gameStart)>0);
 if(gameJustStarted){const s0=supplyOf(p);for(let id=1;id<=s0;id++)impacted.add(id);console.log(`[game-start] re-hydrating ${s0} tokens after the LIVE latch`);}
 const oldMinted=Number(BigInt(previous?.totalMinted||'0')),newMinted=Number(BigInt(p.totalMinted));for(let id=oldMinted+1;id<=newMinted;id++)impacted.add(id);
 const changedIds=impacted.size?await hydrate([...impacted],Number(to)):[];p.tokenStateBlock=Number((await redis.get<string>(K.tokenStateBlock))||previous?.tokenStateBlock||0);
 const phaseChanged=!previous||previous.phaseCode!==p.phaseCode||previous.isSettled!==p.isSettled;const needsDerived=changedIds.length>0||phaseChanged||!(await redis.get(K.stadium));if(needsDerived)await publishDerivedViews(Number(to),p);
 const claimsChanged=await applyClaimLogs(from,to);if(p.isSettled&&(claimsChanged||!await redis.get(K.settlementBase)||!previous?.isSettled))await refreshSettlement(p,to);
 // Protocol is committed LAST. If the worker dies mid-update, APIs refuse any newer token/stadium
 // snapshot rather than publishing a mixed block to players.
 await redis.set(K.protocol,p);await checkpoint(to);
}

async function fullRebuild(at:bigint){
 console.warn(`[rebuild] reconciling current state @ ${at} without deleting the last good read model`);const p=await protocol(at),supply=supplyOf(p);let changed=await pruneAboveSupply(supply);if(supply)changed=(await hydrate(Array.from({length:supply},(_,i)=>i+1),Number(at))).length>0||changed;p.tokenStateBlock=Number((await redis.get<string>(K.tokenStateBlock))||p.tokenStateBlock||Number(at));await publishDerivedViews(Number(at),p);if(p.isSettled&&DEPLOYMENT_BLOCK>0n)await rebuildClaimLogs(DEPLOYMENT_BLOCK,at);if(p.isSettled)await refreshSettlement(p,at);if(DEPLOYMENT_BLOCK>0n&&!(await redis.get(K.countersReady)))await rebuildCounters(DEPLOYMENT_BLOCK,at);await redis.set(K.protocol,p);await checkpoint(at);if(changed)console.log('[rebuild] token changes reconciled');
}

async function processTouches(safe:bigint){
 const pending=(await redis.hgetall<Record<string,string>>(K.touchQueue))||{};const eligible=Object.entries(pending).filter(([id,b])=>Number.isSafeInteger(Number(id))&&Number(id)>0&&BigInt(String(b||'0'))<=safe).slice(0,2000);const ids=eligible.map(([id])=>Number(id));if(!ids.length)return false;
 try{const p=await protocol(safe);const supply=supplyOf(p);const valid=ids.filter(id=>id<=supply);const changed=valid.length?await hydrate(valid,Number(safe)):[];p.tokenStateBlock=Number((await redis.get<string>(K.tokenStateBlock))||p.tokenStateBlock||0);if(changed.length)await publishDerivedViews(Number(safe),p);await redis.set(K.protocol,p);
  // Remove only the exact hint version we processed. If a newer transaction touched the same
  // token while hydration was running, its larger block number remains queued for the next safe block.
  for(const [id,expected] of eligible)await redis.eval("if redis.call('HGET',KEYS[1],ARGV[1]) == ARGV[2] then return redis.call('HDEL',KEYS[1],ARGV[1]) else return 0 end",[K.touchQueue],[id,String(expected)]);
  return changed.length>0;}catch(e){console.warn('[touch] retaining queued ids for retry:',String((e as any)?.message||e));return false;}
}

async function tick(){
 const head=await rpc('head',()=>client.getBlockNumber());const safe=head>BigInt(CONFIRMATIONS)?head-BigInt(CONFIRMATIONS):head;const initialized=await redis.get(K.initialized);if(!initialized){await bootstrap(await protocol(safe),safe);return;}
 let last=BigInt((await redis.get<string>(K.lastBlock))||String(DEPLOYMENT_BLOCK||safe));const storedHash=await redis.get<string>(K.lastHash);
 if(last>0n&&storedHash){const b=await rpc('reorg checkpoint',()=>client.getBlock({blockNumber:last}));if(String(b.hash)!==storedHash){console.warn('[reorg] checkpoint changed; rebuilding canonical read model');await fullRebuild(safe);return;}}
 if(last<safe){const gap=safe-last;if(gap>BigInt(MAX_CATCHUP_BLOCKS)){console.warn(`[catchup] ${gap} blocks behind; reconciling current state instead of replaying every block`);await fullRebuild(safe);return;}await processRange(last+1n,safe);last=safe;}
 await processTouches(safe);
 const current=await redis.get<ProtocolSnapshot>(K.protocol);const communityEvery=current&&Number(current.gameStart)>0?300_000:30_000;if(Date.now()-lastCommunities>communityEvery){await refreshCommunities();lastCommunities=Date.now();}
 if(Date.now()-lastReconcile>RECONCILE){const stored=await redis.get<ProtocolSnapshot>(K.protocol);const fresh=await protocol(safe);const drift=!stored||Number(stored.gameStart)!==Number(fresh.gameStart)||stored.phaseCode!==fresh.phaseCode||stored.isSettled!==fresh.isSettled||Number(stored.aliveCount)!==Number(fresh.aliveCount)||Number(stored.totalMinted)!==Number(fresh.totalMinted)||!(await redis.get(K.stadium));if(drift)await fullRebuild(safe);lastReconcile=Date.now();}
}

async function withLeaderLock(fn:()=>Promise<void>){
 const token=`${process.pid}:${Date.now()}:${Math.random()}`,ttl=300;
 const acquired=await redis.set(K.lock,token,{nx:true,ex:ttl});
 if(!acquired)return false;
 const heartbeat=setInterval(()=>{
  void redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('expire',KEYS[1],ARGV[2]) else return 0 end",[K.lock],[token,String(ttl)]).catch(()=>{});
 },60_000);
 try{await fn();return true;}
 finally{
  clearInterval(heartbeat);
  try{await redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",[K.lock],[token]);}catch{}
 }
}
async function main(){console.log(`Gluttons production indexer · ${ACTIVE_CHAIN.name} · ${CONTRACTS.gameEngine}`);
 const once=process.env.INDEXER_ONCE==='true';
 let touchBusy=false;
 const touchTimer=setInterval(()=>{if(touchBusy)return;touchBusy=true;void (async()=>{try{const initialized=await redis.get(K.initialized);if(!initialized)return;const safe=await rpc('touch head',()=>client.getBlockNumber());await withLeaderLock(async()=>{await processTouches(safe);});}catch(e){console.warn('[touch-lane]',String((e as any)?.message||e));}finally{touchBusy=false}})()},TOUCH);
 if(once){try{await withLeaderLock(tick);}catch(e){console.error('[indexer]',(e as any)?.stack||e);}clearInterval(touchTimer);console.log('[indexer] single pass complete');return;}
 do{try{const ran=await withLeaderLock(tick);if(!ran)console.log('[indexer] standby: another worker owns the leader lock');}catch(e){console.error('[indexer]',(e as any)?.stack||e);}await sleep(LOOP+Math.floor(Math.random()*750));}while(true)}
void main();
