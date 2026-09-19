'use client';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { useAccount } from 'wagmi';
import { useAtomValue } from 'jotai';
import type { Address } from 'viem';
import { protocolAtom } from '@/state/game';
import { GAME_HOUR_SECONDS } from '@/lib/constants';
import { metadataImage } from '@/lib/metadata';
import { readApi,jitter } from '@/lib/read-api';
import { deriveStatus,logicalDeadAt,validProtocolSnapshot,type ProtocolSnapshot,type TokenSnapshot } from '@/lib/read-model';

export type GluttonToken={id:number;owner:Address;visualState:number;expiry:number;isHungry:boolean;tokenUri:string;image:string;poisonProtectedUntil:number;finalBiteDeadline:number;deadAt:number;spoilCheckpoint:number;poweredUntil:number;spoilQ4:number;fasting:boolean;deathSettled:boolean};
export const INVENTORY_PAGE_SIZE=100;
const ZERO='0x0000000000000000000000000000000000000000';
const toP=(p:any):ProtocolSnapshot=>({chainId:0,deployment:ZERO,blockNumber:p.indexedBlock||0,indexedAt:p.indexedAt||0,tokenStateBlock:p.tokenStateBlock||0,gameStart:String(p.gameStart),phaseCode:p.phaseCode,currentPhase:p.currentPhase,aliveCount:String(p.aliveCount),currentMealSeconds:String(p.currentMealSeconds),isSettled:p.isSettled,totalMinted:String(p.totalMinted),maxSupply:String(p.maxSupply),startingPopulation:String(p.startingPopulation),totalNormalFeeds:String(p.totalNormalFeeds),completedBars:String(p.completedBars),startBackstop:String(p.startBackstop),preMintEnd:p.preMintEnd,communityMintPrice:String(p.communityMintPrice),gameHourSeconds:String(p.gameHourSeconds||GAME_HOUR_SECONDS),lastSupperWarningAt:String(p.lastSupperWarningAt),lastSupperAt:String(p.lastSupperAt),lastSupperThreshold:String(p.lastSupperThreshold),truceThreshold:String(p.truceThreshold),truceEpoch:'0',tiebreakCandidate:'0',potNative:'0',potWeth:'0',wethAddress:ZERO,rottenThreshold:String(24n*(p.gameHourSeconds||BigInt(GAME_HOUR_SECONDS))*4n)});
export function isLogicallyDead(t:GluttonToken,now=Math.floor(Date.now()/1000)){if(t.visualState===2||t.visualState===3)return true;if(t.visualState!==1)return false;if(t.finalBiteDeadline>0&&now>=t.finalBiteDeadline)return true;if(t.fasting)return false;return t.expiry>0&&now>=t.expiry}
export function effectiveVisualState(t:GluttonToken,now=Math.floor(Date.now()/1000)){if(t.visualState===2||t.visualState===3)return t.visualState;if(isLogicallyDead(t,now))return 2;return t.visualState}
export function isGameplayFresh(t:GluttonToken,now=Math.floor(Date.now()/1000)){return effectiveVisualState(t,now)===2}
export function statusOf(t:GluttonToken,now=Math.floor(Date.now()/1000),gh=GAME_HOUR_SECONDS){const v=effectiveVisualState(t,now);if(v===2)return'FRESH';if(v===3)return'ROTTEN';if(t.finalBiteDeadline>now)return'FINAL BITE';if(t.fasting)return'FASTING';if(t.expiry>now&&t.expiry-now<=12*gh)return'HUNGRY';return'ALIVE'}

export function useOwnedGluttons(){
 const{address}=useAccount();const p=useAtomValue(protocolAtom);const[raw,setRaw]=useState<TokenSnapshot[]>([]);const[loadedAddress,setLoadedAddress]=useState<string|null>(null);const[remoteProtocol,setRemoteProtocol]=useState<ProtocolSnapshot|null>(null);const[images,setImages]=useState<Record<number,{src:string;vs:number}>>({});const[loading,setLoading]=useState(false);const[refreshing,setRefreshing]=useState(false);const[error,setError]=useState<string|null>(null);const[stale,setStale]=useState(false);const[now,setNow]=useState(()=>Math.floor(Date.now()/1000));const totalMinted=Number(p.startingPopulation||p.totalMinted);
 const load=useCallback(async(fresh=false)=>{if(!address){setRaw([]);setLoadedAddress(null);setRemoteProtocol(null);return;}fresh?setRefreshing(true):setLoading(true);try{const requested=address.toLowerCase();const r=await readApi<{protocol:ProtocolSnapshot;tokens:TokenSnapshot[];walletBalance:number}>(`/api/read/wallet/${address}`,{fresh,ttlMs:3_000});if(!validProtocolSnapshot(r.value.protocol))throw new Error('WALLET_PROTOCOL_INVALID');setRaw(r.value.tokens);setLoadedAddress(requested);setRemoteProtocol(r.value.protocol);setStale(r.stale);setError(null);}catch(e:any){setStale(true);setError(e?.message||'Inventory read service unavailable.');}finally{setLoading(false);setRefreshing(false)}},[address]);
 useEffect(()=>{void load();if(!address)return;let dead=false,t:ReturnType<typeof setTimeout>;const loop=()=>{t=setTimeout(async()=>{if(document.visibilityState==='visible')await load(false);if(!dead)loop()},jitter(120_000));};loop();return()=>{dead=true;clearTimeout(t)}},[address,load]);
 useEffect(()=>{const tickMs=Number(p.gameHourSeconds||BigInt(GAME_HOUR_SECONDS))<=60?1000:3000;const t=setInterval(()=>setNow(Math.floor(Date.now()/1000)),tickMs);return()=>clearInterval(t)},[]);
 const visibleRaw=loadedAddress&&address&&loadedAddress===address.toLowerCase()?raw:[];
 const protocol=remoteProtocol||toP(p);
 // Cached art is keyed by the DERIVED visual state. A starvation death emits no event, so the
 // stored row (and the alive art that came with it) can lag reality: without the key a corpse
 // would keep showing the living image forever.
 const derivedVsOf=useCallback((t:TokenSnapshot)=>{const st=deriveStatus(t,protocol,now);return st==='FRESH'?2:st==='ROTTEN'?3:1},[protocol,now]);
 const lastArtRun=useRef(0);
 // Metadata is cosmetic and may never block gameplay state. A whale wallet hydrates only six
 // images at a time so opening My Gluttons cannot create an API/RPC burst.
 useEffect(()=>{let dead=false;const stamp=Date.now();if(stamp-lastArtRun.current<4_000)return;const targets=visibleRaw.filter(t=>!t.burned&&t.owner).map(t=>({t,vs:derivedVsOf(t)})).filter(x=>images[x.t.id]?.vs!==x.vs).slice(0,6);if(!targets.length)return;lastArtRun.current=stamp;void Promise.all(targets.map(async({t,vs})=>{try{const r=await fetch(`/api/read/metadata/${t.id}?b=${t.updatedBlock||0}`,{cache:'no-store'});if(!r.ok)return null;const j=await r.json();const img=String(j.image||'')||await metadataImage(String(j.tokenUri||''),vs);return img?{id:t.id,src:img,vs}:null}catch{return null}})).then(rows=>{if(dead)return;const clean=rows.filter(Boolean) as {id:number;src:string;vs:number}[];if(!clean.length)return;setImages(x=>{const y={...x};for(const c of clean)y[c.id]={src:c.src,vs:c.vs};return y})});return()=>{dead=true}},[visibleRaw,images,derivedVsOf]);
 const tokens=useMemo(()=>visibleRaw.filter(t=>!t.burned&&t.owner).map(t=>{const st=deriveStatus(t,protocol,now);const vs=st==='FRESH'?2:st==='ROTTEN'?3:1;return{id:t.id,owner:t.owner!,visualState:vs,expiry:t.expiry,isHungry:st==='HUNGRY',tokenUri:t.tokenUri||'',image:(images[t.id]?.vs===vs?images[t.id].src:''),poisonProtectedUntil:t.poisonProtectedUntil,finalBiteDeadline:t.finalBiteDeadline,deadAt:t.deadAt||logicalDeadAt(t,protocol,now),spoilCheckpoint:t.spoilCheckpoint,poweredUntil:t.poweredUntil,spoilQ4:t.spoilQ4,fasting:t.fasting,deathSettled:t.deathSettled} satisfies GluttonToken}).sort((a,b)=>a.id-b.id),[raw,images,now,protocol.gameStart,protocol.currentPhase,protocol.lastSupperAt,protocol.indexedAt]);
 const burned=useMemo(()=>visibleRaw.filter(t=>t.burned).map(t=>({id:t.id})),[visibleRaw]);
 const refresh=useCallback(()=>load(true),[load]);const refreshIds=useCallback(async(_:number[])=>{await load(true)},[load]);const rescan=refresh;const loadMore=useCallback(async()=>{},[]);
 const walletSwitching=Boolean(address)&&loadedAddress!==address?.toLowerCase();const degraded=stale||Boolean(error);return{tokens,walletBalance:tokens.length,burned,scannedCount:totalMinted,totalMinted,hasMore:false,pageSize:INVENTORY_PAGE_SIZE,loading:loading||walletSwitching,loadingMore:false,refreshing,degraded,error:degraded?(error||'INDEXER DEGRADED — showing last confirmed inventory'):null,loadMore,refresh,refreshIds,rescan,address};
}
