'use client';

import Link from 'next/link';
import { Kicker, Panel } from '@/components/Terminal';
import { StadiumToken, stadiumRemaining, usePublicStadium } from '@/hooks/usePublicStadium';
import { gameClock } from '@/lib/time';

const clock = gameClock;

const label: Record<string,string> = {
  UNMINTED: 'UNMINTED', LOADING: 'SYNCING', ALIVE: 'ALIVE', HUNGRY: 'HUNGRY', FASTING: 'FASTING',
  FINAL_BITE: 'FINAL BITE', FRESH: 'FRESH CORPSE', ROTTEN: 'ROTTEN', CONSUMED: 'CONSUMED / BURNED',
};

function shield(t: StadiumToken, now: number) {
  if (!['ALIVE','HUNGRY','FASTING','FINAL_BITE'].includes(t.status)) return 'N/A';
  if (t.fasting) return 'DOWN';
  const left = Math.max(0, t.poisonProtectedUntil - now);
  return left > 0 ? `UP ${clock(left)}` : 'DOWN';
}

export function LiveMatrix({ compactBoard = true }: { compactBoard?: boolean }) {
  const { list, scanned, totalMinted, loading, error, batchSize } = usePublicStadium();
  const now = Math.floor(Date.now() / 1000);
  const living = list.filter(t => ['ALIVE','HUNGRY','FASTING','FINAL_BITE'].includes(t.status));
  const top = [...living].sort((a,b) => stadiumRemaining(b, now) - stadiumRemaining(a, now) || a.id - b.id).slice(0,10);
  const counts = list.reduce<Record<string,number>>((acc,t) => { acc[t.status]=(acc[t.status]||0)+1; return acc; },{});

  return <>
    <Panel className="stadium-matrix-panel p-5 md:p-7">
      <div className="matrix-head">
        <div><Kicker>the organism / starting population</Kicker><h2>LIVE GLUTTON MATRIX</h2><p>One fixed cell per token ID. Death changes the cell; consumption burns it out. The grid never reorders.</p></div>
        <div className="matrix-sync"><span>{loading ? 'INITIAL SYNC' : 'ROTATING LIVE READ'}</span><strong>{Math.min(scanned,totalMinted).toLocaleString()} / {totalMinted.toLocaleString()}</strong><small>{batchSize} IDs / RPC page</small></div>
      </div>
      {error && <div className="matrix-error">RPC READ DEGRADED · {error}</div>}
      <div className="matrix-legend" aria-label="Matrix legend">
        {['ALIVE','HUNGRY','FASTING','FINAL_BITE','FRESH','ROTTEN','CONSUMED','UNMINTED'].map(k => <span key={k}><i className={`matrix-dot state-${k.toLowerCase().replace('_','-')}`}/>{label[k]}</span>)}
      </div>
      <div className="glutton-matrix" role="grid" aria-label="Glutton live state matrix">
        {list.map(t => {
          const life = stadiumRemaining(t, now);
          const title = `#${String(t.id).padStart(4,'0')} · ${label[t.status]}${life>0?` · ${clock(life)}`:''}${t.loaded?` · SHIELD ${shield(t,now)}`:''}`;
          const cellClass=`matrix-cell state-${t.status.toLowerCase().replace('_','-')}`;
          if (t.status==='UNMINTED'||t.status==='LOADING'||t.status==='CONSUMED') return <span key={t.id} title={title} aria-label={title} className={cellClass} data-token={t.id}/>;
          return <Link prefetch={false} key={t.id} href={`/inspect?token=${t.id}`} title={title} aria-label={title} className={cellClass} data-token={t.id}/>;
        })}
      </div>
      <div className="matrix-counts">
        <span>ALIVE <b>{(counts.ALIVE||0)+(counts.HUNGRY||0)+(counts.FASTING||0)+(counts.FINAL_BITE||0)}</b></span>
        <span>HUNGRY <b>{counts.HUNGRY||0}</b></span>
        <span>FASTING <b>{counts.FASTING||0}</b></span>
        <span>FINAL BITE <b>{counts.FINAL_BITE||0}</b></span>
        <span>FRESH <b>{counts.FRESH||0}</b></span>
        <span>ROTTEN <b>{counts.ROTTEN||0}</b></span>
        <span>CONSUMED <b>{counts.CONSUMED||0}</b></span>
      </div>
    </Panel>

    {compactBoard && <Panel className="survival-board-panel p-5 md:p-7">
      <div className="board-head"><div><Kicker>survival board / top clocks</Kicker><h2>WHO HAS THE MOST TIME?</h2></div><Link href="/leaderboard" className="ghost-btn">FULL LEADERBOARD →</Link></div>
      <div className="survival-table compact">
        <div className="survival-row heading"><span>RANK</span><span>GLUTTON</span><span>CLOCK</span><span>STATE</span><span>SHIELD</span></div>
        {top.map((t,i) => <Link prefetch={false} href={`/inspect?token=${t.id}`} key={t.id} className="survival-row"><span>{String(i+1).padStart(2,'0')}</span><strong>#{String(t.id).padStart(4,'0')}</strong><time>{clock(stadiumRemaining(t,now))}</time><b className={`board-state state-text-${t.status.toLowerCase().replace('_','-')}`}>{label[t.status]}</b><span>{shield(t,now)}</span></Link>)}
        {top.length===0 && <div className="board-empty">SYNCING SURVIVAL POSITIONS…</div>}
      </div>
      <p className="board-policy">Public state. No weakest-target sort. No vulnerable-only filter. No one-click Poison from the board.</p>
    </Panel>}
  </>;
}
