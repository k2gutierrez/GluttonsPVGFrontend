'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Kicker, Panel } from '@/components/Terminal';
import { Scramble } from '@/components/fx/RetroText';
import { GAME_HOUR_SECONDS } from '@/lib/constants';
import { gameClock } from '@/lib/time';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { readApi } from '@/lib/read-api';
import type { TokenSnapshot } from '@/lib/read-model';

type Inspection = TokenSnapshot & { status:string };
const short=(a?:string)=>a?`${a.slice(0,8)}…${a.slice(-6)}`:'—';
export default function InspectPage(){
  const stage=useProtocolStage();const router=useRouter();const p=useAtomValue(protocolAtom);const gameHour=Number(p.gameHourSeconds>0n?p.gameHourSeconds:BigInt(GAME_HOUR_SECONDS));
  const[token,setToken]=useState('');const[data,setData]=useState<Inspection|null>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState<string|null>(null);const[stale,setStale]=useState(false);const[now,setNow]=useState(()=>Math.floor(Date.now()/1000));const[image,setImage]=useState('');
  useEffect(()=>{if(stage!=='live'&&stage!=='syncing')router.replace('/')},[stage,router]);
  useEffect(()=>{const t=setInterval(()=>setNow(Math.floor(Date.now()/1000)),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{const q=new URLSearchParams(window.location.search).get('token');if(q&&/^\d+$/.test(q)){setToken(q);void inspect(Number(q));}},[]); // eslint-disable-line react-hooks/exhaustive-deps
  async function inspect(id:number){if(!Number.isInteger(id)||id<=0)return;setLoading(true);setError(null);try{const r=await readApi<any>(`/api/read/token/${id}`,{fresh:true,ttlMs:0,preserve:data||undefined});const t=r.value.token as TokenSnapshot;if(!t||t.burned){setError('Token was consumed / burned or is not available.');return;}setData({...t,status:String(r.value.status||'UNKNOWN')});setStale(r.stale);window.history.replaceState(null,'',`/inspect?token=${id}`);}catch(e:any){setError(e?.message||'Token state is temporarily unavailable. Last confirmed data is preserved.');}finally{setLoading(false)}}
  function submit(e:FormEvent){e.preventDefault();void inspect(Number(token));}
  // Art: resolved server-side from the token metadata (alive JSON or onchain corpse JSON).
  useEffect(()=>{if(!data){setImage('');return;}let dead=false;void (async()=>{try{const r=await fetch(`/api/read/metadata/${data.id}?b=${data.updatedBlock||0}`,{cache:'no-store'});if(!r.ok)return;const j=await r.json();if(!dead&&j.image)setImage(String(j.image));}catch{/* keep previous art */}})();return()=>{dead=true};},[data?.id,data?.updatedBlock]);
  const remain=data?Math.max(0,data.expiry-now):0;const displayState=data?.status||'UNKNOWN';const living=['ALIVE','HUNGRY','FASTING','FINAL_BITE'].includes(displayState);
  if(stage!=='live')return null;
  return <><Header/><main className="page-shell">
    <Kicker>public protocol tool / shared canonical read</Kicker><h1 className="inventory-title idle-glitch" data-text="TOKEN INSPECTOR"><Scramble loop>TOKEN INSPECTOR</Scramble></h1><p className="accent-copy">KNOW THE TOKEN ID. READ THE MACHINE. NO TARGET DIRECTORY.</p>
    {stale&&<Panel className="mt-4 sync-state-banner degraded"><b>READ MODEL DEGRADED</b><span>Showing the last confirmed token snapshot. No unknown field is replaced with a fake value.</span></Panel>}
    {p.isSettled&&<Panel className="mt-4 final-archive-note"><b>SETTLEMENT IS FINAL.</b><span>Raw token clocks no longer determine the winner. Use FINAL TABLE for the canonical outcome.</span></Panel>}
    <Panel className="mt-5 p-5 md:p-7"><form onSubmit={submit} className="flex flex-col gap-3 md:flex-row"><input value={token} onChange={e=>setToken(e.target.value.replace(/\D/g,''))} placeholder="TOKEN ID / #1427" inputMode="numeric" className="min-h-12 flex-1"/><button className="ghost-btn min-w-48" disabled={loading||!token}>{loading?'READING STATE…':'INSPECT TOKEN'}</button></form><p className="muted-copy mt-3">The inspector reads the shared indexed view of the GameEngine. The contract remains authoritative for every transaction.</p></Panel>
    {error&&<Panel className="mt-4 error-state"><b>INSPECTION DEGRADED</b><p>{error}</p></Panel>}
    {data&&<div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><Panel className="p-5 md:p-7"><Kicker>canonical token state</Kicker><div className="inspect-art">{image?<img src={image} alt={`Glutton #${data.id}`} onError={()=>setImage('')}/>:<span>NO ART RESOLVED</span>}</div><div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5"><div><span className="text-xs text-zinc-500">GLUTTON</span><h2 className="text-4xl font-bold">#{String(data.id).padStart(4,'0')}</h2></div><div className="text-right"><span className="text-xs text-zinc-500">STATE</span><div className="text-2xl font-bold text-[#ff5b2e]">{displayState.replace('_',' ')}</div></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Read label="OWNER" value={short(data.owner)} detail={data.owner}/><Read label="CLOCK" value={living?(displayState==='FINAL_BITE'?gameClock(Math.max(0,data.finalBiteDeadline-now),gameHour):gameClock(remain,gameHour)):'DEAD'} detail={data.expiry?`EXPIRY ${new Date(data.expiry*1000).toLocaleString()}`:'NO ACTIVE EXPIRY'}/><Read label="HUNGRY" value={displayState==='HUNGRY'?'YES':living?'NO':'N/A'}/><Read label="FASTING" value={displayState==='FASTING'?'YES':living?'NO':'ENDED'}/><Read label="FINAL BITE" value={displayState==='FINAL_BITE'?gameClock(Math.max(0,data.finalBiteDeadline-now),gameHour):'NONE'}/><Read label="DEATH SETTLED" value={data.deathSettled?'YES':'NO'}/></div></Panel><Panel className="p-5 md:p-7"><Kicker>combat / corpse telemetry</Kicker><div className="mt-5 space-y-3"><Read label="POISON SHIELD" value={living?(data.fasting?'DOWN':data.poisonProtectedUntil>now?`UP · ${gameClock(data.poisonProtectedUntil-now,gameHour)}`:'DOWN'):'N/A'}/><Read label="FRIDGE" value={data.poweredUntil>now?`ON · ${gameClock(Math.max(0,Math.min(data.poweredUntil,Number(p.lastSupperAt||0n)||data.poweredUntil)-now),gameHour)}`:'OFF'}/><Read label="DEAD AT" value={data.deadAt?new Date(data.deadAt*1000).toLocaleString():'NOT MATERIALIZED'}/><Read label="SPOIL Q4" value={data.spoilQ4.toLocaleString()}/><Read label="INDEXED BLOCK" value={data.updatedBlock.toLocaleString()}/></div></Panel></div>}
  </main></>;
}
function Read({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl border border-white/10 bg-black/20 p-4"><span className="text-[10px] tracking-[.18em] text-zinc-500">{label}</span><strong className="mt-1 block break-all text-lg">{value}</strong>{detail&&<small className="mt-1 block break-all text-zinc-600">{detail}</small>}</div>}
