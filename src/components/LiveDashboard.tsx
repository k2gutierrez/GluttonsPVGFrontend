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

const pct = (n: number, d: number) => d ? Math.max(0, Math.min(100, n / d * 100)) : 0;
export function LiveDashboard() {
  const p = useAtomValue(protocolAtom); const pot = useBalance({ address: CONTRACTS.prizeVault, query: { refetchInterval: 5000 } }); const block = useBlockNumber({ watch: true });
  const wethAddressR = useReadContract({ address: CONTRACTS.prizeVault, abi: PRIZE_VAULT_ABI, functionName: 'getWethAddress', query: { enabled: CONTRACTS.prizeVault !== ZERO_ADDRESS } });
  const wethAddress = (wethAddressR.data || ZERO_ADDRESS) as Address;
  const wethPot = useReadContract({ address: wethAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [CONTRACTS.prizeVault], query: { enabled: wethAddress !== ZERO_ADDRESS, refetchInterval: 5000 } });
  const maxSupply = Number(p.maxSupply || 2000n); const minted = Number(p.totalMinted || p.startingPopulation); const S = Number(p.startingPopulation || p.totalMinted); const alive = Number(p.aliveCount); const meal = Number(p.currentMealSeconds) / GAME_HOUR_SECONDS; const bars = Number(p.completedBars);
  const totalPotWei = (pot.data?.value || 0n) + BigInt(wethPot.data || 0n);
  const potValue = pot.data || wethPot.data !== undefined ? Number(formatEther(totalPotWei)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—';
  const phase = p.isSettled ? 'SETTLED' : p.currentPhase; const next = phase === 'FEAST' ? `PLAGUE ≤ ${Math.ceil(S * .5)} ALIVE OR +2H MEAL` : phase === 'PLAGUE' ? `LAST SUPPER WARNING ≤ ${Math.ceil(S * .025)} ALIVE / DAY 120` : phase === 'LS_WARNING' ? 'LAST SUPPER BELL IN 1H' : phase === 'LAST_SUPPER' ? 'TRUCE / ONE SURVIVOR' : 'VERDICT';
  return <><Header/><main className="page-shell live-page">
    <div className="ambient-word ambient-a"><WeightWord word="HUNGER"/></div>
    <section className="live-hero" data-reveal>
      <div><Kicker>live protocol / public stadium</Kicker><MorphTicker/><h1 className="live-title idle-glitch" data-text={phase}><Scramble loop>{phase}</Scramble></h1><p>FOOD GETS WORSE. <b>THE POT KEEPS GROWING.</b></p></div>
      <div className="chain-heartbeat"><i/><span>CHAIN BLOCK</span><strong>{block.data ? block.data.toString() : 'SYNCING'}</strong></div>
    </section>
    <div className="state-grid">
      <Metric title="MINTED" value={`${minted.toLocaleString()} / ${maxSupply.toLocaleString()}`} bar={pct(minted, maxSupply)}/>
      <Metric title="ALIVE" value={`${alive.toLocaleString()} / ${S || minted}`} bar={pct(alive, S || minted)}/>
      <Metric title="THE POT" value={`${potValue} ${NATIVE_SYMBOL}`} sub="ETH + WETH IN PRIZE VAULT" pulse/>
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
        <div className="live-links"><Link href="/my-gluttons"><span>01</span><b>MY GLUTTONS</b><small>Protect positions. Manage food.</small></Link><Link href="/leaderboard"><span>02</span><b>LEADERBOARD</b><small>Longest clocks. Public survival status.</small></Link><Link href="/rules"><span>03</span><b>RULES</b><small>Read the machine.</small></Link></div>
        <div className="mt-5"><TxButton label="FLUSH WETH → POT" address={CONTRACTS.royaltyTreasury} abi={ROYALTY_TREASURY_ABI} functionName="flushWETH" className="w-full secondary-action"/></div>
      </Panel>
    </div>
    <div className="mt-4 space-y-4"><LiveMatrix/></div>
    {p.isSettled && <Panel className="mt-4 verdict-panel p-7"><Kicker>the table is closed</Kicker><h2>SETTLED.</h2><p>Winning wallets can pull their proportional ETH/WETH prize.</p><TxButton label="CLAIM REWARDS" address={CONTRACTS.prizeVault} abi={PRIZE_VAULT_ABI} functionName="claimPrize"/></Panel>}
    <div className="retro-marquee" aria-hidden="true"><div>ALIVE::{alive} // POT::{potValue} // MEAL::{meal.toFixed(2)}H // BAR::{bars} // PHASE::{phase} // BLOCK::{block.data?.toString() || '...'} //</div></div>
  </main></>;
}
function Metric({ title, value, bar, small, sub, pulse }: { title: string; value: string; bar?: number; small?: boolean; sub?: string; pulse?: boolean }) { return <Panel className={`metric-card ${pulse ? 'pot-pulse' : ''}`}><span>{title}</span><strong className={small ? 'small' : ''}>{value}</strong>{sub && <small>{sub}</small>}{bar !== undefined && <div className="bar"><i style={{ width: `${bar}%` }}/></div>}</Panel>; }
function StateBar({ label, value, right, width }: { label: string; value: string; right: string; width: number }) { return <div className="state-row"><div><span>{label}</span><strong>{value}</strong><small>{right}</small></div><div className="bar"><i style={{ width: `${width}%` }}/></div></div>; }
