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

const rules = [
  ['01 // CLOCK','24H START / 36H CAP','Hungry at 12H or less. One real hour always equals one Glutton hour.'],
  ['02 // FEED OR FAST','PAY OR TAKE THE RISK','Feed extends time. FAST is free; at zero it becomes exposed survival.'],
  ['03 // POISON','MAKE SOMEONE HUNGRIER','Enter a target token ID. A valid normal Poison cuts its remaining clock roughly in half.'],
  ['04 // DEATH = FOOD','BODIES STAY IN THE GAME','Death creates a Fresh corpse. Fresh can be eaten, refrigerated, or eventually turns Rotten.'],
  ['05 // PHASES','THE WORLD GETS WORSE','Feast → Plague → Last Supper. New dangers unlock as population and food conditions change.'],
];
export default function Rules(){
  const stage=useProtocolStage();const router=useRouter();const p=useAtomValue(protocolAtom);useEffect(()=>{if(stage==='awareness')router.replace('/')},[stage,router]);if(stage==='awareness')return null;
  return <><Header/><main className="page-shell rules-page">
    <div className="ambient-word ambient-a"><WeightWord word="RULES"/></div><div className="ambient-word ambient-b"><FlipWord word="ROT"/></div>
    <Kicker>rules / machine spec</Kicker>
    <div className="grid gap-4 lg:grid-cols-[1fr_330px]"><div><h1 className="rules-title idle-glitch" data-text="UNDERSTAND THE MACHINE IN 60 SECONDS."><Scramble loop>UNDERSTAND THE MACHINE IN 60 SECONDS.</Scramble></h1><p className="mt-3 max-w-4xl text-sm text-zinc-400">STAY ALIVE. HOWEVER YOU CAN. All minted Gluttons wake together on a real-time hunger clock. Keep yours alive while the shared Pot grows and the rules get harsher.</p></div><Panel className="p-5"><Kicker>the end</Kicker><p className="font-display text-2xl uppercase">One Glutton survives — or the final table settles under the contract rules.</p></Panel></div>

    <Panel className="mt-6 p-5 md:p-7"><Kicker>entry / two mint windows</Kicker><div className="mt-5 grid gap-3 md:grid-cols-2"><div className={`phase-card ${!p.preMintEnd&&stage==='mint'?'active-mint-phase':''}`}><div className="text-[9px] text-[#ff5b2e]">PHASE 01</div><div className="mt-3 font-display text-3xl">COMMUNITY PRE-MINT</div><p className="mt-4 text-[10px] leading-5 text-zinc-500">Invited NFT communities only. The frontend reads getInvitedNftCommunities and the dynamic s_communityMintprice, then calls preMint(amount, collectionId).</p><div className="mt-4 text-xs text-[#ff713f]">CURRENT PRICE: {formatEther(p.communityMintPrice)} APE</div></div><div className={`phase-card ${p.preMintEnd&&stage==='mint'?'active-mint-phase':''}`}><div className="text-[9px] text-[#ff5b2e]">PHASE 02</div><div className="mt-3 font-display text-3xl">PUBLIC MINT</div><p className="mt-4 text-[10px] leading-5 text-zinc-500">Once the Owner permanently ends Pre-Mint, the interface switches to mint(amount). Public price is fixed at 0.004 APE and the contract caps standard public mints at 4 per wallet.</p><div className="mt-4 text-xs text-[#ff713f]">0.004 APE / MAX 4 PUBLIC MINTS PER WALLET</div></div></div></Panel>

    <div className="mt-5 grid gap-3 md:grid-cols-5">{rules.map(([k,h,p])=><Panel key={k} className="rule-card p-4"><div className="text-[9px] text-[#ff5b2e]">{k}</div><div className="mt-5 font-display text-2xl uppercase">{h}</div><p className="mt-4 text-[10px] leading-5 text-zinc-500">{p}</p></Panel>)}</div>
    <Panel className="mt-5 p-5 md:p-7"><Kicker>how the game escalates</Kicker><div className="bar phase-bar"><i style={{width:'74%'}}/></div><div className="mt-6 grid gap-3 md:grid-cols-3"><Phase n="01" name="THE FEAST" trigger="GAME START" actions="FEED / FAST / POISON / FRESH / ROTTEN / KEEP FRESH"/><Phase n="02" name="THE PLAGUE" trigger="ALIVE ≤ 50% OR MEAL = +2H" actions="ALL FEAST ACTIONS + DEVOUR THE LIVING"/><Phase n="03" name="LAST SUPPER" trigger="FINAL POPULATION CONDITIONS" actions="FRESH / ROTTEN / DEVOUR / TRUCE"/></div></Panel>
    <Panel className="mt-5 p-5"><Kicker>money moves the same machine</Kicker><div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6"><Money a="COMMUNITY MINT" b={`${formatEther(p.communityMintPrice)} APE`} c="DYNAMIC / 95% POT"/><Money a="PUBLIC MINT" b="0.004 APE" c="95% POT / 5% PVG"/><Money a="FEED" b="0.0006 APE" c="92% POT / 8% PVG"/><Money a="POISON" b="0.0004 APE" c="92% POT / 8% PVG"/><Money a="KEEP FRESH" b="0.0003 APE" c="24H FRIDGE / 92% POT"/><Money a="ROYALTY" b="4%" c="7/8 PLAYER / 1/8 PVG"/></div></Panel>
    <div className="retro-marquee"><div>PRE-MINT // PUBLIC MINT // FEED // FAST // POISON // FRESH // ROTTEN // KEEP FRESH // DEVOUR // TRUCE //</div></div>
  </main></>
}
function Phase({n,name,trigger,actions}:{n:string,name:string,trigger:string,actions:string}){return <div className="phase-card"><div className="text-[9px] text-[#ff5b2e]">{n}</div><div className="mt-3 font-display text-3xl">{name}</div><div className="mt-6 text-[9px] text-zinc-600">TRIGGER</div><div className="mt-2 text-xs text-[#ff5b2e]">{trigger}</div><div className="mt-5 text-[9px] text-zinc-600">ACTIONS</div><p className="mt-2 text-xs leading-6">{actions}</p></div>}
function Money({a,b,c}:{a:string,b:string,c:string}){return <div className="money-cell"><div>{a}</div><strong>{b}</strong><span>{c}</span></div>}
