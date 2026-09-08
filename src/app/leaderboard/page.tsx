'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { Kicker, Panel } from '@/components/Terminal';
import { stadiumRemaining, usePublicStadium } from '@/hooks/usePublicStadium';
import { gameClock } from '@/lib/time';

const clock = gameClock;
const stateLabel: Record<string,string> = { ALIVE:'ALIVE',HUNGRY:'HUNGRY',FASTING:'FASTING',FINAL_BITE:'FINAL BITE' };

export default function LeaderboardPage(){
  const { list, scanned, totalMinted, loading, error } = usePublicStadium();
  const now=Math.floor(Date.now()/1000);
  const alive=list.filter(t=>['ALIVE','HUNGRY','FASTING','FINAL_BITE'].includes(t.status)).sort((a,b)=>stadiumRemaining(b,now)-stadiumRemaining(a,now)||a.id-b.id);
  return <><Header/><main className="page-shell leaderboard-page">
    <Kicker>public survival ranking / longest clocks first</Kicker><h1 className="inventory-title">SURVIVAL BOARD</h1><p className="accent-copy">STATUS CREATES ATTENTION. TARGETING STILL REQUIRES A DECISION.</p>
    <Panel className="p-5 md:p-7">
      <div className="board-head"><div><h2>TOP CLOCKS</h2><p>{loading?'Progressively syncing': 'Rotating live reads'} · {Math.min(scanned,totalMinted).toLocaleString()} / {totalMinted.toLocaleString()} minted IDs read.</p></div><Link href="/" className="ghost-btn">← LIVE STADIUM</Link></div>
      {error&&<div className="matrix-error">RPC READ DEGRADED · {error}</div>}
      <div className="survival-table full">
        <div className="survival-row heading"><span>RANK</span><span>GLUTTON</span><span>CLOCK</span><span>STATE</span><span>SHIELD</span><span>OWNER</span><span/></div>
        {alive.map((t,i)=>{const shield=t.fasting?'DOWN':t.poisonProtectedUntil>now?`UP ${clock(t.poisonProtectedUntil-now)}`:'DOWN';return <div key={t.id} className="survival-row"><span>{String(i+1).padStart(3,'0')}</span><strong>#{String(t.id).padStart(4,'0')}</strong><time>{clock(stadiumRemaining(t,now))}</time><b className={`board-state state-text-${t.status.toLowerCase().replace('_','-')}`}>{stateLabel[t.status]}</b><span>{shield}</span><span className="board-owner">{t.owner?`${t.owner.slice(0,6)}…${t.owner.slice(-4)}`:'—'}</span><Link prefetch={false} href={`/inspect?token=${t.id}`} className="mini-inspect">INSPECT</Link></div>})}
      </div>
      <p className="board-policy">Ranking is intentionally fixed to longest remaining clock first. There is no weakest, Fasting-only, vulnerable-only, or best-target filter.</p>
    </Panel>
  </main></>;
}
