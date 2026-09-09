'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { formatEther } from 'viem';
import { Header } from '@/components/Header';
import { Panel, Kicker } from '@/components/Terminal';
import { FlipWord, Scramble, WeightWord } from '@/components/fx/RetroText';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { protocolAtom } from '@/state/game';
import { NATIVE_SYMBOL } from '@/lib/constants';

export default function Rules(){
  const stage=useProtocolStage();const router=useRouter();const p=useAtomValue(protocolAtom);
  useEffect(()=>{if(stage==='awareness')router.replace('/')},[stage,router]);if(stage==='awareness'||stage==='syncing')return null;
  const truce=Number(p.truceThreshold||0n)||Math.max(2,Math.ceil(Number(p.startingPopulation||p.totalMinted)*.01));
  return <><Header/><main className="page-shell rules-page">
    <div className="ambient-word ambient-a"><WeightWord word="RULES"/></div><div className="ambient-word ambient-b"><FlipWord word="ROT"/></div>
    <Kicker>rules / canonical player machine</Kicker>
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]"><div><h1 className="rules-title idle-glitch" data-text="READ IT ONCE. SURVIVE IT LIVE."><Scramble loop>READ IT ONCE. SURVIVE IT LIVE.</Scramble></h1><p className="mt-3 max-w-4xl text-sm text-zinc-400">STAY ALIVE. HOWEVER YOU CAN. FOOD GETS WORSE. THE DEAD BECOME FOOD. THE LIVING TOO. THE POT KEEPS GROWING.</p></div><Panel className="p-5"><Kicker>the end</Kicker><p className="font-display text-2xl uppercase">One Glutton takes the Pot — or every survivor at the final table unanimously retires and splits it.</p></Panel></div>

    <Panel className="mt-6 p-5 md:p-7"><Kicker>the complete lifecycle</Kicker><div className="state-rule-grid">
      <RuleState name="UNREVEALED" show="Mint stages only" actions="MINT / PRE-MINT" note="Art stays unrevealed until Game Start."/>
      <RuleState name="ALIVE" show="Clock >12H" actions="READ / INSPECT" note="Normal survival state."/>
      <RuleState name="HUNGRY" show="Clock ≤12H" actions="FEED / FAST / POISON / eligible DEVOUR" note="This is the main action window."/>
      <RuleState name="FASTING" show="FAST entered" actions="FEED rescue / can be Poisoned" note="At 0H it remains alive before the Last Supper bell. Shield is DOWN."/>
      <RuleState name="FINAL BITE" show="Poison hits a Faster" actions="FEED rescue" note="1H rescue clock. At zero: death."/>
      <RuleState name="FRESH" show="Logical death" actions="EAT FRESH / KEEP FRESH before bell" note="+12H meal. Freshness begins at logical deadAt, never Reap time."/>
      <RuleState name="ROTTEN" show="24 spoil-hours" actions="EAT ROTTEN" note="Emergency food only; eater must be under 1H."/>
      <RuleState name="CONSUMED" show="Burned" actions="NONE" note="Cell remains in the Matrix as consumed / burned."/>
    </div></Panel>

    <Panel className="mt-5 p-5 md:p-7"><Kicker>phase machine / what appears and disappears</Kicker><div className="phase-state-grid">
      <Phase name="THE FEAST" trigger="GAME START" open="FEED · FAST · POISON · FRESH · ROTTEN · KEEP FRESH" closed="LIVE DEVOUR · TRUCE"/>
      <Phase name="THE PLAGUE" trigger="ALIVE ≤50% OR MEAL FIRST REACHES +2H" open="ALL FEAST ACTIONS + LIVE DEVOUR" closed="TRUCE"/>
      <Phase name="LAST SUPPER WARNING" trigger="ALIVE ≤2.5% OR DAY 120" open="PREVIOUS PHASE RULES CONTINUE FOR 1H" closed="TRUCE UNTIL THE BELL"/>
      <Phase name="THE LAST SUPPER" trigger="WARNING +1H" open="FRESH · ROTTEN · LIVE DEVOUR · TRUCE WHEN THRESHOLD MET" closed="FEED · FAST · POISON · KEEP FRESH — PERMANENTLY"/>
      <Phase name="SETTLED" trigger="1 SURVIVOR OR UNANIMOUS TRUCE / TIEBREAK" open="WINNER CLAIM / FINAL TABLE / READ-ONLY INSPECT" closed="ALL GAMEPLAY ACTIONS"/>
    </div></Panel>

    <Panel className="mt-5 p-5 md:p-7"><Kicker>poison / exact lock</Kicker><div className="grid gap-3 md:grid-cols-3"><div className="phase-card"><b>ATTACKER</b><p>Alive · not FASTING · not FINAL BITE · strictly &gt;1H. Success costs exactly −1H. NO attacker cooldown.</p></div><div className="phase-card"><b>NORMAL TARGET</b><p>Alive · unprotected · strictly &gt;1H. Remaining clock becomes max(1H, ceil(remaining/2)). Then Shield UP for 10H.</p></div><div className="phase-card"><b>FASTING TARGET</b><p>Poison does not halve the clock. It triggers FINAL BITE for exactly 1H.</p></div></div></Panel>

    <Panel className="mt-5 p-5 md:p-7"><Kicker>the truce / final table</Kicker><div className="grid gap-3 md:grid-cols-4"><div className="phase-card"><b>UNLOCK</b><p>LAST SUPPER + Alive ≤ {truce}.</p></div><div className="phase-card"><b>VOTE</b><p>Every surviving NFT records RETIRE. One vote per NFT, tied to current owner.</p></div><div className="phase-card"><b>RESET</b><p>Any death or Devour advances the epoch. A transfer invalidates that NFT’s previous owner vote.</p></div><div className="phase-card"><b>SETTLE</b><p>N/N votes closes immediately and splits the Pot by surviving shares. Clocks never pause while voting.</p></div></div></Panel>

    <Panel className="mt-5 p-5"><Kicker>money moves the same machine</Kicker><div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6"><Money a="COMMUNITY MINT" b={`${formatEther(p.communityMintPrice)} ${NATIVE_SYMBOL}`} c="DYNAMIC / 95% POT"/><Money a="PUBLIC MINT" b={`0.004 ${NATIVE_SYMBOL}`} c="95% POT / 5% PVG"/><Money a="FEED" b={`0.0006 ${NATIVE_SYMBOL}`} c="92% POT / 8% PVG"/><Money a="POISON" b={`0.0004 ${NATIVE_SYMBOL}`} c="92% POT / 8% PVG"/><Money a="KEEP FRESH" b={`0.0003 ${NATIVE_SYMBOL}`} c="24H POWER / 92% POT"/><Money a="ROYALTY" b="4%" c="ACTIVE: 7/8 POT · 1/8 PVG · SETTLED: 7/8 FUTURE REWARDS · 1/8 PVG"/></div></Panel>
    <Panel className="mt-5 p-5 md:p-7"><Kicker>trust / frontend policy</Kicker><div className="trust-rules"><span>UNKNOWN CHAIN STATE → <b>SYNCING</b>, NEVER A FAKE PRE-GAME DEFAULT.</span><span>LIVE ONCE → <b>LIVE FOREVER</b> FOR THAT GAMEENGINE DEPLOYMENT.</span><span>LEADERBOARD → <b>NO WEAKEST-TARGET FILTER</b> AND NO ONE-CLICK POISON.</span><span>REAP → <b>NO PLAYER GAMEPLAY BUTTON.</b> LOGICAL DEATH DRIVES CORPSE STATE.</span></div></Panel>
    <div className="retro-marquee"><div>FEAST // PLAGUE // WARNING // LAST SUPPER // TRUCE // LAST SURVIVOR // SETTLED // CLAIM //</div></div>
  </main></>;
}
function RuleState({name,show,actions,note}:{name:string;show:string;actions:string;note:string}){return <div className="rule-state-card"><span>{show}</span><h3>{name}</h3><b>{actions}</b><p>{note}</p></div>}
function Phase({name,trigger,open,closed}:{name:string;trigger:string;open:string;closed:string}){return <div className="phase-card"><div className="text-[9px] text-zinc-600">TRIGGER</div><div className="mt-2 text-xs text-[#ff5b2e]">{trigger}</div><div className="mt-3 font-display text-3xl">{name}</div><div className="mt-5 text-[9px] text-zinc-600">OPEN</div><p className="mt-2 text-xs leading-6">{open}</p><div className="mt-4 text-[9px] text-zinc-600">CLOSED</div><p className="mt-2 text-xs leading-6 text-zinc-500">{closed}</p></div>}
function Money({a,b,c}:{a:string;b:string;c:string}){return <div className="money-cell"><div>{a}</div><strong>{b}</strong><span>{c}</span></div>}
