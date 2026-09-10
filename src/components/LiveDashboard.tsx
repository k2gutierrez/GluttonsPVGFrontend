'use client';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useBalance, useBlockNumber, useReadContract } from 'wagmi';
import { formatEther, type Address } from 'viem';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, ERC20_ABI, GAME_HOUR_SECONDS, NATIVE_SYMBOL, PRIZE_VAULT_ABI, ROYALTY_TREASURY_ABI, ZERO_ADDRESS } from '@/lib/constants';
import { Panel, Kicker } from './Terminal';
import { Header } from './Header';
import { TxButton } from './TxButton';
import { MorphTicker, Scramble, WeightWord } from '@/components/fx/RetroText';
import { LiveMatrix } from '@/components/LiveMatrix';
import { EndgameExperience } from '@/components/EndgameExperience';

const pct = (n: number, d: number) => d ? Math.max(0, Math.min(100, n / d * 100)) : 0;
const phaseCopy: Record<string,{eyebrow:string;line:string}> = {
  FEAST:{eyebrow:'THE FEAST',line:'FOOD IS STILL GOOD. THE CLOCK IS NOT.'},
  PLAGUE:{eyebrow:'THE PLAGUE',line:'THE LIVING ARE NOW FOOD.'},
  LS_WARNING:{eyebrow:'LAST SUPPER WARNING',line:'THE BELL IS ARMED. PREVIOUS RULES STILL APPLY.'},
  LAST_SUPPER:{eyebrow:'THE LAST SUPPER',line:'NO MORE NORMAL FEEDING. EAT WHAT REMAINS.'},
  SETTLED:{eyebrow:'FINAL VERDICT',line:'THE TABLE IS CLOSED.'},
};

export function LiveDashboard() {
  const p = useAtomValue(protocolAtom);
  const pot = useBalance({ address: CONTRACTS.prizeVault, query: { refetchInterval: 20_000 } });
  const block = useBlockNumber({ watch: false, query: { refetchInterval: 20_000 } });
  const wethAddressR = useReadContract({ address: CONTRACTS.prizeVault, abi: PRIZE_VAULT_ABI, functionName: 'getWethAddress', query: { enabled: CONTRACTS.prizeVault !== ZERO_ADDRESS } });
  const wethAddress = (wethAddressR.data || ZERO_ADDRESS) as Address;
  const wethPot = useReadContract({ address: wethAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [CONTRACTS.prizeVault], query: { enabled: wethAddress !== ZERO_ADDRESS, refetchInterval: 20_000 } });
  const gameHourSeconds = Number(p.gameHourSeconds > 0n ? p.gameHourSeconds : BigInt(GAME_HOUR_SECONDS));
  const maxSupply = Number(p.maxSupply);
  const minted = Number(p.totalMinted || p.startingPopulation);
  const S = Number(p.startingPopulation || p.totalMinted);
  const alive = Number(p.aliveCount);
  const meal = Number(p.currentMealSeconds) / gameHourSeconds;
  const bars = Number(p.completedBars);
  const totalPotWei = (pot.data?.value || 0n) + BigInt(wethPot.data || 0n);
  const potValue = pot.data || wethPot.data !== undefined ? Number(formatEther(totalPotWei)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—';
  const phase = !p.synced ? 'LIVE' : p.isSettled ? 'SETTLED' : p.currentPhase;
  const lsThreshold = Number(p.lastSupperThreshold || 0n) || Math.ceil(S * .025);
  const truceThreshold = Number(p.truceThreshold || 0n) || Math.max(2, Math.ceil(S * .01));
  const next = phase === 'FEAST'
    ? `PLAGUE ≤ ${Math.ceil(S * .5)} ALIVE OR +2H MEAL`
    : phase === 'PLAGUE'
      ? `LAST SUPPER WARNING ≤ ${lsThreshold} ALIVE OR DAY 120`
      : phase === 'LS_WARNING'
        ? 'LAST SUPPER BELL — 1H AFTER WARNING'
        : phase === 'LAST_SUPPER'
          ? alive <= truceThreshold ? `TRUCE OPEN · ${alive}/${truceThreshold} ALIVE` : `TRUCE OPENS ≤ ${truceThreshold} ALIVE`
          : 'FINAL SETTLEMENT';
  const copy = phaseCopy[phase] || {eyebrow:'LIVE PROTOCOL',line:'STAY ALIVE. HOWEVER YOU CAN.'};

  if (!p.synced) return <><Header/><main className="page-shell live-page"><Panel className="protocol-hard-sync"><Kicker>live deployment confirmed</Kicker><h1>RESTORING THE STADIUM.</h1><p>Game Start is confirmed for this GameEngine. Counters and phase stay hidden until a coherent onchain snapshot arrives.</p><div className="endgame-sync-line"><i/><span>READING PHASE · ALIVE · SUPPLY · MEAL · GAME CLOCK</span></div></Panel></main></>;

  return <><Header/><main className={`page-shell live-page phase-${phase.toLowerCase().replace('_','-')}`}>
    {p.rpcDegraded&&p.synced&&<Panel className="sync-state-banner degraded"><b>CHAIN SYNC DEGRADED</b><span>Showing the last confirmed onchain state while the RPC reconnects. Unknown values are never replaced with fake defaults.</span></Panel>}
    <EndgameExperience/>
    <div className="ambient-word ambient-a"><WeightWord word={phase==='LAST_SUPPER'?'EAT':phase==='SETTLED'?'CLOSED':'HUNGER'}/></div>
    <section className="live-hero" data-reveal>
      <div><Kicker>live protocol / public stadium</Kicker><MorphTicker/><span className="phase-eyebrow">{copy.eyebrow}</span><h1 className="live-title idle-glitch" data-text={phase}><Scramble loop>{phase}</Scramble></h1><p>{copy.line} <b>{phase==='SETTLED'?'': 'THE POT KEEPS GROWING.'}</b></p></div>
      <div className="chain-heartbeat"><i/><span>CHAIN BLOCK</span><strong>{block.data ? block.data.toString() : 'SYNCING'}</strong><small>{p.lastSuccessfulSyncAt ? `STATE ${Math.max(0,Math.floor((Date.now()-p.lastSuccessfulSyncAt)/1000))}s AGO` : 'AWAITING STATE'}</small></div>
    </section>
    <div className="state-grid">
      <Metric title="MINTED" value={maxSupply ? `${minted.toLocaleString()} / ${maxSupply.toLocaleString()}` : 'SYNCING'} bar={maxSupply?pct(minted, maxSupply):undefined}/>
      <Metric title="ALIVE" value={`${alive.toLocaleString()} / ${S || minted}`} bar={pct(alive, S || minted)}/>
      <Metric title={p.isSettled?'FINAL POT SNAPSHOT':'THE POT'} value={`${potValue} ${NATIVE_SYMBOL}`} sub={p.isSettled?'CURRENT VAULT BALANCE AFTER CLAIMS MAY FALL':`${NATIVE_SYMBOL} + WETH IN PRIZE VAULT`} pulse={!p.isSettled}/>
      <Metric title="CURRENT MEAL" value={p.isSettled?'CLOSED':`+${meal.toFixed(2)}H`} bar={p.isSettled?undefined:pct(meal, 24)}/>
      <Metric title="METABOLISM" value={`BAR ${bars}`} sub={`${p.totalNormalFeeds.toLocaleString()} VALID FEEDS`}/>
      <Metric title="NEXT" value={next} small/>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
      <Panel className="p-5 md:p-7">
        <Kicker>the machine / current state</Kicker>
        <div className="machine-bars">
          <StateBar label="SURVIVORS" value={`${alive}`} right={`${pct(alive, S || minted).toFixed(1)}%`} width={pct(alive, S || minted)}/>
          <StateBar label="FOOD STRENGTH" value={p.isSettled?'CLOSED':`+${meal.toFixed(2)}H`} right="GLOBAL" width={p.isSettled?0:pct(meal, 24)}/>
          <StateBar label="METABOLISM" value={`BAR ${bars}`} right={`${p.totalNormalFeeds.toLocaleString()} FEEDS`} width={pct(bars, 123)}/>
        </div>
        <div className="next-threshold"><span>NEXT SYSTEM RESPONSE</span><strong>{next}</strong><small>Phase and thresholds are read from GameEngine. The interface does not infer a friendlier state when the chain is unavailable.</small></div>
      </Panel>
      <Panel className="p-5 md:p-7">
        <Kicker>protocol access</Kicker>
        <div className="live-links"><Link href="/my-gluttons"><span>01</span><b>MY GLUTTONS</b><small>{p.isSettled?'Check winning shares / final inventory.':'Protect positions. Manage food.'}</small></Link><Link href="/leaderboard"><span>02</span><b>{p.isSettled?'FINAL TABLE':'LEADERBOARD'}</b><small>Public clocks, states and final positions.</small></Link><Link href="/rules"><span>03</span><b>RULES</b><small>Read the machine.</small></Link></div>
        {!p.isSettled && <div className="mt-5"><TxButton label="FLUSH WETH → POT" address={CONTRACTS.royaltyTreasury} abi={ROYALTY_TREASURY_ABI} functionName="flushWETH" className="w-full secondary-action"/></div>}
        {p.isSettled && <p className="settled-routing-note">ACTIVE POT CLOSED. POST-SETTLEMENT ROYALTIES ROUTE TO FUTURE REWARDS + PVG, NOT BACK INTO THIS GAME.</p>}
      </Panel>
    </div>
    {!p.isSettled ? <div className="mt-4 space-y-4"><LiveMatrix/></div> : <Panel className="mt-4 final-archive-note"><Kicker>final archive</Kicker><b>SURVIVAL CLOCKS ARE CLOSED.</b><span>The settlement panel above is the canonical final result. The live Matrix no longer advances after the game is closed, preventing post-settlement clock aging from rewriting the story.</span><Link href="/leaderboard" className="ghost-btn">OPEN FINAL TABLE →</Link></Panel>}
    <div className="retro-marquee" aria-hidden="true"><div>ALIVE::{alive} // POT::{potValue} // MEAL::{p.isSettled?'CLOSED':`${meal.toFixed(2)}H`} // BAR::{bars} // PHASE::{phase} // BLOCK::{block.data?.toString() || '...'} //</div></div>
  </main></>;
}
function Metric({ title, value, bar, small, sub, pulse }: { title: string; value: string; bar?: number; small?: boolean; sub?: string; pulse?: boolean }) { return <Panel className={`metric-card ${pulse ? 'pot-pulse' : ''}`}><span>{title}</span><strong className={small ? 'small' : ''}>{value}</strong>{sub && <small>{sub}</small>}{bar !== undefined && <div className="bar"><i style={{ width: `${bar}%` }}/></div>}</Panel>; }
function StateBar({ label, value, right, width }: { label: string; value: string; right: string; width: number }) { return <div className="state-row"><div><span>{label}</span><strong>{value}</strong><small>{right}</small></div><div className="bar"><i style={{ width: `${width}%` }}/></div></div>; }
