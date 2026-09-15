'use client';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { GAME_HOUR_SECONDS } from '@/lib/constants';
import { jitter,readApi } from '@/lib/read-api';
import { deriveStatus,validProtocolSnapshot,type ProtocolSnapshot,type TokenSnapshot,type DerivedStatus } from '@/lib/read-model';

export type StadiumStatus='UNMINTED'|'LOADING'|'ALIVE'|'HUNGRY'|'FASTING'|'FINAL_BITE'|'FRESH'|'ROTTEN'|'CONSUMED';
export type StadiumToken={id:number;visualState:number;expiry:number;isHungry:boolean;poisonProtectedUntil:number;finalBiteDeadline:number;fasting:boolean;status:StadiumStatus;loaded:boolean;deadAt?:number;spoilCheckpoint?:number;poweredUntil?:number;spoilQ4?:number;deathSettled?:boolean};
type CompactRow=[number,number,number,number,number,number,number,number,number,number,number];
type Payload={protocol:ProtocolSnapshot;rows:CompactRow[];indexedAt:number;stadiumBlock:number};
const mapStatus=(s:DerivedStatus):StadiumStatus=>s==='UNKNOWN'?'LOADING':s;
function decode(rows:CompactRow[]):TokenSnapshot[]{return rows.map((r,i)=>({id:i+1,burned:r[0]===1,visualState:r[0]===1?-1:1,expiry:r[1]||0,poisonProtectedUntil:r[2]||0,finalBiteDeadline:r[3]||0,deadAt:r[4]||0,spoilCheckpoint:r[5]||0,poweredUntil:r[6]||0,spoilQ4:r[7]||0,fasting:r[8]===1,deathSettled:r[9]===1,voteEpoch:'0',updatedBlock:r[10]||0})).filter((_,i)=>rows[i]?.[0]!==-1)}
function atomProtocol(p:any):ProtocolSnapshot{return{chainId:0,deployment:'0x0000000000000000000000000000000000000000',blockNumber:p.indexedBlock||0,indexedAt:p.indexedAt||0,tokenStateBlock:p.tokenStateBlock||0,gameStart:String(p.gameStart),phaseCode:p.phaseCode,currentPhase:p.currentPhase,aliveCount:String(p.aliveCount),currentMealSeconds:String(p.currentMealSeconds),isSettled:p.isSettled,totalMinted:String(p.totalMinted),maxSupply:String(p.maxSupply),startingPopulation:String(p.startingPopulation),totalNormalFeeds:String(p.totalNormalFeeds),completedBars:String(p.completedBars),startBackstop:String(p.startBackstop),preMintEnd:p.preMintEnd,communityMintPrice:String(p.communityMintPrice),gameHourSeconds:String(p.gameHourSeconds||GAME_HOUR_SECONDS),lastSupperWarningAt:String(p.lastSupperWarningAt),lastSupperAt:String(p.lastSupperAt),lastSupperThreshold:String(p.lastSupperThreshold),truceThreshold:String(p.truceThreshold),truceEpoch:'0',tiebreakCandidate:'0',potNative:String(p.potNative||0),potWeth:String(p.potWeth||0),wethAddress:'0x0000000000000000000000000000000000000000',rottenThreshold:String(24n*(p.gameHourSeconds||BigInt(GAME_HOUR_SECONDS))*4n)}}

export function usePublicStadium(){
 const p=useAtomValue(protocolAtom);const[rows,setRows]=useState<TokenSnapshot[]>([]);const[remoteProtocol,setRemoteProtocol]=useState<ProtocolSnapshot|null>(null);const[stadiumBlock,setStadiumBlock]=useState(0);const[stadiumRevision,setStadiumRevision]=useState(0);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);const[stale,setStale]=useState(false);const[now,setNow]=useState(()=>Math.floor(Date.now()/1000));const mounted=useRef(false);
 const revision=Number(p.tokenStateBlock||0);
 const refresh=useCallback(async(fresh=false)=>{try{const path=`/api/read/stadium?v=${revision}`;const r=await readApi<Payload>(path,{fresh,ttlMs:3_000,persist:false,timeoutMs:10_000});if(!validProtocolSnapshot(r.value.protocol))throw new Error('STADIUM_PROTOCOL_INVALID');setRows(decode(r.value.rows||[]));setRemoteProtocol(r.value.protocol);setStadiumBlock(Number(r.value.stadiumBlock||0));setStadiumRevision(Number(r.value.protocol.tokenStateBlock||0));setStale(r.stale);setError(null);}catch(e:any){setStale(true);setError(e?.message||'Read service unavailable.');}finally{setLoading(false)}},[revision]);
 useEffect(()=>{mounted.current=true;void refresh();return()=>{mounted.current=false}},[refresh]);
 // Fetch a new CDN/cache key only when the indexer announces a new token revision.
 useEffect(()=>{if(!mounted.current)return;if(revision>0&&revision>stadiumRevision)void refresh(false)},[revision,stadiumRevision,refresh]);
 // Slow safety revalidation for missed cache notifications; this hits API/CDN, never chain RPC.
 useEffect(()=>{let dead=false,t:ReturnType<typeof setTimeout>;const loop=()=>{t=setTimeout(async()=>{if(document.visibilityState==='visible')await refresh(false);if(!dead)loop()},jitter(60_000));};loop();return()=>{dead=true;clearTimeout(t)}},[refresh]);
 // Matrix clocks advance locally. Two-second buckets keep 2,000 DOM cells inexpensive.
 useEffect(()=>{const t=setInterval(()=>setNow(Math.floor(Date.now()/2000)*2),2000);return()=>clearInterval(t)},[]);
 const protocolFromAtom=p.stageResolved?atomProtocol(p):(remoteProtocol||atomProtocol(p));
 const totalMinted=Number(BigInt(protocolFromAtom.totalMinted||'0'));const matrixSupply=Number(BigInt(protocolFromAtom.startingPopulation||'0')||BigInt(protocolFromAtom.totalMinted||'0'));const byId=useMemo(()=>new Map(rows.map(x=>[x.id,x])),[rows]);
 const list=useMemo(()=>Array.from({length:matrixSupply},(_,i)=>{const id=i+1;if(id>totalMinted)return{id,visualState:-2,expiry:0,isHungry:false,poisonProtectedUntil:0,finalBiteDeadline:0,fasting:false,status:'UNMINTED' as const,loaded:true};const t=byId.get(id);if(!t)return{id,visualState:-1,expiry:0,isHungry:false,poisonProtectedUntil:0,finalBiteDeadline:0,fasting:false,status:'LOADING' as const,loaded:false};const status=mapStatus(deriveStatus(t,protocolFromAtom,now));return{id,visualState:status==='FRESH'?2:status==='ROTTEN'?3:status==='CONSUMED'?-1:1,expiry:t.expiry,isHungry:status==='HUNGRY',poisonProtectedUntil:t.poisonProtectedUntil,finalBiteDeadline:t.finalBiteDeadline,fasting:t.fasting,status,loaded:true,deadAt:t.deadAt,spoilCheckpoint:t.spoilCheckpoint,poweredUntil:t.poweredUntil,spoilQ4:t.spoilQ4,deathSettled:t.deathSettled} satisfies StadiumToken}),[matrixSupply,totalMinted,byId,protocolFromAtom.gameStart,protocolFromAtom.currentPhase,protocolFromAtom.lastSupperAt,protocolFromAtom.rottenThreshold,now]);
 const degraded=stale||Boolean(error);
 return{list,totalMinted,scanned:rows.length,loading,error:degraded?(error||'READ MODEL STALE — showing last confirmed state'):null,degraded,batchSize:Math.max(rows.length,matrixSupply),gameHourSeconds:Number(protocolFromAtom.gameHourSeconds||GAME_HOUR_SECONDS),refresh,stadiumBlock,stadiumRevision};
}
export function stadiumRemaining(t:StadiumToken,now=Math.floor(Date.now()/1000)){if(t.status==='FINAL_BITE')return Math.max(0,t.finalBiteDeadline-now);return Math.max(0,t.expiry-now)}
