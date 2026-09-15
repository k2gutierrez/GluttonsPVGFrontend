import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { serverClient } from '@/server/server-chain';
import { CONTRACTS,GAME_ENGINE_ABI,PRIZE_VAULT_ABI } from '@/lib/constants';
import { requireTrustedOrigin } from '@/server/request-guard';
import { rpcExecute,isRpcInfrastructureError } from '@/server/rpc-exec';
import { protectRpcRoute,tooMany } from '@/server/rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
const allowed:Record<string,{address:`0x${string}`;abi:readonly unknown[];functions:Set<string>}>= {
 gameEngine:{address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functions:new Set(['ensureStarted','mint','preMint','feed','enterFast','poison','powerFridge','liveDevour','consumeCorpse','voteTruce','settleGame','addInviteCollection','allowCommunityMint','modifyCollectionMaxAllowed','modifyCollectionMaxPerWallet','changeCommunityMintPrice','endPreMintedPhase'])},
 prizeVault:{address:CONTRACTS.prizeVault,abi:PRIZE_VAULT_ABI,functions:new Set(['claimPrize'])},
};
function revive(v:any):any{if(Array.isArray(v))return v.map(revive);if(v&&typeof v==='object'&&Object.keys(v).length===1&&typeof v.__gluttonsBigInt==='string'&&/^\d+$/.test(v.__gluttonsBigInt))return BigInt(v.__gluttonsBigInt);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]));return v;}
function sane(v:any,depth=0):boolean{if(depth>5)return false;if(Array.isArray(v))return v.length<=2048&&v.every(x=>sane(x,depth+1));if(typeof v==='string')return v.length<=8192;if(v&&typeof v==='object')return Object.keys(v).length<=32&&Object.values(v).every(x=>sane(x,depth+1));return true;}
export async function POST(req:Request){try{
 requireTrustedOrigin(req);const len=Number(req.headers.get('content-length')||0);if(len>65_536)return NextResponse.json({ok:false,error:'REQUEST_TOO_LARGE'},{status:413});
 try{await protectRpcRoute(req,'simulate',{perIp:120,global:12_000,windowSec:60})}catch(e:any){if(e?.status===429)return tooMany();throw e;}
 const b=await req.json();const c=allowed[String(b.contract||'')],fn=String(b.functionName||'');if(!c||!c.functions.has(fn)||!isAddress(String(b.account||''))||!sane(b.args||[]))return NextResponse.json({ok:false,error:'INVALID_SIMULATION_REQUEST'},{status:400});const args=revive(b.args||[]),value=b.value?BigInt(String(b.value)):undefined;
 await rpcExecute('transaction simulation',()=>serverClient.simulateContract({account:b.account,address:c.address,abi:c.abi as any,functionName:fn,args,value}as any));return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}catch(e:any){if(isRpcInfrastructureError(e))return NextResponse.json({ok:false,error:'PREFLIGHT_INFRA_UNAVAILABLE',retryable:true},{status:503,headers:{'Cache-Control':'no-store'}});return NextResponse.json({ok:false,error:e?.shortMessage||e?.message||'SIMULATION_FAILED',retryable:false},{status:409,headers:{'Cache-Control':'no-store'}});}}
