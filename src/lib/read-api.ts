'use client';
import { ACTIVE_CHAIN, CONTRACTS } from '@/lib/constants';

type CacheRow = { at:number; value:unknown };
const mem = new Map<string, CacheRow>();
const inflight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL = 2_500;
const MAX_DISK_AGE_MS = 24 * 60 * 60 * 1000;
const SMALL_PERSIST_PREFIXES=['/api/read/protocol','/api/read/wallet/','/api/read/endgame','/api/read/settlement/','/api/read/token/'];

// One circuit breaker per browser tab for the shared read API. This is deliberately
// above every hook/component so an API/CDN outage cannot become a retry storm.
let apiBlockedUntil = 0;
let apiStrikes = 0;
let lastFailureStatus = 0;

function normalizedKey(path:string){
  try {
    const u=new URL(path,window.location.origin);
    // Cache-busters never create a new logical resource. Version parameters DO,
    // because they bind stadium/endgame payloads to an indexed state revision.
    u.searchParams.delete('fresh');u.searchParams.delete('t');
    u.searchParams.sort();
    return `${u.pathname}${u.search}`;
  } catch { return path.split('?')[0]; }
}
const CACHE_NS=`${ACTIVE_CHAIN.id}:${CONTRACTS.gameEngine.toLowerCase()}`;
function diskKey(key:string){ return `gluttons:read:${CACHE_NS}:${key}`; }
function shouldPersist(path:string, explicit?:boolean){ const k=normalizedKey(path); return explicit ?? SMALL_PERSIST_PREFIXES.some(p=>k.startsWith(p)); }
function loadDisk(key:string){
  try {
    const raw=localStorage.getItem(diskKey(key)); if(!raw)return undefined;
    const row=JSON.parse(raw) as CacheRow;
    if(!row || typeof row.at!=='number' || Date.now()-row.at>MAX_DISK_AGE_MS){localStorage.removeItem(diskKey(key));return undefined;}
    return row;
  } catch { return undefined; }
}
function saveDisk(key:string,value:unknown){try{localStorage.setItem(diskKey(key),JSON.stringify({at:Date.now(),value}));}catch{}}
function fallbackFor<T>(key:string,path:string,preserve?:T){
  const disk=shouldPersist(path)?loadDisk(key)?.value:undefined;
  return (mem.get(key)?.value ?? disk ?? preserve) as T|undefined;
}
function isInfrastructureStatus(status:number){return status===429||status===408||status>=500;}
function noteFailure(status=0){
  lastFailureStatus=status;
  apiStrikes=Math.min(8,apiStrikes+1);
  const rateLimited=status===429;
  const base=rateLimited?2_500:900;
  const cap=rateLimited?60_000:20_000;
  apiBlockedUntil=Date.now()+Math.min(cap,base*2**Math.max(0,apiStrikes-1))+Math.floor(Math.random()*750);
}
function noteSuccess(){apiStrikes=Math.max(0,apiStrikes-1);if(apiStrikes===0){apiBlockedUntil=0;lastFailureStatus=0;}}
function backoffError(){const e=new Error('READ_API_BACKOFF');(e as any).status=lastFailureStatus||503;(e as any).retryAfterMs=Math.max(0,apiBlockedUntil-Date.now());return e;}

export async function readApi<T>(path:string, opts:{fresh?:boolean;ttlMs?:number;preserve?:T;persist?:boolean;timeoutMs?:number}={}) : Promise<{value:T;stale:boolean}> {
  const key=normalizedKey(path),ttl=opts.ttlMs??DEFAULT_TTL,now=Date.now();
  const row=mem.get(key);
  if(!opts.fresh&&row&&now-row.at<ttl)return{value:row.value as T,stale:false};

  const current=inflight.get(key);
  if(current){
    try{return{value:await current as T,stale:false};}
    catch(e){const fallback=fallbackFor<T>(key,path,opts.preserve);if(fallback!==undefined)return{value:fallback,stale:true};throw e;}
  }

  // Fail closed while the shared API is backing off. Preserve the last confirmed
  // snapshot if one exists, but never fan out more requests from other components.
  if(Date.now()<apiBlockedUntil){
    const fallback=fallbackFor<T>(key,path,opts.preserve);
    if(fallback!==undefined)return{value:fallback,stale:true};
    throw backoffError();
  }

  const url=opts.fresh?`${path}${path.includes('?')?'&':'?'}fresh=${now}`:path;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.max(2_000,opts.timeoutMs??8_000));
  const request=fetch(url,{cache:opts.fresh?'no-store':'default',headers:{accept:'application/json'},signal:controller.signal}).then(async r=>{
    if(!r.ok){
      const body=await r.json().catch(()=>({}));
      const err=new Error(String(body?.error||`Read API ${r.status}`));
      (err as any).status=r.status;
      throw err;
    }
    const data=await r.json() as T;
    noteSuccess();
    mem.set(key,{at:Date.now(),value:data});
    if(shouldPersist(path,opts.persist))saveDisk(key,data);
    return data;
  }).catch(e=>{
    const status=Number((e as any)?.status||0);
    if(!status||isInfrastructureStatus(status))noteFailure(status);
    throw e;
  }).finally(()=>{clearTimeout(timeout);inflight.delete(key);});
  inflight.set(key,request);
  try{return{value:await request,stale:false};}
  catch(e){const fallback=fallbackFor<T>(key,path,opts.preserve);if(fallback!==undefined)return{value:fallback,stale:true};throw e;}
}

export function forgetReadCache(prefix=''){
  for(const k of [...mem.keys()])if(k.startsWith(prefix))mem.delete(k);
}
export function readApiBackoff(){return{blocked:Date.now()<apiBlockedUntil,retryAfterMs:Math.max(0,apiBlockedUntil-Date.now()),strikes:apiStrikes,status:lastFailureStatus};}
export const jitter=(base:number,pct=.35)=>Math.max(250,Math.round(base*(1-pct+Math.random()*pct*2)));
