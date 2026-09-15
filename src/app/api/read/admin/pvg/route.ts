import { NextResponse } from 'next/server';
import { serverClient } from '@/server/server-chain';
import { CONTRACTS,PVG_TREASURY_ABI } from '@/lib/constants';
import { rpcExecute,isRpcInfrastructureError } from '@/server/rpc-exec';
import { protectRpcRoute,tooMany } from '@/server/rate-limit';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function txJson(v:any){
  const a=Array.isArray(v)?v:Object.values(v||{});
  return {receiver:String(a[0]||''),amount:String(a[1]||0),currency:Number(a[2]||0),user1Approved:Number(a[3]||0),user2Approved:Number(a[4]||0)};
}
export async function GET(req:Request){
  try{
    try{await protectRpcRoute(req,'admin-pvg',{perIp:60,global:1000,windowSec:60})}catch(e:any){if(e?.status===429)return tooMany();throw e;}
    const base={address:CONTRACTS.pvgTreasury,abi:PVG_TREASURY_ABI} as const;
    const rows=await rpcExecute('admin pvg snapshot',()=>serverClient.multicall({allowFailure:true,deployless:true,batchSize:0,contracts:[
      {...base,functionName:'owner'},
      {...base,functionName:'getImmutables'},
      {...base,functionName:'getEthBalance'},
      {...base,functionName:'getWethBalance'},
      {...base,functionName:'getPendingTransactionStatus'},
      {...base,functionName:'getTransaction'},
    ] as any}),2);
    if(rows.some((r:any)=>r.status!=='success'))return NextResponse.json({error:'ADMIN_SNAPSHOT_INCOMPLETE'},{status:503,headers:{'Cache-Control':'no-store'}});
    const v=(i:number)=>(rows[i] as any).result;const imm=Array.isArray(v(1))?v(1):Object.values(v(1)||{});
    return NextResponse.json({owner:String(v(0)),immutables:imm.map(String),eth:String(v(2)),weth:String(v(3)),pending:Boolean(v(4)),transaction:txJson(v(5))},{headers:{'Cache-Control':'private, max-age=2, stale-while-revalidate=10'}});
  }catch(e:any){
    return NextResponse.json({error:isRpcInfrastructureError(e)?'ADMIN_RPC_UNAVAILABLE':(e?.shortMessage||e?.message||'ADMIN_READ_FAILED')},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
