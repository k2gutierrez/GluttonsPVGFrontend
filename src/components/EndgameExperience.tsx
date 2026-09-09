'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useAtomValue } from 'jotai';
import { formatEther } from 'viem';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, GAME_ENGINE_ABI, NATIVE_SYMBOL, PRIZE_VAULT_ABI } from '@/lib/constants';
import { useEndgameTable, useSettlementEntitlement } from '@/hooks/useEndgameTable';
import { gameClock } from '@/lib/time';
import { Kicker, Panel } from './Terminal';
import { TxButton } from './TxButton';

const fmtToken = (id: number | bigint) => `#${String(id).padStart(4, '0')}`;
const shortAddress = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—';

export function EndgameExperience({ compact = false }: { compact?: boolean }) {
  const p = useAtomValue(protocolAtom);
  const { address } = useAccount();
  const table = useEndgameTable();
  const settlement = useSettlementEntitlement();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [claimedNow, setClaimedNow] = useState(false);
  const localClaimKey = address ? `gluttons:claimed:${CONTRACTS.prizeVault.toLowerCase()}:${address.toLowerCase()}` : '';

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!localClaimKey) { setClaimedNow(false); return; }
    try { setClaimedNow(window.localStorage.getItem(localClaimKey) === '1'); } catch {}
  }, [localClaimKey]);

  const gameHourSeconds = Number(p.gameHourSeconds || 3600n);
  const phase = p.isSettled ? 'SETTLED' : p.currentPhase;
  const aliveNow = Number(p.aliveCount);
  const terminalPopulation = !p.isSettled && p.gameStart > 0n && aliveNow <= 1;
  if (!terminalPopulation && !['LS_WARNING', 'LAST_SUPPER', 'SETTLED'].includes(phase)) return null;

  // One survivor ends the survival contest regardless of which macro phase was
  // previously active. Do not force the last player to wait for a warning/bell.
  if (!p.isSettled && aliveNow === 0) return <Panel className={`endgame-panel death-resolution ${compact ? 'compact' : ''}`}>
    <Kicker>final death / deterministic tiebreak</Kicker><h2>NO CLOCKS REMAIN.</h2><p>The contract is resolving the latest logical death timestamp. Exact timestamp ties resolve to the lowest token ID.</p>
    <div className="endgame-sync-line"><i/><span>{table.loading ? 'READING FINAL STATE…' : 'WAITING FOR CANONICAL SETTLEMENT'}</span></div>
  </Panel>;

  if (!p.isSettled && aliveNow === 1) {
    const sole = table.sole;
    const accurateTable = table.live.length === 1;
    return <Panel className={`endgame-panel sole-survivor ${compact ? 'compact' : ''}`}>
      <Kicker>last glutton standing</Kicker>
      <div className="last-standing-grid">
        <div><h2>ONE REMAINS.</h2><p>Everyone else is dead or consumed. Settlement gives the remaining Glutton 100% of the closed Pot.</p></div>
        <div className="last-standing-id"><span>SURVIVOR</span><strong>{sole ? fmtToken(sole.id) : 'SYNCING'}</strong><small>{sole ? shortAddress(sole.owner) : 'Reading canonical owner…'}</small></div>
      </div>
      {!compact && <TxButton label={accurateTable && sole ? 'CLOSE THE TABLE' : 'SYNCING FINAL SURVIVOR…'} successLabel="TABLE CLOSED ✓" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="settleGame" args={[[BigInt(sole?.id || 0)]]} disabled={!accurateTable || !sole || table.loading} preflight onConfirmed={table.refresh}/>} 
    </Panel>;
  }

  if (phase === 'LS_WARNING') {
    const bell = Number(p.lastSupperAt);
    const seconds = Math.max(0, bell - now);
    return <Panel className={`endgame-panel warning ${compact ? 'compact' : ''}`}>
      <div className="endgame-warning-grid">
        <div><Kicker>global warning / irreversible</Kicker><h2>THE LAST SUPPER IS COMING.</h2><p>The bell changes the legal action set. Until it rings, the previous phase continues.</p></div>
        <div className="endgame-countdown"><span>BELL IN</span><time>{gameClock(seconds, gameHourSeconds)}</time><small>FEED · FAST · POISON · KEEP FRESH REMAIN OPEN UNTIL ZERO</small></div>
      </div>
      {!compact && <div className="endgame-rule-strip"><span><b>AT THE BELL</b> Feed / Fast / Poison / Keep Fresh close permanently.</span><span><b>STAYS OPEN</b> Fresh / Rotten / Live Devour.</span><span><b>0H FASTERS</b> die at the bell.</span></div>}
    </Panel>;
  }

  if (phase === 'LAST_SUPPER') {
    const alive = Number(p.aliveCount);
    const threshold = Number(p.truceThreshold);
    const truceOpen = alive > 1 && alive <= threshold;
    const accurateTable = table.live.length === alive;

    return <Panel className={`endgame-panel truce ${truceOpen ? 'open' : 'locked'} ${compact ? 'compact' : ''}`}>
      <div className="truce-head">
        <div><Kicker>the final table / unanimous exit</Kicker><h2>{truceOpen ? 'THE TRUCE IS OPEN.' : 'THE TRUCE IS LOCKED.'}</h2><p>{truceOpen ? 'Every surviving NFT must RETIRE in the same vote epoch. Clocks keep running while players decide.' : `The Truce opens at ${threshold} surviving Glutton${threshold === 1 ? '' : 's'}. Until then, keep surviving.`}</p></div>
        <div className="truce-threshold"><span>ALIVE</span><strong>{alive}</strong><small>{truceOpen ? `THRESHOLD MET ≤ ${threshold}` : `UNLOCKS ≤ ${threshold}`}</small></div>
      </div>
      {truceOpen && <>
        <div className="truce-progress">
          <div><span>RETIRE VOTES</span><b>{table.loading && !table.live.length ? 'SYNCING' : `${table.voted} / ${alive}`}</b></div>
          <div className="bar"><i style={{ width: `${alive ? Math.min(100, table.voted / alive * 100) : 0}%` }}/></div>
          <small>{table.unanimous ? 'UNANIMOUS. THE TABLE CAN CLOSE NOW.' : `${Math.max(0, alive - table.voted)} VOTE${Math.max(0, alive - table.voted) === 1 ? '' : 'S'} STILL REQUIRED.`}</small>
        </div>
        {!compact && <div className="final-table-votes">
          {table.live.map(t => <div key={t.id} className={t.voteValid ? 'retired' : 'waiting'}><b>{fmtToken(t.id)}</b><span>{shortAddress(t.owner)}</span><strong>{t.voteValid ? 'RETIRE ✓' : 'WAITING'}</strong></div>)}
          {!accurateTable && <div className="table-read-warning">FINAL TABLE SYNCING · ONCHAIN ALIVE {alive} / READ {table.live.length}</div>}
        </div>}
        {!compact && <TxButton label={table.unanimous ? 'SETTLE UNANIMOUS TRUCE' : 'WAITING FOR N / N'} successLabel="TRUCE SETTLED ✓" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="settleGame" args={[table.live.map(t => BigInt(t.id))]} disabled={!table.unanimous || !accurateTable || table.loading} preflight onConfirmed={table.refresh}/>} 
      </>}
      {!compact && <div className="endgame-rule-strip"><span><b>DEATH / DEVOUR</b> resets the vote epoch.</span><span><b>TRANSFER</b> invalidates that NFT's old-owner vote.</span><span><b>CLOCKS</b> never pause for negotiation.</span></div>}
      {table.error && <div className="matrix-error">FINAL TABLE READ DEGRADED · {table.error}</div>}
    </Panel>;
  }

  const winner = settlement.shares > 0n;
  const totalShares = Number(settlement.totalShares);
  const single = settlement.totalShares === 1n;
  const globallyClaimed = settlement.totalShares > 0n && settlement.totalClaimedShares >= settlement.totalShares;
  const markClaimed = () => {
    setClaimedNow(true);
    if (localClaimKey) try { window.localStorage.setItem(localClaimKey, '1'); } catch {}
    void settlement.refresh();
  };

  const pctShare = settlement.totalShares > 0n ? Number(settlement.shares * 10000n / settlement.totalShares) / 100 : 0;
  return <Panel className={`endgame-panel settled ${winner ? 'winner' : 'spectator'} ${compact ? 'compact' : ''}`}>
    <Kicker>final settlement / pot closed</Kicker>
    <div className="settlement-title"><div><h2>THE TABLE IS CLOSED.</h2><p>{single ? 'One winning share closed the game.' : `${totalShares.toLocaleString()} surviving shares retired together.`}</p></div><div><span>SETTLEMENT</span><strong>{single ? 'LAST SURVIVOR / TIEBREAK' : 'UNANIMOUS TRUCE'}</strong></div></div>
    {!address ? <div className="settlement-message"><b>CONNECT A WALLET TO CHECK YOUR ENTITLEMENT.</b><span>The final result is public. Claim controls only appear for winning wallets.</span></div> : settlement.loading && settlement.totalShares === 0n ? <div className="settlement-message"><b>READING YOUR FINAL SHARE…</b></div> : winner ? <div className="winner-claim-grid">
      <div className="winner-verdict"><span>YOUR VERDICT</span><h3>YOU SURVIVED.</h3><b>{settlement.shares.toString()} / {settlement.totalShares.toString()} WINNING SHARE{settlement.shares === 1n ? '' : 'S'} · {pctShare.toFixed(2)}%</b></div>
      <div className="claim-amount"><span>YOUR CLAIM</span><strong>{formatEther(settlement.ethClaim)} {NATIVE_SYMBOL}</strong><strong>{formatEther(settlement.wethClaim)} WETH</strong><small>Snapshot amounts. PrizeVault pays in-kind.</small></div>
      <div className="claim-control">{claimedNow || (single && globallyClaimed) ? <div className="claimed-badge">CLAIM CONFIRMED ✓</div> : <TxButton label={single ? 'CLAIM THE POT' : 'CLAIM YOUR SHARE'} successLabel="POT CLAIMED ✓" address={CONTRACTS.prizeVault} abi={PRIZE_VAULT_ABI} functionName="claimPrize" preflight onConfirmed={markClaimed}/>}<small>Duplicate claims are rejected by PrizeVault.</small></div>
    </div> : <div className="settlement-message loser"><b>YOU DID NOT SURVIVE.</b><span>No claim button is shown because this wallet has 0 winning shares.</span></div>}
    {!compact && table.live.length>0 && <div className="settled-final-table"><span>FINAL SURVIVING TOKENS</span><div>{table.live.map(t=><b key={t.id}>{fmtToken(t.id)} <small>{shortAddress(t.owner)}</small></b>)}</div></div>}
    {!compact && <div className="settlement-public-stats"><span>FINAL SHARES <b>{settlement.totalShares.toString()}</b></span><span>CLAIMED SHARES <b>{settlement.totalClaimedShares.toString()}</b></span><span>TIEBREAK TOKEN <b>{settlement.tiebreakCandidate > 0n ? fmtToken(settlement.tiebreakCandidate) : 'N/A'}</b></span></div>}
    {settlement.error && <div className="matrix-error">SETTLEMENT READ DEGRADED · {settlement.error}</div>}
  </Panel>;
}
