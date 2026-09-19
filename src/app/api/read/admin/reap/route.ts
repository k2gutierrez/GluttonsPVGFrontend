import { NextResponse } from 'next/server';
import { serverClient } from '@/server/server-chain';
import { CONTRACTS, GAME_ENGINE_ABI } from '@/lib/constants';
import { rpcExecute, isRpcInfrastructureError } from '@/server/rpc-exec';
import { protectRpcRoute, tooMany } from '@/server/rate-limit';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// One multicall per 50 ids keeps every eth_call inside provider gas caps while
// staying coarse enough for a 2,000-NFT supply (40 round trips, human-triggered).
const CHUNK=50;

const tuple=(v:any)=>Array.isArray(v)?v:(v?Object.values(v):[]);

export async function GET(req:Request){
  try{
    try{await protectRpcRoute(req,'admin-reap',{perIp:30,global:400,windowSec:60})}catch(e:any){if(e?.status===429)return tooMany();throw e;}

    const base={address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI} as const;
    const head=await rpcExecute('admin reap globals',()=>serverClient.multicall({allowFailure:true,deployless:false,batchSize:0,contracts:[
      {...base,functionName:'S'},
      {...base,functionName:'s_aliveCount'},
      {...base,functionName:'isSettled'},
      {...base,functionName:'s_tiebreakCandidate'},
      {...base,functionName:'currentPhaseCode'},
    ] as any}),2);
    if(head.some((r:any)=>r.status!=='success'))return NextResponse.json({error:'REAP_SNAPSHOT_INCOMPLETE'},{status:503,headers:{'Cache-Control':'no-store'}});

    const h=(i:number)=>(head[i] as any).result;
    const supply=Number(BigInt(String(h(0))));
    const isSettled=Boolean(h(2));

    const candidates:number[]=[];
    let scanErrors=0;
    if(!isSettled){
      for(let start=1;start<=supply;start+=CHUNK){
        const end=Math.min(supply,start+CHUNK-1);
        const calls:any[]=[];
        for(let id=start;id<=end;id++){
          calls.push({...base,functionName:'getVisualState',args:[BigInt(id)]});
          calls.push({...base,functionName:'s_tokenStates',args:[BigInt(id)]});
        }
        const rows=await rpcExecute(`admin reap scan ${start}-${end}`,()=>serverClient.multicall({allowFailure:true,deployless:false,batchSize:0,contracts:calls as any}),2);
        for(let i=0;i<rows.length;i+=2){
          const id=start+i/2;
          const view=rows[i] as any, state=rows[i+1] as any;
          if(view?.status!=='success'||state?.status!=='success'){scanErrors++;continue;}
          const visualState=Number(view.result);
          const t=tuple(state.result);
          const deathSettled=Boolean(t[8]);
          // Canonical corpse + accounting not yet advanced == exactly what reap() materializes.
          if(visualState>=2&&!deathSettled)candidates.push(id);
        }
      }
    }

    const aliveCount=Number(BigInt(String(h(1))));
    return NextResponse.json({
      engine:CONTRACTS.gameEngine,
      supply,
      aliveCount,
      isSettled,
      tiebreakCandidate:String(h(3)),
      phaseCode:Number(h(4)),
      candidates,
      pendingCandidates:candidates.length,
      logicalAlive:Math.max(0,aliveCount-candidates.length),
      settleRisk:!isSettled&&candidates.length>0&&candidates.length>=aliveCount,
      // A partial scan must never be presented as an authoritative empty list.
      complete:scanErrors===0,
      scanErrors,
      scannedAt:Date.now(),
    },{headers:{'Cache-Control':'no-store'}});
  }catch(e:any){
    return NextResponse.json({error:isRpcInfrastructureError(e)?'REAP_RPC_UNAVAILABLE':(e?.shortMessage||e?.message||'REAP_SCAN_FAILED')},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
