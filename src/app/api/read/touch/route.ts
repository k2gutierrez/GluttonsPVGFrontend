import { NextResponse } from 'next/server';
import { requireStore,K } from '@/server/store';
import { requireTrustedOrigin } from '@/server/request-guard';
import { protectRpcRoute,tooMany } from '@/server/rate-limit';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 requireTrustedOrigin(req);const len=Number(req.headers.get('content-length')||0);if(len>4096)return NextResponse.json({error:'REQUEST_TOO_LARGE'},{status:413});
 try{await protectRpcRoute(req,'touch',{perIp:180,global:20_000,windowSec:60})}catch(e:any){if(e?.status===429)return tooMany();throw e;}
 const b=await req.json();const ids=[...new Set((Array.isArray(b?.tokenIds)?b.tokenIds:[]).map(Number).filter((n:number)=>Number.isSafeInteger(n)&&n>0&&n<=100_000))].slice(0,16);const block=Number(b?.notBeforeBlock||0);if(!Number.isSafeInteger(block)||block<0)return NextResponse.json({error:'BAD_BLOCK'},{status:400});
 if(!ids.length)return NextResponse.json({ok:true,queued:0},{headers:{'Cache-Control':'no-store'}});
 const r=requireStore();const pipe=r.pipeline();ids.forEach(id=>pipe.hget(K.touchQueue,String(id)));const old=await pipe.exec<(string|null)[]>();const update:Record<string,string>={};ids.forEach((id,i)=>{update[String(id)]=String(Math.max(block,Number(old[i]||0)));});await r.hset(K.touchQueue,update);return NextResponse.json({ok:true,queued:ids.length},{headers:{'Cache-Control':'no-store'}});
}catch(e:any){return NextResponse.json({error:e?.message||'TOUCH_QUEUE_FAILED'},{status:e?.message==='UNTRUSTED_ORIGIN'?403:503,headers:{'Cache-Control':'no-store'}});}}
