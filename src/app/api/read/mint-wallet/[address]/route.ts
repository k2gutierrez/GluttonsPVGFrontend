import { NextResponse } from 'next/server';
import { getAddress,isAddress } from 'viem';
import { serverClient } from '@/server/server-chain';
import { requireStore,K } from '@/server/store';
import { getProtocol } from '@/server/read-service';
import { CONTRACTS,GAME_ENGINE_ABI,PARTNER_ERC721_ABI } from '@/lib/constants';
import { rpcExecute,isRpcInfrastructureError } from '@/server/rpc-exec';
import { protectRpcRoute,tooMany } from '@/server/rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{address:string}>}){try{
 const{address}=await params;if(!isAddress(address))return NextResponse.json({error:'BAD_ADDRESS'},{status:400});
 try{await protectRpcRoute(req,'mint-wallet',{perIp:120,global:8_000,windowSec:60})}catch(e:any){if(e?.status===429)return tooMany();throw e;}
 const wallet=getAddress(address),r=requireStore();const[p,allCommunities]=await Promise.all([getProtocol(),r.get<any[]>(K.communities)]);if(!p)return NextResponse.json({error:'INDEXER_BOOTSTRAPPING'},{status:503,headers:{'Cache-Control':'no-store'}});
 const communities=(allCommunities||[]);if(communities.length>64)return NextResponse.json({error:'COMMUNITY_SET_TOO_LARGE'},{status:503});
 // Public mint needs only one per-wallet GameEngine counter. During pre-mint, only ACTIVE
 // communities are checked. Inactive collections never multiply RPC work across all visitors.
 const checked=p.preMintEnd?[]:communities.filter(c=>c.allowed&&Number(c.amountMinted||0)<Number(c.maxTotalAmountAllowed||0));
 const version=String((await r.get<string>(K.communityVersion))||'0');const mode=p.preMintEnd?'public':'pre';const cacheKey=K.rpcCache(`mint-wallet:${mode}:${version}:${wallet.toLowerCase()}`);const fresh=new URL(req.url).searchParams.has('fresh');if(!fresh){const cached=await r.get<any>(cacheKey);if(cached)return NextResponse.json(cached,{headers:{'Cache-Control':'public, max-age=5, s-maxage=10, stale-while-revalidate=30'}});}
 const contracts:any[]=[{address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_normalMintAmount',args:[wallet]}];for(const c of checked){contracts.push({address:c.collectionAddress,abi:PARTNER_ERC721_ABI,functionName:'balanceOf',args:[wallet]});contracts.push({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_amountMintPerCollection',args:[wallet,c.collectionAddress]});}
 const rows=await rpcExecute('mint wallet snapshot',()=>serverClient.multicall({allowFailure:true,deployless:false,batchSize:0,contracts}));if(rows.some((x:any)=>x.status!=='success'))return NextResponse.json({error:'MINT_WALLET_SNAPSHOT_INCOMPLETE',retryable:true},{status:503,headers:{'Cache-Control':'no-store'}});
 const value=(i:number)=>(rows[i]as any).result;const out={normalMinted:String(value(0)),communities:checked.map((c:any,i:number)=>({id:c.id,balance:String(value(1+i*2)),minted:String(value(2+i*2))})),checkedCommunityIds:checked.map((c:any)=>c.id),readAt:Date.now()};await r.set(cacheKey,out,{ex:20});return NextResponse.json(out,{headers:{'Cache-Control':'public, max-age=5, s-maxage=10, stale-while-revalidate=30'}});
}catch(e:any){return NextResponse.json({error:isRpcInfrastructureError(e)?'MINT_WALLET_RPC_UNAVAILABLE':(e?.shortMessage||e?.message||'MINT_WALLET_READ_FAILED'),retryable:true},{status:503,headers:{'Cache-Control':'no-store'}});}}
