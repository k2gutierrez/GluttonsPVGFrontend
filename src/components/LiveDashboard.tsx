'use client';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useBalance, useBlockNumber } from 'wagmi';
import { formatEther } from 'viem';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, MAX_SUPPLY, NATIVE_SYMBOL, PRIZE_VAULT_ABI, ROYALTY_TREASURY_ABI } from '@/lib/constants';
import { Panel, Kicker } from './Terminal';
import { Header } from './Header';
import { TxButton } from './TxButton';
import { MorphTicker, Scramble, WeightWord } from '@/components/fx/RetroText';

const pct = (n: number, d: number) => d ? Math.max(0, Math.min(100, n / d * 100)) : 0;
export function LiveDashboard() {
  const p = useAtomValue(protocolAtom); const pot = useBalance({ address: CONTRACTS.prizeVault, query: { refetchInterval: 5000 } }); const block = useBlockNumber({ watch: true });
  const minted = Number(p.totalMinted || BigInt(MAX_SUPPLY)); const S = Number(p.startingPopulation || p.totalMinted); const alive = Number(p.aliveCount); const meal = Number(p.currentMealSeconds) / 3600; const bars = Number(p.completedBars);
  const potValue = pot.data ? Number(formatEther(pot.data.value)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—';
  const phase = p.isSettled ? 'SETTLED' : p.currentPhase; const next = phase === 'FEAST' ? `PLAGUE ≤ ${Math.ceil(S * .5)} ALIVE OR +2H MEAL` : phase === 'PLAGUE' ? `LAST SUPPER ≤ ${Math.ceil(S * .025)} ALIVE / DAY 120` : phase === 'LAST_SUPPER' ? 'TRUCE / ONE SURVIVOR' : 'VERDICT';
  return <><Header/><main className="page-shell live-page">
    <div className="ambient-word ambient-a"><WeightWord word="HUNGER"/></div>
    <section className="live-hero" data-reveal>
      <div><Kicker>live protocol / public stadium</Kicker><MorphTicker/><h1 className="live-title idle-glitch" data-text={phase}><Scramble loop>{phase}</Scramble></h1><p>FOOD GETS WORSE. <b>THE POT KEEPS GROWING.</b></p></div>
      <div className="chain-heartbeat"><i/><span>CURTIS BLOCK</span><strong>{block.data ? block.data.toString() : 'SYNCING'}</strong></div>
    </section>
    <div className="state-grid">
      <Metric title="MINTED" value={`${minted.toLocaleString()} / ${MAX_SUPPLY}`} bar={pct(minted, MAX_SUPPLY)}/>
      <Metric title="ALIVE" value={`${alive.toLocaleString()} / ${S || minted}`} bar={pct(alive, S || minted)}/>
      <Metric title="THE POT" value={`${potValue} ${NATIVE_SYMBOL}`} pulse/>
      <Metric title="CURRENT MEAL" value={`+${meal.toFixed(2)}H`} bar={pct(meal, 24)}/>
      <Metric title="METABOLISM" value={`BAR ${bars}`} sub={`${p.totalNormalFeeds.toLocaleString()} VALID FEEDS`}/>
      <Metric title="NEXT" value={next} small/>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
      <Panel className="p-5 md:p-7">
        <Kicker>the machine / current state</Kicker>
        <div className="machine-bars">
          <StateBar label="SURVIVORS" value={`${alive}`} right={`${pct(alive, S || minted).toFixed(1)}%`} width={pct(alive, S || minted)}/>
          <StateBar label="FOOD STRENGTH" value={`+${meal.toFixed(2)}H`} right="GLOBAL" width={pct(meal, 24)}/>
          <StateBar label="METABOLISM" value={`BAR ${bars}`} right={`${p.totalNormalFeeds.toLocaleString()} FEEDS`} width={pct(bars, 123)}/>
        </div>
        <div className="next-threshold"><span>NEXT SYSTEM RESPONSE</span><strong>{next}</strong><small>Protocol state is read from the deployed contracts. No fake event data is shown.</small></div>
      </Panel>
      <Panel className="p-5 md:p-7">
        <Kicker>protocol access</Kicker>
        <div className="live-links"><Link href="/my-gluttons"><span>01</span><b>MY GLUTTONS</b><small>Protect positions. Manage food.</small></Link><Link href="/rules"><span>02</span><b>RULES</b><small>Read the machine.</small></Link><a href="#inspector"><span>03</span><b>INSPECT</b><small>Canonical state by token ID.</small></a></div>
        <div className="mt-5"><TxButton label="FLUSH WETH → POT" address={CONTRACTS.royaltyTreasury} abi={ROYALTY_TREASURY_ABI} functionName="flushWETH" className="w-full secondary-action"/></div>
      </Panel>
    </div>
    {p.isSettled && <Panel className="mt-4 verdict-panel p-7"><Kicker>the table is closed</Kicker><h2>SETTLED.</h2><p>Winning wallets can pull their proportional ETH/WETH prize.</p><TxButton label="CLAIM REWARDS" address={CONTRACTS.prizeVault} abi={PRIZE_VAULT_ABI} functionName="claimPrize"/></Panel>}
    <div className="retro-marquee" aria-hidden="true"><div>ALIVE::{alive} // POT::{potValue} // MEAL::{meal.toFixed(2)}H // BAR::{bars} // PHASE::{phase} // BLOCK::{block.data?.toString() || '...'} //</div></div>
  </main></>;
}
function Metric({ title, value, bar, small, sub, pulse }: { title: string; value: string; bar?: number; small?: boolean; sub?: string; pulse?: boolean }) { return <Panel className={`metric-card ${pulse ? 'pot-pulse' : ''}`}><span>{title}</span><strong className={small ? 'small' : ''}>{value}</strong>{sub && <small>{sub}</small>}{bar !== undefined && <div className="bar"><i style={{ width: `${bar}%` }}/></div>}</Panel>; }
function StateBar({ label, value, right, width }: { label: string; value: string; right: string; width: number }) { return <div className="state-row"><div><span>{label}</span><strong>{value}</strong><small>{right}</small></div><div className="bar"><i style={{ width: `${width}%` }}/></div></div>; }
