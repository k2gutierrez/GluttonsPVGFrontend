'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { Header } from '@/components/Header';
import { Kicker, Panel } from '@/components/Terminal';
import { stadiumRemaining, usePublicStadium } from '@/hooks/usePublicStadium';
import { gameClock } from '@/lib/time';
import { readApi } from '@/lib/read-api';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { protocolAtom } from '@/state/game';
import { EndgameExperience } from '@/components/EndgameExperience';

const PAGE_SIZE = 100;
const stateLabel: Record<string,string> = { ALIVE:'ALIVE', HUNGRY:'HUNGRY', FASTING:'FASTING', FINAL_BITE:'FINAL BITE' };

export default function LeaderboardPage(){
  const stage=useProtocolStage(); const router=useRouter(); const p=useAtomValue(protocolAtom);
  const [page,setPage]=useState(0);
  useEffect(()=>{if(stage!=='live'&&stage!=='syncing')router.replace('/')},[stage,router]);
  const { list, scanned, totalMinted, loading, error, gameHourSeconds } = usePublicStadium();
  const now=Math.floor(Date.now()/1000);
  type LbRow={wallet:string;count:number;rank:number};
  const [boards,setBoards]=useState<{poisons:LbRow[];feeds:LbRow[]}|null>(null);
  useEffect(()=>{let dead=false;void (async()=>{try{const r=await readApi<{poisons:LbRow[];feeds:LbRow[]}>('/api/read/leaderboards',{ttlMs:20_000});if(!dead)setBoards(r.value);}catch{/* keep last confirmed board */}})();return()=>{dead=true}},[]);
  const shortW=(w:string)=>w?`${w.slice(0,6)}…${w.slice(-4)}`:'—';

  if(stage!=='live') return null;
  if(p.isSettled) return <><Header/><main className="page-shell leaderboard-page final-table-page"><Kicker>public settlement archive / canonical outcome</Kicker><h1 className="inventory-title">FINAL TABLE</h1><p className="accent-copy">THE GAME IS CLOSED. CLOCKS NO LONGER CHANGE THE RESULT.</p><EndgameExperience/><Panel className="mt-4 final-archive-note"><b>WHY THE LIVE RANKING IS GONE</b><span>Raw token expiry timestamps can continue to age after settlement. They are not allowed to visually rewrite the winner. Final shares and the settlement snapshot are the authoritative archive.</span><Link href="/" className="ghost-btn">← FINAL STADIUM</Link></Panel></main></>;

  const alive=list.filter(t=>['ALIVE','HUNGRY','FASTING','FINAL_BITE'].includes(t.status)).sort((a,b)=>stadiumRemaining(b,now)-stadiumRemaining(a,now)||a.id-b.id);
  const pages=Math.max(1,Math.ceil(alive.length/PAGE_SIZE));
  const safePage=Math.min(page,pages-1);
  const shown=alive.slice(safePage*PAGE_SIZE,(safePage+1)*PAGE_SIZE);
  const first=alive.length?safePage*PAGE_SIZE+1:0;
  const last=Math.min(alive.length,(safePage+1)*PAGE_SIZE);

  return <><Header/><main className="page-shell leaderboard-page">
    <Kicker>public survival ranking / longest clocks first</Kicker><h1 className="inventory-title">SURVIVAL BOARD</h1><p className="accent-copy">STATUS CREATES ATTENTION. TARGETING STILL REQUIRES A DECISION.</p>
    <Panel className="p-5 md:p-7">
      <div className="board-head"><div><h2>TOP CLOCKS</h2><p>{loading?'Loading shared index snapshot':'SHARED INDEX SNAPSHOT'} · {Math.min(scanned,totalMinted).toLocaleString()} / {totalMinted.toLocaleString()} positions indexed. No browser-side chain scan.</p></div><Link href="/" className="ghost-btn">← LIVE STADIUM</Link></div>
      {error&&<div className="matrix-error">READ MODEL DEGRADED · {error}</div>}
      <div className="board-pagination" aria-label="Leaderboard pagination"><span>{first.toLocaleString()}–{last.toLocaleString()} OF {alive.length.toLocaleString()} LIVING</span><div><button className="ghost-btn" disabled={safePage===0} onClick={()=>setPage(x=>Math.max(0,x-1))}>← PREV</button><button className="ghost-btn" disabled={safePage>=pages-1} onClick={()=>setPage(x=>Math.min(pages-1,x+1))}>NEXT →</button></div></div>
      <div className="survival-table full">
        <div className="survival-row heading"><span>RANK</span><span>GLUTTON</span><span>CLOCK</span><span>STATE</span><span>SHIELD</span><span/></div>
        {shown.map((t,i)=>{const rank=safePage*PAGE_SIZE+i+1;const shield=t.fasting?'DOWN':t.poisonProtectedUntil>now?`UP ${gameClock(t.poisonProtectedUntil-now,gameHourSeconds)}`:'DOWN';return <div key={t.id} className="survival-row"><span>{String(rank).padStart(3,'0')}</span><strong>#{String(t.id).padStart(4,'0')}</strong><time>{gameClock(stadiumRemaining(t,now),gameHourSeconds)}</time><b className={`board-state state-text-${t.status.toLowerCase().replace('_','-')}`}>{stateLabel[t.status]}</b><span>{shield}</span><Link prefetch={false} href={`/inspect?token=${t.id}`} className="mini-inspect">INSPECT</Link></div>})}
        {!shown.length&&!loading&&<div className="board-empty">NO LIVING POSITIONS IN THE CURRENT INDEX SNAPSHOT.</div>}
      </div>
      <p className="board-policy">Ranking is intentionally fixed to longest remaining clock first. There is no weakest, Fasting-only, vulnerable-only, or best-target filter. Ownership is resolved only when a position is inspected, keeping the public board compact and scalable.</p>
    </Panel>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Panel className="p-5 md:p-7">
        <div className="board-head"><div><h2>TOP POISONS</h2><p>Wallets that landed the most Poison strikes. Top 50 only.</p></div></div>
        <div className="lb-mini"><div className="lb-mini-row heading"><span>RANK</span><span>WALLET</span><span className="count">POISONS</span></div>
          {(boards?.poisons||[]).map(r=><div key={r.wallet} className="lb-mini-row"><span>{String(r.rank).padStart(3,'0')}</span><b>{shortW(r.wallet)}</b><b className="count">{r.count}</b></div>)}
          {boards&&!boards.poisons.length&&<div className="lb-mini-empty">NO POISON STRIKES RECORDED YET.</div>}
        </div>
      </Panel>
      <Panel className="p-5 md:p-7">
        <div className="board-head"><div><h2>WHO HAS BEEN FED THE MOST</h2><p>Wallets that fed their Gluttons most often. Top 50 only.</p></div></div>
        <div className="lb-mini"><div className="lb-mini-row heading"><span>RANK</span><span>WALLET</span><span className="count">FEEDS</span></div>
          {(boards?.feeds||[]).map(r=><div key={r.wallet} className="lb-mini-row"><span>{String(r.rank).padStart(3,'0')}</span><b>{shortW(r.wallet)}</b><b className="count">{r.count}</b></div>)}
          {boards&&!boards.feeds.length&&<div className="lb-mini-empty">NO FEEDS RECORDED YET.</div>}
        </div>
      </Panel>
    </div>
  </main></>;
}
