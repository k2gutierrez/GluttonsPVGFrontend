'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { usePublicClient, useReadContract } from 'wagmi';
import { Header } from '@/components/Header';
import { Panel, Kicker } from '@/components/Terminal';
import { TxButton } from '@/components/TxButton';
import { EndgameExperience } from '@/components/EndgameExperience';
import { FlipWord, Scramble, WeightWord } from '@/components/fx/RetroText';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { GluttonToken, effectiveVisualState, isGameplayFresh, isLogicallyDead, statusOf, useOwnedGluttons } from '@/hooks/useOwnedGluttons';
import { protocolAtom } from '@/state/game';
import { ASSETS, CONTRACTS, FEED_PRICE, GAME_ENGINE_ABI, GAME_HOUR_SECONDS, GLUTTON_NFT_ABI, INSPECTOR_ABI, NATIVE_SYMBOL, POISON_PRICE, POWER_PRICE } from '@/lib/constants';
import { gameClock } from '@/lib/time';

const remaining = (t: GluttonToken, now: number) => Math.max(0, t.expiry - now);
const tone: Record<string,string> = { ALIVE:'text-emerald-400', HUNGRY:'text-[#ff713f]', FASTING:'text-amber-400', 'FINAL BITE':'text-red-500', FRESH:'text-[#ff713f]', ROTTEN:'text-zinc-500' };

function currentSpoilQ4(t: GluttonToken, now: number, gameHour: number, bellAt: number) {
  const rottenThreshold = 24 * gameHour * 4;
  let spoil = Math.max(0, t.spoilQ4 || 0);
  const deathAt = t.deadAt || (t.finalBiteDeadline > 0 && t.finalBiteDeadline <= now ? t.finalBiteDeadline : t.expiry);
  if (!deathAt || spoil >= rottenThreshold) return spoil;
  const lastCheck = t.spoilCheckpoint || deathAt;
  if (now <= lastCheck) return spoil;
  const powerEnd = bellAt > 0 && t.poweredUntil > bellAt ? bellAt : t.poweredUntil;
  const elapsed = now - lastCheck;
  if (powerEnd > lastCheck) {
    if (now <= powerEnd) spoil += elapsed;
    else spoil += Math.max(0, powerEnd - lastCheck) + Math.max(0, now - powerEnd) * 4;
  } else spoil += elapsed * 4;
  return Math.min(rottenThreshold, spoil);
}

function corpseFreshness(t: GluttonToken, now: number, gameHour: number, bellAt: number) {
  const threshold = 24 * gameHour * 4;
  const spoil = currentSpoilQ4(t, now, gameHour, bellAt);
  const unitsLeft = Math.max(0, threshold - spoil);
  const effectivePowerEnd = bellAt > 0 && t.poweredUntil > bellAt ? bellAt : t.poweredUntil;
  const fridgeLeft = Math.max(0, effectivePowerEnd - now);
  const secondsToRot = unitsLeft <= fridgeLeft ? unitsLeft : fridgeLeft + Math.ceil(Math.max(0, unitsLeft - fridgeLeft) / 4);
  return { pct: Math.max(0, Math.min(100, (unitsLeft / threshold) * 100)), secondsToRot, fridgeLeft };
}

export default function MyGluttons(){
  const stage = useProtocolStage();
  const router = useRouter();
  const p = useAtomValue(protocolAtom);
  const gameHour = Number(p.gameHourSeconds > 0n ? p.gameHourSeconds : BigInt(GAME_HOUR_SECONDS));
  const bellAt = Number(p.lastSupperAt || 0n);
  const plagueUnlocked = p.startingPopulation > 0n && (p.aliveCount <= (p.startingPopulation + 1n) / 2n || p.currentMealSeconds <= 2n * BigInt(gameHour));
  const {
    tokens, walletBalance, scannedCount, totalMinted, hasMore, pageSize,
    loading, loadingMore, refreshing, error, loadMore, refresh, refreshIds,
    rescan, address,
  } = useOwnedGluttons();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const deathSyncBusy = useRef(false);
  const [selectedId, setSelectedId] = useState<number>();
  const [prey, setPrey] = useState('');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => { if (stage !== 'live' && stage !== 'syncing') router.replace('/'); }, [stage, router]);
  useEffect(() => { const timer = setInterval(() => setNow(Math.floor(Date.now()/1000)),1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const el=loadMoreRef.current;
    if(!el||!hasMore||loading||loadingMore)return;
    const obs=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting)loadMore()},{rootMargin:'500px 0px'});
    obs.observe(el);return()=>obs.disconnect();
  },[hasMore,loading,loadingMore,loadMore,scannedCount]);

  useEffect(() => {
    if (deathSyncBusy.current) return;
    const due=tokens.filter(t=>t.visualState===1&&isLogicallyDead(t,now)).slice(0,pageSize).map(t=>t.id);
    if(!due.length)return;
    deathSyncBusy.current=true;void refreshIds(due).finally(()=>{deathSyncBusy.current=false});
  },[tokens,now,pageSize,refreshIds]);

  useEffect(() => {
    if(p.currentPhase!=='LAST_SUPPER')return;
    const ids=tokens.filter(t=>t.visualState===1&&t.fasting&&t.expiry<=now).map(t=>t.id);
    if(ids.length)void refreshIds(ids.slice(0,pageSize));
  },[p.currentPhase,tokens,now,pageSize,refreshIds]);

  // After settlement, gameplay clocks are irrelevant. Preserve final-table positions
  // from the settlement accounting bit instead of letting raw expiry time make a
  // winner appear to die again in the UI. Tiebreak winners are surfaced by the
  // settlement verdict above because their death was necessarily materialized.
  const survivors=useMemo(()=>p.isSettled?tokens.filter(t=>!t.deathSettled):tokens.filter(t=>t.visualState===1&&!isLogicallyDead(t,now)),[tokens,now,p.isSettled]);
  const corpses=useMemo(()=>p.isSettled?tokens.filter(t=>t.deathSettled):tokens.filter(t=>t.visualState===2||t.visualState===3||isLogicallyDead(t,now)),[tokens,now,p.isSettled]);
  useEffect(()=>{if(!selectedId&&survivors[0])setSelectedId(survivors[0].id);else if(selectedId&&!survivors.some(t=>t.id===selectedId))setSelectedId(survivors[0]?.id)},[survivors,selectedId]);
  const selected=survivors.find(t=>t.id===selectedId);

  if(stage==='syncing'||!p.synced)return <><Header/><main className="page-shell inventory-page"><Panel className="error-state loading-grid"><Kicker>chain state</Kicker><b>SYNCING PROTOCOL</b><p>Waiting for an authoritative GameEngine read. Inventory will not guess the stage.</p></Panel></main></>;
  if(stage!=='live')return null;

  return <><Header/><main className={`page-shell inventory-page phase-${p.currentPhase.toLowerCase().replace('_','-')}`}>
    <div className="ambient-word ambient-a"><WeightWord word={p.isSettled?'CLOSED':'HUNGER'}/></div><div className="ambient-word ambient-b"><FlipWord word={p.currentPhase==='LAST_SUPPER'?'EAT':'SURVIVE'}/></div>
    <Kicker>position desk / owner cockpit</Kicker><h1 className="inventory-title idle-glitch" data-text="MY GLUTTONS"><Scramble loop>MY GLUTTONS</Scramble></h1><p className="accent-copy">EVERY ACTION EXPLAINS ITSELF BEFORE YOU SIGN.</p>
    <EndgameExperience compact/>
    {p.currentPhase==='LAST_SUPPER'&&!p.isSettled&&<Panel className="inventory-phase-lock"><b>LAST SUPPER ACTION LOCK</b><span>FEED · FAST · POISON · KEEP FRESH ARE PERMANENTLY CLOSED. FRESH · ROTTEN · LIVE DEVOUR · TRUCE REMAIN.</span></Panel>}
    {!address&&<Panel className="empty-state"><h2>CONNECT YOUR WALLET.</h2><p>Your positions are discovered from ERC-721 ownership on the active deployment. No sample inventory is used.</p></Panel>}
    {address&&loading&&<Panel className="empty-state loading-grid"><h2>LOADING WALLET INVENTORY…</h2><p>Scanning the active chain in {pageSize}-token pages. Large wallets load progressively while the interface remains usable.</p></Panel>}
    {error&&<Panel className="error-state"><b>INVENTORY READ DEGRADED</b><p>{error}</p><button onClick={rescan} className="ghost-btn">RETRY / RESCAN</button></Panel>}
    {address&&!loading&&!error&&walletBalance===0&&<Panel className="empty-state"><h2>NO GLUTTONS IN THIS WALLET.</h2><p>Connected: {address}. A transfer or mint can take a block to appear.</p><button onClick={rescan} className="ghost-btn">RESCAN INVENTORY</button></Panel>}
    {address&&!loading&&!error&&walletBalance>0&&tokens.length===0&&hasMore&&<div ref={loadMoreRef}><Panel className="empty-state loading-grid"><h2>SEARCHING TOKEN RANGE…</h2><p>This wallet owns {walletBalance.toLocaleString()} Gluttons. Scanned {scannedCount.toLocaleString()} / {totalMinted.toLocaleString()} minted IDs in safe {pageSize}-token pages.</p><button onClick={loadMore} disabled={loadingMore} className="ghost-btn">{loadingMore?'SCANNING…':`SCAN NEXT ${pageSize}`}</button></Panel></div>}
    {tokens.length>0&&<>
      <div className="inventory-summary"><span>WALLET <b>{walletBalance.toLocaleString()}</b></span><span>LOADED <b>{tokens.length.toLocaleString()}</b></span><span>SCANNED <b>{scannedCount.toLocaleString()} / {totalMinted.toLocaleString()}</b></span><span>SURVIVORS* <b>{survivors.length}</b></span><span>FRESH* <b>{corpses.filter(t=>isGameplayFresh(t,now)).length}</b></span><span>ROTTEN* <b>{corpses.filter(t=>!isGameplayFresh(t,now)).length}</b></span><button onClick={refresh} disabled={refreshing}>{refreshing?'REFRESHING…':'REFRESH LOADED ↻'}</button><button onClick={rescan}>FULL RESCAN</button></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[.62fr_1.38fr]">
        <Panel className="p-4"><Kicker>{p.isSettled?'final owned positions':'your survivors'}</Kicker><div className="survivor-list">{survivors.map(t=><TokenRow key={t.id} t={t} now={now} gameHour={gameHour} settled={p.isSettled} active={selectedId===t.id} onClick={()=>setSelectedId(t.id)}/>)}</div>{!survivors.length&&<p className="muted-copy">No living Gluttons owned by this wallet.</p>}</Panel>
        <div className="space-y-4">{selected?<SelectedPosition t={selected} all={survivors} now={now} phase={p.currentPhase} gameHour={gameHour} plagueUnlocked={plagueUnlocked} truceThreshold={Number(p.truceThreshold)} prey={prey} setPrey={setPrey} refreshIds={refreshIds}/>:<Panel className="empty-state"><h2>{p.isSettled?'NO LIVING POSITION IN THIS WALLET.':'NO LIVING POSITION SELECTED.'}</h2></Panel>}
          <Panel className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Kicker>corpse inventory</Kicker><span className="text-[10px] text-[#ff5b2e]">THE DEAD BECOME FOOD.</span></div>{corpses.length?<div className="corpse-grid">{corpses.map(c=><CorpseCard key={c.id} corpse={c} survivors={survivors} now={now} gameHour={gameHour} bellAt={bellAt} phase={p.currentPhase} refreshIds={refreshIds}/>)}</div>:<p className="muted-copy">No Fresh or Rotten Gluttons owned by this wallet.</p>}</Panel>
        </div>
      </div>
      <div ref={loadMoreRef} className="mt-4"><Panel className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><Kicker>inventory pagination</Kicker><p className="muted-copy">Loaded {tokens.length.toLocaleString()} of {walletBalance.toLocaleString()} wallet Gluttons · scanned IDs {scannedCount.toLocaleString()} / {totalMinted.toLocaleString()}.</p><p className="muted-copy">* State counts describe loaded inventory until the scan completes.</p></div>{hasMore?<button onClick={loadMore} disabled={loadingMore} className="ghost-btn">{loadingMore?'SCANNING NEXT PAGE…':`LOAD NEXT ${pageSize}`}</button>:<b className="text-emerald-400 text-xs">SCAN COMPLETE</b>}</div></Panel></div>
    </>}
    <div className="retro-marquee"><div>OWNER::{address||'DISCONNECTED'} // LOADED::{tokens.length}/{walletBalance} // SURVIVORS*::{survivors.length} // CORPSES*::{corpses.length} // PHASE::{p.currentPhase} // CHAIN-FIRST //</div></div>
  </main></>;
}

function TokenRow({t,now,gameHour,settled,active,onClick}:{t:GluttonToken;now:number;gameHour:number;settled:boolean;active:boolean;onClick:()=>void}){
  const st=statusOf(t,now,gameHour);return <button data-fx-sound onClick={onClick} className={`token-row ${active?'active':''}`}><GluttonArt t={t}/><div><strong>#{String(t.id).padStart(4,'0')}</strong><span className={settled?'text-emerald-400':tone[st]}>{settled?'FINALIST':st}</span></div><time className={!settled&&(st==='HUNGRY'||st==='FINAL BITE')?'timer-blink':''}>{settled?'CLOSED':st==='FINAL BITE'?gameClock(t.finalBiteDeadline-now,gameHour):gameClock(remaining(t,now),gameHour)}</time></button>;
}

type PoisonTargetInfo={id:number;owner:string;visualState:number;expiry:number;isHungry:boolean;poisonProtectedUntil:number;finalBiteDeadline:number;fasting:boolean};

function SelectedPosition({t,all,now,phase,gameHour,plagueUnlocked,truceThreshold,prey,setPrey,refreshIds}:{t:GluttonToken;all:GluttonToken[];now:number;phase:string;gameHour:number;plagueUnlocked:boolean;truceThreshold:number;prey:string;setPrey:(x:string)=>void;refreshIds:(ids:number[])=>Promise<void>}){
  const st=statusOf(t,now,gameHour);const rem=remaining(t,now);const gameplayOpen=phase!=='SETTLED';const preLS=gameplayOpen&&phase!=='LAST_SUPPER';const rescue=t.fasting||t.finalBiteDeadline>now;const displayState=phase==='SETTLED'?'FINALIST':st;
  const canFeed=preLS&&(rem<=12*gameHour||rescue);const canFast=preLS&&rem<=12*gameHour&&!t.fasting;const canPoison=preLS&&!t.fasting&&t.finalBiteDeadline<=now&&rem>gameHour;
  const devourPhase=gameplayOpen&&(phase==='PLAGUE'||phase==='LAST_SUPPER'||(phase==='LS_WARNING'&&plagueUnlocked));const canDevour=devourPhase&&rem<=12*gameHour;const preyOptions=all.filter(x=>x.id!==t.id);const refreshSelf=()=>refreshIds([t.id]);
  return <Panel className="selected-position p-5 md:p-6"><div className="flex items-center justify-between"><Kicker>selected position</Kicker><span className="text-xs text-zinc-500">GLUTTON #{String(t.id).padStart(4,'0')}</span></div><div className="selected-grid"><div className="selected-art"><GluttonArt t={t}/></div><div><div className="selected-state"><div><strong className={phase==='SETTLED'?'text-emerald-400':tone[st]}>{displayState}</strong><small>{phase==='SETTLED'?'FINAL READ-ONLY POSITION':'CAN THIS GLUTTON ACT RIGHT NOW?'}</small></div><time className={phase!=='SETTLED'&&(st==='HUNGRY'||st==='FINAL BITE')?'timer-blink':''}>{phase==='SETTLED'?'CLOSED':st==='FINAL BITE'?gameClock(t.finalBiteDeadline-now,gameHour):gameClock(rem,gameHour)}</time></div>
    {phase!=='SETTLED'&&<div className="action-grid">
      <Action title="FEED" cost={`0.0006 ${NATIVE_SYMBOL}`} desc={canFeed?'Add the current Meal, capped at 36H.':phase==='LAST_SUPPER'?'CLOSED AT THE LAST SUPPER BELL.':'Unlocks at 12H or less; rescue states may Feed.'}><TxButton label={phase==='LAST_SUPPER'?'FEED CLOSED':'FEED'} address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="feed" args={[BigInt(t.id)]} value={FEED_PRICE} disabled={!canFeed} onConfirmed={refreshSelf}/></Action>
      <Action title="FAST" cost="FREE" desc={canFast?'Enter FAST. Poison protection drops immediately.':phase==='LAST_SUPPER'?'CLOSED AT THE LAST SUPPER BELL.':t.fasting?'Already Fasting.':'Unlocks at 12H or less.'}><TxButton label={phase==='LAST_SUPPER'?'FAST CLOSED':'ENTER FAST'} address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="enterFast" args={[BigInt(t.id)]} disabled={!canFast} className="fast-btn" onConfirmed={refreshSelf}/></Action>
      <PoisonTargetControl attacker={t} now={now} phase={phase} gameHour={gameHour} attackerCanPoison={canPoison} onConfirmed={(targetId)=>refreshIds([t.id,targetId])}/>
      <Action title="TOKEN STATUS" cost="READ ONLY" desc={`Poison Shield: ${t.fasting?'DOWN':t.poisonProtectedUntil>now?`UP · ${gameClock(t.poisonProtectedUntil-now,gameHour)}`:'DOWN'}`}><div className="grid gap-2 sm:grid-cols-2"><Link href={`/inspect?token=${t.id}`} className="ghost-btn text-center">FULL INSPECT</Link><TxButton label="SYNC METADATA" address={CONTRACTS.gluttonNFT} abi={GLUTTON_NFT_ABI} functionName="refreshMetadata" args={[BigInt(t.id)]} className="secondary-action"/></div></Action>
    </div>}
    {phase==='SETTLED'&&<div className="readonly-final-card"><b>GAMEPLAY CLOSED</b><span>This token is shown for final ownership and result context only. No survival action can execute after settlement.</span><Link href={`/inspect?token=${t.id}`} className="ghost-btn text-center">INSPECT FINAL TOKEN</Link></div>}
    {devourPhase&&<div className="devour-panel"><div><b>DEVOUR THE LIVING</b><p>Burn one other living Glutton you own. The eater goes to 36H. The prey creates no corpse.</p></div><select value={prey} onChange={e=>setPrey(e.target.value)}><option value="">SELECT YOUR PREY</option>{preyOptions.map(x=><option key={x.id} value={x.id}>#{x.id}</option>)}</select><TxButton label="DEVOUR OWN GLUTTON" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="liveDevour" args={[BigInt(t.id),BigInt(prey||0)]} disabled={!canDevour||!prey} className="danger-pulse" onConfirmed={()=>refreshIds([t.id,Number(prey)])}/></div>}
    {phase==='LAST_SUPPER'&&<TruceVoteCard tokenId={t.id} owner={t.owner} threshold={truceThreshold}/>} 
  </div></div></Panel>;
}

function TruceVoteCard({tokenId,owner,threshold}:{tokenId:number;owner:string;threshold:number}){
  const p=useAtomValue(protocolAtom);const vote=useReadContract({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_truceVotes',args:[BigInt(tokenId)],query:{refetchInterval:4000}});const epoch=useReadContract({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_truceEpoch',query:{refetchInterval:4000}});
  const arr=Array.isArray(vote.data)?vote.data:[];const valid=BigInt((arr[0] as bigint|undefined)||0n)===BigInt(epoch.data||0n)&&String(arr[1]||'').toLowerCase()===owner.toLowerCase();const open=p.aliveCount>1n&&p.aliveCount<=BigInt(threshold||0);
  return <div className={`truce-panel ${open?'open':'locked'}`}><div><b>THE TRUCE</b><p>{open?'RETIRE records this NFT’s current-owner vote. N/N surviving NFTs must vote in the same epoch. Clocks keep running.':`LOCKED UNTIL ${threshold} SURVIVORS OR FEWER.`}</p></div><TxButton label={!open?'TRUCE LOCKED':valid?'RETIRE VOTE CAST ✓':'RETIRE / VOTE TRUCE'} successLabel="RETIRE VOTE CAST ✓" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="voteTruce" args={[BigInt(tokenId)]} disabled={!open||valid} onConfirmed={()=>{void vote.refetch();void epoch.refetch();}}/></div>;
}

function PoisonTargetControl({attacker,now,phase,gameHour,attackerCanPoison,onConfirmed}:{attacker:GluttonToken;now:number;phase:string;gameHour:number;attackerCanPoison:boolean;onConfirmed:(targetId:number)=>void}){
  const client=usePublicClient();const [target,setTarget]=useState('');const [info,setInfo]=useState<PoisonTargetInfo|null>(null);const [checking,setChecking]=useState(false);const [readError,setReadError]=useState<string|null>(null);const [poisonFlash,setPoisonFlash]=useState<{targetId:number;before:number;after:number;shield:number;finalBite:number;wasFasting:boolean}|null>(null);
  useEffect(()=>{setTarget('');setInfo(null);setReadError(null);setPoisonFlash(null)},[attacker.id]);
  useEffect(()=>{if(!client||!target){setInfo(null);setReadError(null);setChecking(false);return;}const id=Number(target);if(!Number.isSafeInteger(id)||id<=0){setInfo(null);setReadError('INVALID TARGET ID');setChecking(false);return;}setInfo(null);setReadError(null);setChecking(true);let dead=false;const read=async(first=false)=>{if(first)setChecking(true);try{const [view,state]:any[]=await Promise.all([client.readContract({address:CONTRACTS.inspector,abi:INSPECTOR_ABI,functionName:'getTokenView',args:[BigInt(id)]}),client.readContract({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_tokenStates',args:[BigInt(id)]})]);if(dead)return;const arr=Array.isArray(state)?state:[];setInfo({id,owner:String(view.owner),visualState:Number(view.visualState),expiry:Number(view.expiry),isHungry:Boolean(view.isHungry),poisonProtectedUntil:Number(arr[1]||0),finalBiteDeadline:Number(arr[2]||0),fasting:Boolean(arr[7])});setReadError(null)}catch(e:any){if(dead)return;setInfo(null);setReadError(e?.shortMessage||'TARGET NOT FOUND / BURNED')}finally{if(first&&!dead)setChecking(false)}};const timer=setTimeout(()=>void read(true),180);const poll=setInterval(()=>void read(false),5000);return()=>{dead=true;clearTimeout(timer);clearInterval(poll)}},[client,target]);
  const targetRemain=info?Math.max(0,info.expiry-now):0;const shieldRemain=info?Math.max(0,info.poisonProtectedUntil-now):0;const isSelf=Boolean(info&&info.id===attacker.id);const finalBiteActive=Boolean(info&&info.finalBiteDeadline>now);const finalBiteExpired=Boolean(info&&info.finalBiteDeadline>0&&info.finalBiteDeadline<=now);const deadTarget=Boolean(info&&(info.visualState===2||info.visualState===3||finalBiteExpired||(!info.fasting&&targetRemain<=0)));const protectedTarget=Boolean(info&&!info.fasting&&!finalBiteActive&&!deadTarget&&shieldRemain>0);const clockTooLow=Boolean(info&&!info.fasting&&!finalBiteActive&&!deadTarget&&targetRemain<=gameHour);const validTarget=Boolean(info&&!isSelf&&!deadTarget&&!finalBiteActive&&!protectedTarget&&!clockTooLow);
  let targetStatus='ENTER TARGET ID',buttonLabel='POISON',statusClass='idle',detail='Manual token ID. No official victim list.';if(target&&checking){targetStatus='READING TARGET…';buttonLabel='CHECKING TARGET';statusClass='checking';detail='Reading canonical state before a wallet transaction is allowed.'}else if(target&&readError){targetStatus='TARGET UNAVAILABLE';buttonLabel='INVALID TARGET';statusClass='blocked';detail='Token does not exist, was burned, or could not be read.'}else if(info){if(isSelf){targetStatus='SELF TARGET';buttonLabel='CANNOT POISON SELF';statusClass='blocked';detail='Choose another Glutton.'}else if(deadTarget){targetStatus='TARGET DEAD';buttonLabel='TARGET DEAD';statusClass='blocked';detail='Dead Gluttons cannot receive Poison.'}else if(finalBiteActive){targetStatus='FINAL BITE';buttonLabel='CANNOT POISON';statusClass='blocked';detail='This Glutton is already in Final Bite.'}else if(info.fasting){targetStatus='FASTING — VULNERABLE';buttonLabel='POISON';statusClass='vulnerable';detail='FAST drops the Poison shield. A successful hit triggers a 1H Final Bite.'}else if(protectedTarget){targetStatus='PROTECTED';buttonLabel='TARGET PROTECTED';statusClass='protected';detail='Shield is UP. Wait for it to fall; the life clock keeps running.'}else if(clockTooLow){targetStatus='CLOCK TOO LOW';buttonLabel='CANNOT POISON';statusClass='blocked';detail='Normal Poison requires the target to have more than 1H remaining.'}else{targetStatus='VULNERABLE';buttonLabel='POISON';statusClass='vulnerable';detail='Shield is DOWN. A final contract simulation runs before the wallet opens.'}}
  if(!attackerCanPoison){if(phase==='LAST_SUPPER'||phase==='SETTLED')buttonLabel='POISON CLOSED';else if(attacker.fasting)buttonLabel='FASTING CANNOT POISON';else if(attacker.finalBiteDeadline>now)buttonLabel='FINAL BITE';else if(remaining(attacker,now)<=gameHour)buttonLabel='ATTACKER CLOCK TOO LOW'}
  const handlePoisonConfirmed=async()=>{const targetId=info?.id||Number(target);const before=targetRemain;const wasFasting=Boolean(info?.fasting);onConfirmed(targetId);if(!client||!targetId)return;await new Promise(r=>setTimeout(r,700));try{const [view,state]:any[]=await Promise.all([client.readContract({address:CONTRACTS.inspector,abi:INSPECTOR_ABI,functionName:'getTokenView',args:[BigInt(targetId)]}),client.readContract({address:CONTRACTS.gameEngine,abi:GAME_ENGINE_ABI,functionName:'s_tokenStates',args:[BigInt(targetId)]})]);const arr=Array.isArray(state)?state:[];const after=Math.max(0,Number(view.expiry)-Math.floor(Date.now()/1000));const shield=Math.max(0,Number(arr[1]||0)-Math.floor(Date.now()/1000));const finalBite=Math.max(0,Number(arr[2]||0)-Math.floor(Date.now()/1000));setPoisonFlash({targetId,before,after,shield,finalBite,wasFasting});setTimeout(()=>setPoisonFlash(null),5000)}catch{setPoisonFlash({targetId,before,after:Math.max(0,Math.floor(before/2)),shield:0,finalBite:wasFasting?gameHour:0,wasFasting});setTimeout(()=>setPoisonFlash(null),5000)}};
  const canSubmit=attackerCanPoison&&validTarget&&!checking&&!readError;
  return <Action title="POISON" cost={`0.0004 ${NATIVE_SYMBOL}`} desc={attackerCanPoison?'Lock a target ID. Read its clock + shield before signing.':'Current attacker state cannot Poison.'}><div className="poison-lock">{poisonFlash&&<div className="poison-success" role="status"><small>POISON SUCCESSFUL</small><strong>#{String(poisonFlash.targetId).padStart(4,'0')} HIT</strong>{poisonFlash.wasFasting?<><span>FINAL BITE TRIGGERED</span><time>{gameClock(poisonFlash.finalBite||gameHour,gameHour)}</time><b>FEED OR DIE.</b></>:<><span>TARGET CLOCK</span><time>{gameClock(poisonFlash.before,gameHour)} → {gameClock(poisonFlash.after,gameHour)}</time><span>POISON SHIELD</span><b>UP · {gameClock(poisonFlash.shield,gameHour)}</b></>}<em>YOUR CLOCK −1H</em></div>}<div className="poison-target-input"><input value={target} onChange={e=>setTarget(e.target.value.replace(/\D/g,''))} placeholder="TARGET TOKEN ID" inputMode="numeric"/><span>PUBLIC READ // NO TARGET LIST</span></div>{target&&<div className={`target-lock-card ${statusClass}`}><div className="target-lock-head"><div><small>TARGET LOCK</small><strong>#{String(info?.id||Number(target)||0).padStart(4,'0')}</strong></div><b>{targetStatus}</b></div>{info&&<div className="target-timers"><div><span>LIFE CLOCK</span><time className={!deadTarget&&targetRemain<=gameHour?'timer-blink':''}>{deadTarget?'DEAD':gameClock(targetRemain,gameHour)}</time></div><div><span>POISON SHIELD</span><time>{deadTarget?'N/A':info.fasting?'DOWN':shieldRemain>0?`UP · ${gameClock(shieldRemain,gameHour)}`:'DOWN'}</time></div></div>}<p>{detail}</p></div>}<TxButton label={buttonLabel} successLabel="POISON HIT ✓" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="poison" args={[BigInt(attacker.id),BigInt(target||0)]} value={POISON_PRICE} disabled={!canSubmit} preflight onConfirmed={handlePoisonConfirmed}/></div></Action>;
}

function CorpseCard({corpse,survivors,now,gameHour,bellAt,phase,refreshIds}:{corpse:GluttonToken;survivors:GluttonToken[];now:number;gameHour:number;bellAt:number;phase:string;refreshIds:(ids:number[])=>Promise<void>}){
  const fresh=isGameplayFresh(corpse,now);const [eater,setEater]=useState('');const settled=phase==='SETTLED';const lastSupper=phase==='LAST_SUPPER';const effectivePowerEnd=bellAt>0&&corpse.poweredUntil>bellAt?bellAt:corpse.poweredUntil;const powered=effectivePowerEnd>now&&!lastSupper;const freshness=corpseFreshness(corpse,now,gameHour,bellAt);const eligible=survivors.filter(s=>{const r=remaining(s,now);return fresh?r<=12*gameHour:r<gameHour});const refreshCorpse=()=>refreshIds([corpse.id]);
  return <div className={`corpse-card ${fresh?'fresh':'rotten'} ${settled?'readonly':''}`}><div className="corpse-head"><GluttonArt t={corpse}/><div><strong>#{String(corpse.id).padStart(4,'0')}</strong><span>{fresh?'FRESH CORPSE':'ROTTEN / EMERGENCY FOOD'}</span></div></div>{fresh&&<div className="freshness-panel"><div className="freshness-head"><span>FRESHNESS</span><b>{freshness.pct.toFixed(0)}%</b></div><div className="freshness-bar"><i style={{width:`${freshness.pct}%`}}/></div><div className="freshness-times"><div><span>ROTS IN</span><time>{gameClock(freshness.secondsToRot,gameHour)}</time></div><div><span>FRIDGE</span><time>{lastSupper?'DISABLED':powered?`ON · ${gameClock(freshness.fridgeLeft,gameHour)}`:'OFF'}</time></div></div></div>}
    <div className="corpse-status">{settled?<><b>GAME CLOSED</b><span>Final corpse state is read-only after settlement.</span></>:fresh?<>{lastSupper?<b>FRIDGE CLOSED AT THE BELL</b>:powered?<b>FRIDGE ACTIVE · {gameClock(freshness.fridgeLeft,gameHour)}</b>:<b>FRIDGE OFF</b>}<span>{lastSupper?'Fresh remains edible, but KEEP FRESH is permanently closed.':'KEEP FRESH slows rot 4× and never resets freshness. Any active power is capped by the Last Supper bell.'}</span></>:<><b>EMERGENCY FOOD</b><span>Rotten can only be consumed by an eater under the &lt;1H emergency gate.</span></>}</div>
    {!settled&&<>{fresh&&!lastSupper&&<TxButton label={powered?'KEEP FRESH — ACTIVE':'KEEP FRESH'} successLabel="FRIDGE ACTIVATED ✓" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="powerFridge" args={[BigInt(corpse.id)]} value={POWER_PRICE} disabled={powered} className="w-full" onConfirmed={refreshCorpse}/>}<div className="eat-explainer"><b>{fresh?'EAT THIS FRESH CORPSE':'EAT ROTTEN — EMERGENCY'}</b><span>{fresh?'Gives +12H to one Hungry Glutton you own. The corpse is permanently consumed.':'Sets an eligible emergency eater to +2H. The corpse is permanently consumed.'}</span></div><div className="eat-row"><select value={eater} onChange={e=>setEater(e.target.value)}><option value="">SELECT {fresh?'HUNGRY ':''}EATER</option>{eligible.map(s=><option key={s.id} value={s.id}>#{s.id} · {gameClock(remaining(s,now),gameHour)}</option>)}</select><TxButton label={fresh?'EAT FRESH':'EAT ROTTEN'} successLabel="CORPSE CONSUMED ✓" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="consumeCorpse" args={[BigInt(eater||0),BigInt(corpse.id)]} disabled={!eater} className="secondary-action" onConfirmed={()=>refreshIds([corpse.id,Number(eater)])}/></div></>}
  </div>;
}

function GluttonArt({t}:{t:GluttonToken}){const visualState=effectiveVisualState(t);const fallback=visualState===2?ASSETS.fallbackFresh:visualState===3?ASSETS.fallbackRotten:ASSETS.fallbackAlive;const desired=visualState!==t.visualState?fallback:(t.image||fallback);const [src,setSrc]=useState(desired);useEffect(()=>setSrc(desired),[desired]);return <img src={src} onError={()=>setSrc(fallback)} alt={`Glutton #${t.id}`}/>}
function Action({title,cost,desc,children}:{title:string;cost:string;desc:string;children:React.ReactNode}){return <div className="action-card"><div><strong>{title}</strong><span>{cost}</span></div><p>{desc}</p>{children}</div>}
