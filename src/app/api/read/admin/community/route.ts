import { NextResponse } from 'next/server';
import { serverClient } from '@/server/server-chain';
import { getProtocol } from '@/server/read-service';
import { requireStore,K } from '@/server/store';
import { CONTRACTS,GAME_ENGINE_ABI } from '@/lib/constants';
import { rpcExecute,isRpcInfrastructureError } from '@/server/rpc-exec';
import { protectRpcRoute,tooMany } from '@/server/rate-limit';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(req:Request){
  try{
    try{await protectRpcRoute(req,'admin-community',{perIp:60,global:1000,windowSec:60})}catch(e:any){if(e?.status===429)return tooMany();throw e;}
    const [owner,p,communities]=await Promise.all([
      rpcExecute('admin game owner',()=>serverClient.readContract({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'owner'}),2),
      getProtocol(),
      requireStore().get<any[]>(K.communities),
    ]);
    if(!p)return NextResponse.json({error:'INDEXER_BOOTSTRAPPING'},{status:503,headers:{'Cache-Control':'no-store'}});
    return NextResponse.json({owner:String(owner),protocol:p,communities:communities||[]},{headers:{'Cache-Control':'private, max-age=2, stale-while-revalidate=10'}});
  }catch(e:any){
    return NextResponse.json({error:isRpcInfrastructureError(e)?'ADMIN_RPC_UNAVAILABLE':(e?.shortMessage||e?.message||'ADMIN_READ_FAILED')},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
