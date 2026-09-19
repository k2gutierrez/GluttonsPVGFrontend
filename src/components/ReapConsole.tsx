'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { waitForTransactionReceipt, writeContract } from 'wagmi/actions';
import { toast } from 'sonner';
import { Kicker, Panel } from '@/components/Terminal';
import { humanError } from '@/components/TxButton';
import { CONTRACTS, GAME_ENGINE_ABI } from '@/lib/constants';
import { wagmiConfig } from '@/lib/web3';

type ReapSnapshot = {
  engine:string;supply:number;aliveCount:number;isSettled:boolean;tiebreakCandidate:string;
  phaseCode:number;candidates:number[];pendingCandidates:number;logicalAlive:number;
  settleRisk:boolean;complete:boolean;scanErrors:number;scannedAt:number;
};

const BATCH_SIZES=[10,25,50];

export function ReapConsole(){
  const {address}=useAccount();
  const [snap,setSnap]=useState<ReapSnapshot|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [batchSize,setBatchSize]=useState(25);
  const [settleAcknowledged,setSettleAcknowledged]=useState(false);
  const [running,setRunning]=useState(false);
  const [progress,setProgress]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await fetch('/api/read/admin/reap',{cache:'no-store'});
      const j=await r.json();
      if(!r.ok)throw new Error(j?.error||'REAP_SCAN_FAILED');
      setSnap(j as ReapSnapshot);setError(null);setSettleAcknowledged(false);
    }catch(e:any){setError(e?.message||'Reap scan unavailable.')}
    finally{setLoading(false)}
  },[]);
  useEffect(()=>{void load()},[load]);

  const batches=useMemo(()=>{
    if(!snap)return [] as number[][];
    const out:number[][]=[];
    for(let i=0;i<snap.candidates.length;i+=batchSize)out.push(snap.candidates.slice(i,i+batchSize));
    return out;
  },[snap,batchSize]);

  const run=async()=>{
    if(!snap||!batches.length||running)return;
    if(!address){toast.error('Connect the admin wallet first.');return;}
    if(snap.settleRisk&&!settleAcknowledged){toast.error('This sweep would take the last survivors. Confirm the settlement warning first.');return;}
    setRunning(true);
    let confirmed=0;
    try{
      for(let i=0;i<batches.length;i++){
        const ids=batches[i];
        setProgress(`BATCH ${i+1}/${batches.length} — ${ids.length} IDS`);
        const hash=await writeContract(wagmiConfig,{
          address:CONTRACTS.gameEngine as `0x${string}`,
          abi:GAME_ENGINE_ABI as any,
          functionName:'reap',
          args:[ids.map(id=>BigInt(id))],
        });
        const receipt=await waitForTransactionReceipt(wagmiConfig,{hash});
        if(receipt.status!=='success')throw new Error(`Batch ${i+1} reverted onchain.`);
        confirmed++;
        // The indexer only refreshes tokens it is told about; a reap changes both the
        // corpse accounting and the global counters, so re-touch the batch.
        try{
          await fetch('/api/read/touch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tokenIds:ids,notBeforeBlock:Number(receipt.blockNumber)})});
        }catch{}
      }
      toast.success(`Reap confirmed: ${confirmed}/${batches.length} batches covering ${snap.candidates.length} ids.`);
    }catch(e:any){
      toast.error(confirmed?`Stopped after ${confirmed} confirmed batch(es). ${humanError(e)}`:humanError(e));
    }finally{
      setRunning(false);setProgress(null);setSettleAcknowledged(false);
      await load();
    }
  };

  const alive=snap?.aliveCount??0;
  const pending=snap?.pendingCandidates??0;
  const buttonLabel=snap&&pending
    ?`REAP ${pending} IDS — ${batches.length} BATCH${batches.length===1?'':'ES'}`
    :'NOTHING TO REAP';

  return <Panel className="mt-4 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Kicker>accounting keeper</Kicker>
        <h2 className="font-display text-3xl">REAP CONSOLE</h2>
      </div>
      <button onClick={()=>void load()} disabled={loading||running} className="action-btn">{loading?'SCANNING…':'RESCAN'}</button>
    </div>

    <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
      Death is logical at the canonical timestamp; <code>s_aliveCount</code> only moves when a transaction
      materializes it. <code>reap(uint256[])</code> is permissionless and idempotent — live ids are no-ops.
      This console scans ids 1..S onchain and sends only unsettled corpses, in gas-bounded batches.
    </p>

    {error && <p className="mt-3 text-[10px] text-[#ff5b2e]">{error}</p>}

    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <Stat l="CHAIN ALIVE" v={String(alive)}/>
      <Stat l="CORPSES PENDING" v={String(pending)}/>
      <Stat l="LOGICAL ALIVE" v={String(snap?.logicalAlive??0)}/>
      <Stat l="SETTLED" v={snap?.isSettled?'YES':'NO'}/>
    </div>

    {snap && !snap.isSettled && <div className="mt-4">
      <Kicker>batch size</Kicker>
      <div className="mt-2 flex flex-wrap gap-2">
        {BATCH_SIZES.map(n=><button key={n} onClick={()=>setBatchSize(n)} disabled={running}
          className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${batchSize===n?'border-[var(--acid)] text-[var(--acid)]':'border-[var(--line)] text-zinc-500 hover:text-zinc-300'}`}>{n} IDS / TX</button>)}
      </div>
    </div>}

    {snap && !snap.complete && <p className="mt-3 text-[10px] text-[#ffb02e]">
      INCOMPLETE SCAN — {snap.scanErrors} id(s) could not be read. Rescan before trusting a short list.
    </p>}

    {snap?.settleRisk && <div className="mt-3 border border-[#ff5b2e]/50 bg-[#ff5b2e]/5 p-3">
      <p className="text-[10px] text-[#ff5b2e]">
        SETTLEMENT SWEEP — this batch set would take <code>s_aliveCount</code> to 0 and immediately settle the game
        (winner = owner of tiebreak token {snap.tiebreakCandidate}). This cannot be undone.
      </p>
      <label className="mt-2 flex items-center gap-2 text-[10px] text-zinc-400">
        <input type="checkbox" checked={settleAcknowledged} onChange={e=>setSettleAcknowledged(e.target.checked)} disabled={running}/>
        I understand and want to settle now.
      </label>
    </div>}

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button onClick={()=>void run()} disabled={running||loading||!pending||!address||(snap?.settleRisk&&!settleAcknowledged)}
        className="action-btn">{running?(progress||'REAPING…'):buttonLabel}</button>
      {snap?.isSettled && <span className="text-[10px] text-zinc-500">The table is already settled — reap() returns early.</span>}
    </div>

    {snap&&pending>0&&<p className="mt-3 break-all text-[10px] text-zinc-500">
      CANDIDATES ({pending}): {snap.candidates.slice(0,60).join(', ')}{pending>60?` … +${pending-60}`:''}
    </p>}

    <p className="mt-3 text-[10px] text-zinc-600">
      Note: <code>reap()</code> currently accepts any id, including ids above S. This console only ever sends 1..S.
    </p>
  </Panel>;
}

function Stat({l,v}:{l:string;v:string}){return <Panel className="p-4"><Kicker>{l}</Kicker><b className="font-display text-2xl">{v}</b></Panel>}
