'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, GAME_ENGINE_ABI, MAX_SUPPLY, MINT_PRICE, NATIVE_SYMBOL } from '@/lib/constants';
import { Header } from './Header';
import { Panel, Kicker } from './Terminal';
import { PreRevealArt } from './PreRevealArt';
import { TxButton } from './TxButton';
import { FlipWord, MorphTicker, Scramble, WeightWord } from '@/components/fx/RetroText';

const pct = (n: number, d: number) => d ? Math.max(0, Math.min(100, n / d * 100)) : 0;
const fmt = (s: number) => { const d = Math.max(0, s); const h = Math.floor(d / 3600); const m = Math.floor((d % 3600) / 60); const x = d % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`; };

export function MintStage() {
  const p = useAtomValue(protocolAtom); const minted = Number(p.totalMinted); const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => { const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(t); }, []);
  const backstop = Number(p.startBackstop); const backstopReached = backstop > 0 && now >= backstop; const remaining = backstop > 0 ? backstop - now : 0;
  return <><Header/><main className="page-shell mint-page">
    <div className="ambient-word ambient-a"><WeightWord word="MINT"/></div><div className="ambient-word ambient-b"><FlipWord word="FEED"/></div>
    <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
      <Panel className="hero-panel p-6 md:p-9 lg:p-10">
        <Kicker>mint open / pre-game</Kicker><MorphTicker/>
        <div className="grid items-center gap-7 md:grid-cols-[1fr_.72fr]">
          <div>
            <h1 className="mint-title idle-glitch" data-text="2,000 WILL ENTER."><Scramble loop>2,000 WILL ENTER.</Scramble><br/><span>HOW MANY WILL LEAVE?</span></h1>
            <p className="hero-sub mt-5">STAY ALIVE. HOWEVER YOU CAN.</p>
            <div className="mini-rule-grid"><span><b>01</b> 24H CLOCK</span><span><b>02</b> FEED OR FAST</span><span><b>03</b> POISON</span><span><b>04</b> DEATH = FOOD</span></div>
            <Link href="/rules" className="read-rules">READ BEFORE YOU MINT <span>OPEN RULES →</span></Link>
          </div>
          <PreRevealArt compact/>
        </div>
      </Panel>
      <Panel className="mint-console p-6 md:p-8">
        <Kicker>mint console</Kicker>
        <div className="console-meter"><div className="flex justify-between"><span>MINTED</span><b>{minted.toLocaleString()} / {MAX_SUPPLY.toLocaleString()}</b></div><div className="bar mt-3"><i style={{ width: `${pct(minted, MAX_SUPPLY)}%` }}/></div></div>
        <div className="console-block"><span>PRICE</span><strong>0.004 <i>{NATIVE_SYMBOL}</i></strong><small>95% → POT / 5% → PVG</small></div>
        <div className="console-block"><span>GAME START</span>{backstop ? <strong className="countdown-color">{backstopReached ? 'BACKSTOP REACHED' : fmt(remaining)}</strong> : <strong>SELLOUT / BACKSTOP</strong>}<small>Sellout starts automatically. Backstop can be started permissionlessly.</small></div>
        {!backstopReached ? <TxButton label="MINT GLUTTON" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="mint" value={MINT_PRICE} className="mt-5 w-full"/> : <TxButton label="START GAME" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="ensureStarted" className="mt-5 w-full danger-pulse"/>}
        <div className="unrevealed-note">ART REMAINS UNREVEALED UNTIL GAME START.</div>
      </Panel>
    </div>
    <div className="retro-marquee" aria-hidden="true"><div>MINT // 0.004 APE // 95% POT // UNREVEALED // SELLOUT =&gt; GAME_START // 24:00:00 // FOOD GETS WORSE //</div></div>
  </main></>;
}
