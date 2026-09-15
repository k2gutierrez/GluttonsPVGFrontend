'use client';
import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { ACTIVE_CHAIN, CONTRACTS, GAME_HOUR_SECONDS } from '@/lib/constants';
import { jitter, readApi } from '@/lib/read-api';
import { validProtocolSnapshot, type ProtocolSnapshot } from '@/lib/read-model';
import { protocolAtom } from '@/state/game';

const LIVE_LOCK_KEY=`gluttons:live-locked:${ACTIVE_CHAIN.id}:${CONTRACTS.gameEngine.toLowerCase()}`;
const POLL_LIVE=8_000, POLL_PRE=6_000;
const READ_STALE_MS=Math.max(10_000,Number(process.env.NEXT_PUBLIC_READ_STALE_MS||45_000));

function apply(s:ProtocolSnapshot,prev:any,degraded:boolean){
 const gameStart=BigInt(s.gameStart); const live=gameStart>0n;
 if(live)try{localStorage.setItem(LIVE_LOCK_KEY,'1')}catch{}
 return {...prev,
  aliveCount:BigInt(s.aliveCount),currentMealSeconds:BigInt(s.currentMealSeconds),isSettled:s.isSettled,currentPhase:s.currentPhase,
  totalMinted:BigInt(s.totalMinted),maxSupply:BigInt(s.maxSupply),gameStart,startingPopulation:BigInt(s.startingPopulation),
  totalNormalFeeds:BigInt(s.totalNormalFeeds),completedBars:BigInt(s.completedBars),startBackstop:BigInt(s.startBackstop),preMintEnd:s.preMintEnd,
  communityMintPrice:BigInt(s.communityMintPrice),synced:true,stageResolved:true,rpcDegraded:degraded,
  lastSuccessfulSyncAt:degraded?prev.lastSuccessfulSyncAt:Date.now(),gameHourSeconds:BigInt(s.gameHourSeconds||GAME_HOUR_SECONDS),phaseCode:s.phaseCode,
  lastSupperWarningAt:BigInt(s.lastSupperWarningAt),lastSupperAt:BigInt(s.lastSupperAt),lastSupperThreshold:BigInt(s.lastSupperThreshold),
  truceThreshold:BigInt(s.truceThreshold),liveLocked:prev.liveLocked||live,indexedBlock:s.blockNumber,indexedAt:s.indexedAt,
  tokenStateBlock:s.tokenStateBlock,potNative:BigInt(s.potNative),potWeth:BigInt(s.potWeth)};
}

export function GameSync(){
 const [p,set]=useAtom(protocolAtom);const live=useRef(p.liveLocked);useEffect(()=>{live.current=p.liveLocked},[p.liveLocked]);
 useEffect(()=>{
  let dead=false,t:ReturnType<typeof setTimeout>|undefined;let cachedLive=false;
  try{cachedLive=localStorage.getItem(LIVE_LOCK_KEY)==='1'}catch{}
  // LIVE is irreversible for a deployment, so this is a safe first-frame hint. It is
  // never used to invent counters/phase; those stay unresolved until the read model responds.
  if(cachedLive){live.current=true;set(x=>({...x,liveLocked:true,stageResolved:true,synced:false,rpcDegraded:true}));}

  const run=async()=>{
   try{
    const r=await readApi<ProtocolSnapshot>('/api/read/protocol',{ttlMs:2_000});
    if(!validProtocolSnapshot(r.value))throw new Error('READ_MODEL_SCHEMA_INVALID');
    if(r.value.chainId!==ACTIVE_CHAIN.id||r.value.deployment.toLowerCase()!==CONTRACTS.gameEngine.toLowerCase())throw new Error('READ_MODEL_DEPLOYMENT_MISMATCH');
    if(dead)return;
    const snapshotLive=BigInt(r.value.gameStart)>0n;
    const staleByAge=Date.now()-Number(r.value.indexedAt||0)>READ_STALE_MS;
    const degraded=r.stale||staleByAge;

    // A stale PRE_GAME snapshot is NOT evidence that mint is still open. If the API is
    // unavailable while Game Start may have happened, show SYNCING instead of Mint.
    if(degraded&&!snapshotLive&&!live.current){
      set(x=>({...x,synced:false,stageResolved:false,rpcDegraded:true}));
    }else{
      set(x=>apply(r.value,x,degraded));
      if(snapshotLive)live.current=true;
    }
   }catch{
    if(!dead)set(x=>({...x,rpcDegraded:true,synced:false,stageResolved:live.current}));
   }finally{
    if(!dead)t=setTimeout(run,jitter(live.current?POLL_LIVE:POLL_PRE));
   }
  };
  void run();return()=>{dead=true;if(t)clearTimeout(t)};
 },[set]);return null;
}
