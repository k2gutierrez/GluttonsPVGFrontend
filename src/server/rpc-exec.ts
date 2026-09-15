let active=0;
const MAX_ACTIVE=Math.max(1,Number(process.env.SERVER_RPC_MAX_CONCURRENCY||8));
let blockedUntil=0;
let strikes=0;
const queue:Array<()=>void>=[];
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function pump(){while(active<MAX_ACTIVE&&queue.length){active++;queue.shift()!();}}
function slot(){return new Promise<void>(resolve=>{queue.push(resolve);pump()});}
function release(){active=Math.max(0,active-1);pump();}
export function is429(e:unknown){const s=String((e as any)?.shortMessage||'')+' '+String((e as any)?.message||'')+' '+String((e as any)?.details||'');return /\b429\b|too many requests|rate.?limit/i.test(s);}
export function isRpcInfrastructureError(e:unknown){const s=String((e as any)?.shortMessage||'')+' '+String((e as any)?.message||'')+' '+String((e as any)?.name||'');return is429(e)||/timeout|timed out|503|502|504|network|fetch failed|socket/i.test(s);}
export async function rpcExecute<T>(label:string,fn:()=>Promise<T>,attempts=3):Promise<T>{
  let last:unknown;
  for(let i=0;i<attempts;i++){
    const wait=Math.max(0,blockedUntil-Date.now());if(wait)await sleep(wait+Math.floor(Math.random()*250));
    await slot();
    try{const out=await fn();strikes=Math.max(0,strikes-1);return out;}
    catch(e){last=e;if(is429(e)){strikes=Math.min(6,strikes+1);blockedUntil=Date.now()+Math.min(30_000,1_500*2**strikes)+Math.floor(Math.random()*600);}if(!isRpcInfrastructureError(e)||i===attempts-1)throw e;}
    finally{release();}
    await sleep(350*2**i+Math.floor(Math.random()*250));
  }
  throw last instanceof Error?last:new Error(`${label} failed`);
}
