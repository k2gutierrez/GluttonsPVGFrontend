'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Kicker, Panel } from '@/components/Terminal';
import { Scramble } from '@/components/fx/RetroText';
import { CONTRACTS, GAME_ENGINE_ABI, GAME_HOUR_SECONDS, INSPECTOR_ABI, ZERO_ADDRESS } from '@/lib/constants';
import { gameClock } from '@/lib/time';
import { usePublicClient } from 'wagmi';

type Inspection = {
  id: number;
  owner: string;
  visualState: number;
  expiry: number;
  isHungry: boolean;
  poisonProtectedUntil: number;
  finalBiteDeadline: number;
  deadAt: number;
  spoilCheckpoint: number;
  poweredUntil: number;
  spoilQ4: number;
  fasting: boolean;
  deathSettled: boolean;
};

const STATE = ['UNREVEALED', 'ALIVE', 'FRESH CORPSE', 'ROTTEN CORPSE'];
const clock = gameClock;
const short = (a:string) => a ? `${a.slice(0,8)}…${a.slice(-6)}` : '—';

export default function InspectPage(){
  const client=usePublicClient();
  const [token,setToken]=useState('');
  const [data,setData]=useState<Inspection|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [now,setNow]=useState(()=>Math.floor(Date.now()/1000));

  useEffect(()=>{const t=setInterval(()=>setNow(Math.floor(Date.now()/1000)),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{const q=new URLSearchParams(window.location.search).get('token');if(q&&/^\d+$/.test(q)){setToken(q);void inspect(Number(q));}},[client]); // eslint-disable-line react-hooks/exhaustive-deps

  async function inspect(id:number){
    if(!client||!Number.isInteger(id)||id<=0||CONTRACTS.inspector===ZERO_ADDRESS)return;
    setLoading(true);setError(null);setData(null);
    try{
      // Single-token reads intentionally avoid multicall entirely.
      const [view,state]:any[]=await Promise.all([
        client.readContract({address:CONTRACTS.inspector,abi:INSPECTOR_ABI,functionName:'getTokenView',args:[BigInt(id)]}),
        client.readContract({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_tokenStates',args:[BigInt(id)]}),
      ]);
      const arr=Array.isArray(state)?state:[];
      setData({id,owner:String(view.owner),visualState:Number(view.visualState),expiry:Number(view.expiry),isHungry:Boolean(view.isHungry),poisonProtectedUntil:Number(arr[1]||0),finalBiteDeadline:Number(arr[2]||0),deadAt:Number(arr[3]||0),spoilCheckpoint:Number(arr[4]||0),poweredUntil:Number(arr[5]||0),spoilQ4:Number(arr[6]||0),fasting:Boolean(arr[7]),deathSettled:Boolean(arr[8])});
      window.history.replaceState(null,'',`/inspect?token=${id}`);
    }catch(e:any){setError(e?.shortMessage||e?.message||'Token could not be inspected. It may not exist or may have been burned.');}
    finally{setLoading(false)}
  }

  function submit(e:FormEvent){e.preventDefault();void inspect(Number(token));}
  const remain=data?Math.max(0,data.expiry-now):0;
  const finalBiteExpired=Boolean(data&&data.finalBiteDeadline>0&&data.finalBiteDeadline<=now);
  const logicallyDead=Boolean(data&&data.visualState===1&&(finalBiteExpired||(!data.fasting&&remain<=0)));
  const displayState=data?(logicallyDead?2:data.visualState):0;
  const hungryNow=Boolean(data&&displayState===1&&remain>0&&remain<=12*GAME_HOUR_SECONDS);

  return <><Header/><main className="page-shell">
    <Kicker>public protocol tool / canonical read</Kicker>
    <h1 className="inventory-title idle-glitch" data-text="TOKEN INSPECTOR"><Scramble loop>TOKEN INSPECTOR</Scramble></h1>
    <p className="accent-copy">KNOW THE TOKEN ID. READ THE MACHINE. NO TARGET DIRECTORY.</p>

    <Panel className="mt-5 p-5 md:p-7">
      <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row">
        <input value={token} onChange={e=>setToken(e.target.value.replace(/\D/g,''))} placeholder="TOKEN ID / #1427" inputMode="numeric" className="min-h-12 flex-1"/>
        <button className="ghost-btn min-w-48" disabled={loading||!token}>{loading?'READING CHAIN…':'INSPECT TOKEN'}</button>
      </form>
      <p className="muted-copy mt-3">Inspector is read-only. This page never discovers or ranks targets for you.</p>
    </Panel>

    {error&&<Panel className="mt-4 error-state"><b>INSPECTION FAILED</b><p>{error}</p></Panel>}
    {data&&<div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <Panel className="p-5 md:p-7">
        <Kicker>canonical token state</Kicker>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div><span className="text-xs text-zinc-500">GLUTTON</span><h2 className="text-4xl font-bold">#{String(data.id).padStart(4,'0')}</h2></div>
          <div className="text-right"><span className="text-xs text-zinc-500">STATE</span><div className="text-2xl font-bold text-[#ff5b2e]">{STATE[displayState]||`STATE ${displayState}`}</div></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Read label="OWNER" value={short(data.owner)} detail={data.owner}/>
          <Read label="CLOCK" value={displayState===1?clock(remain):'DEAD'} detail={data.expiry?`EXPIRY ${new Date(data.expiry*1000).toLocaleString()}`:'NO ACTIVE EXPIRY'}/>
          <Read label="HUNGRY" value={displayState===1?(hungryNow?'YES':'NO'):'N/A'}/>
          <Read label="FASTING" value={displayState===1?(data.fasting?'YES':'NO'):'ENDED'}/>
          <Read label="FINAL BITE" value={displayState===1&&data.finalBiteDeadline>now?clock(data.finalBiteDeadline-now):'NONE'}/>
          <Read label="DEATH SETTLED" value={data.deathSettled?'YES':'NO'}/>
        </div>
      </Panel>
      <Panel className="p-5 md:p-7">
        <Kicker>combat / corpse telemetry</Kicker>
        <div className="mt-5 space-y-3">
          <Read label="POISON SHIELD" value={displayState===1?(data.fasting?'DOWN':data.poisonProtectedUntil>now?`UP · ${clock(data.poisonProtectedUntil-now)}`:'DOWN'):'N/A'}/>
          <Read label="FRIDGE" value={data.poweredUntil>now?`ON · ${clock(data.poweredUntil-now)}`:'OFF'}/>
          <Read label="DEAD AT" value={data.deadAt?new Date(data.deadAt*1000).toLocaleString():'NOT MATERIALIZED'}/>
          <Read label="SPOIL Q4" value={data.spoilQ4.toLocaleString()}/>
        </div>
      </Panel>
    </div>}
  </main></>;
}

function Read({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl border border-white/10 bg-black/20 p-4"><span className="text-[10px] tracking-[.18em] text-zinc-500">{label}</span><strong className="mt-1 block break-all text-lg">{value}</strong>{detail&&<small className="mt-1 block break-all text-zinc-600">{detail}</small>}</div>}
