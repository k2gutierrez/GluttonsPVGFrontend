import { requireStore,K } from './store';

function ip(req:Request){return (req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||req.headers.get('x-real-ip')||'unknown').trim().slice(0,96);}
async function hit(key:string,limit:number,windowSec:number){const r=requireStore();const n=Number(await r.incr(key));if(n===1)await r.expire(key,windowSec);return n<=limit;}
export async function protectRpcRoute(req:Request,scope:string,{perIp=60,global=2000,windowSec=60}:{perIp?:number;global?:number;windowSec?:number}={}){
  const bucket=Math.floor(Date.now()/(windowSec*1000));
  const who=ip(req);
  const [a,b]=await Promise.all([hit(K.rate(scope,`${bucket}:ip:${who}`),perIp,windowSec+2),hit(K.rate(scope,`${bucket}:global`),global,windowSec+2)]);
  if(!a||!b){const e=new Error('RATE_LIMITED');(e as any).status=429;throw e;}
}
export function tooMany(){return new Response(JSON.stringify({error:'RATE_LIMITED',retryable:true}),{status:429,headers:{'content-type':'application/json','cache-control':'no-store','retry-after':'10'}});}
