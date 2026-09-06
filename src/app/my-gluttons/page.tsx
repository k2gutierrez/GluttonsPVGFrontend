'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { usePublicClient } from 'wagmi';
import { Header } from '@/components/Header';
import { Panel, Kicker } from '@/components/Terminal';
import { TxButton } from '@/components/TxButton';
import { FlipWord, Scramble, WeightWord } from '@/components/fx/RetroText';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { GluttonToken, statusOf, useOwnedGluttons } from '@/hooks/useOwnedGluttons';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, FEED_PRICE, GAME_ENGINE_ABI, GLUTTON_NFT_ABI, INSPECTOR_ABI, POISON_PRICE, POWER_PRICE, PRIZE_VAULT_ABI } from '@/lib/constants';

const clock = (seconds: number) => { const n=Math.max(0,seconds); const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };
const remaining = (t: GluttonToken, now: number) => Math.max(0, t.expiry - now);
const tone: Record<string,string> = { 'ALIVE':'text-emerald-400','HUNGRY':'text-[#ff713f]','FASTING':'text-amber-400','FINAL BITE':'text-red-500','FRESH':'text-[#ff713f]','ROTTEN':'text-zinc-500' };

export default function MyGluttons(){
  const stage=useProtocolStage();const router=useRouter();const p=useAtomValue(protocolAtom);const client=usePublicClient();
  const {tokens,loading,error,refresh,address}=useOwnedGluttons();const [selectedId,setSelectedId]=useState<number>();const [target,setTarget]=useState('');const [prey,setPrey]=useState('');const [reapIds,setReapIds]=useState('');const [now,setNow]=useState(()=>Math.floor(Date.now()/1000));const [finalTable,setFinalTable]=useState<number[]>([]);const [loadingTable,setLoadingTable]=useState(false);
  useEffect(()=>{if(stage!=='live')router.replace('/')},[stage,router]);useEffect(()=>{const t=setInterval(()=>setNow(Math.floor(Date.now()/1000)),1000);return()=>clearInterval(t)},[]);
  const survivors=useMemo(()=>tokens.filter(t=>t.visualState===1),[tokens]);const corpses=useMemo(()=>tokens.filter(t=>t.visualState===2||t.visualState===3),[tokens]);
  useEffect(()=>{if(!selectedId&&survivors[0])setSelectedId(survivors[0].id);else if(selectedId&&!survivors.some(t=>t.id===selectedId)&&survivors[0])setSelectedId(survivors[0].id)},[survivors,selectedId]);
  const selected=survivors.find(t=>t.id===selectedId);
  if(stage!=='live')return null;

  async function loadFinalTable(){
    if(!client)return;setLoadingTable(true);try{const total=Number(p.totalMinted);const live:number[]=[];for(let start=1;start<=total;start+=200){const ids=Array.from({length:Math.min(200,total-start+1)},(_,i)=>start+i);const r=await client.multicall({allowFailure:true,contracts:ids.map(id=>({address:CONTRACTS.inspector,abi:INSPECTOR_ABI,functionName:'getTokenView',args:[BigInt(id)]})) as any});r.forEach((x:any,i)=>{if(x.status==='success'&&Number(x.result?.visualState)===1)live.push(ids[i])})}setFinalTable(live)}finally{setLoadingTable(false)}
  }

  return <><Header/><main className="page-shell inventory-page">
    <div className="ambient-word ambient-a"><WeightWord word="HUNGER"/></div><div className="ambient-word ambient-b"><FlipWord word="EAT"/></div>
    <Kicker>position desk / owner cockpit</Kicker><h1 className="inventory-title idle-glitch" data-text="MY GLUTTONS"><Scramble loop>MY GLUTTONS</Scramble></h1><p className="accent-copy">EVERY ACTION EXPLAINS ITSELF BEFORE YOU SIGN.</p>
    {!address&&<Panel className="empty-state"><h2>CONNECT YOUR WALLET.</h2><p>Your positions are discovered from ERC-721 ownerOf on Curtis. No sample inventory is used.</p></Panel>}
    {address&&loading&&<Panel className="empty-state loading-grid"><h2>SCANNING {Number(p.totalMinted).toLocaleString()} TOKEN IDS…</h2><p>ERC721A is not enumerable, so the frontend batches ownerOf reads and then asks Inspector for canonical state.</p></Panel>}
    {error&&<Panel className="error-state"><b>INVENTORY READ FAILED</b><p>{error}</p><button onClick={refresh} className="ghost-btn">RETRY</button></Panel>}
    {address&&!loading&&!error&&tokens.length===0&&<Panel className="empty-state"><h2>NO GLUTTONS IN THIS WALLET.</h2><p>Connected: {address}. If you just minted or transferred, refresh after the transaction confirms.</p><button onClick={refresh} className="ghost-btn">REFRESH INVENTORY</button></Panel>}
    {tokens.length>0&&<>
      <div className="inventory-summary"><span>SURVIVORS <b>{survivors.length}</b></span><span>FRESH <b>{corpses.filter(t=>t.visualState===2).length}</b></span><span>ROTTEN <b>{corpses.filter(t=>t.visualState===3).length}</b></span><button onClick={refresh}>REFRESH ↻</button></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[.62fr_1.38fr]">
        <Panel className="p-4"><Kicker>your survivors</Kicker><div className="survivor-list">{survivors.map(t=><TokenRow key={t.id} t={t} now={now} active={selectedId===t.id} onClick={()=>setSelectedId(t.id)}/>)}</div></Panel>
        <div className="space-y-4">{selected?<SelectedPosition t={selected} all={survivors} now={now} phase={p.currentPhase} target={target} setTarget={setTarget} prey={prey} setPrey={setPrey} refresh={refresh}/>:<Panel className="empty-state"><h2>NO LIVING POSITION SELECTED.</h2></Panel>}
          <Panel className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Kicker>corpse inventory</Kicker><span className="text-[10px] text-[#ff5b2e]">THE DEAD BECOME FOOD.</span></div>{corpses.length?<div className="corpse-grid">{corpses.map(c=><CorpseCard key={c.id} corpse={c} survivors={survivors} now={now} refresh={refresh}/>)}</div>:<p className="muted-copy">No Fresh or Rotten Gluttons owned by this wallet.</p>}</Panel>
        </div>
      </div>
      <Panel className="mt-4 p-5"><Kicker>protocol tools</Kicker><div className="tool-grid"><div><b>REAP / MATERIALIZE DEATHS</b><p>Permissionless. Enter expired token IDs separated by commas. This does not create a target list.</p><div className="flex gap-2"><input value={reapIds} onChange={e=>setReapIds(e.target.value.replace(/[^0-9, ]/g,''))} placeholder="84, 551, 1102"/><TxButton label="REAP IDS" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="reap" args={[[...new Set(reapIds.split(',').map(x=>x.trim()).filter(Boolean).map(BigInt))]]} disabled={!reapIds.trim()} onConfirmed={refresh}/></div></div><div><b>FINAL TABLE</b><p>Loads canonical living token IDs only when settlement is needed, then passes the full list to settleGame.</p><button onClick={loadFinalTable} className="ghost-btn">{loadingTable?'SCANNING…':`LOAD FINAL TABLE${finalTable.length?` (${finalTable.length})`:''}`}</button>{finalTable.length>0&&<TxButton label="SETTLE TABLE" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="settleGame" args={[finalTable.map(BigInt)]} className="ml-2"/>}</div></div></Panel>
      {p.isSettled&&<Panel className="mt-4 verdict-panel p-6"><Kicker>settled</Kicker><h2>THE TABLE IS CLOSED.</h2><TxButton label="CLAIM REWARDS" address={CONTRACTS.prizeVault} abi={PRIZE_VAULT_ABI} functionName="claimPrize"/></Panel>}
    </>}
    <div className="retro-marquee"><div>OWNER::{address||'DISCONNECTED'} // SURVIVORS::{survivors.length} // CORPSES::{corpses.length} // PHASE::{p.currentPhase} // NO SAMPLE DATA //</div></div>
  </main></>
}

function TokenRow({t,now,active,onClick}:{t:GluttonToken;now:number;active:boolean;onClick:()=>void}){const st=statusOf(t,now);return <button data-fx-sound onClick={onClick} className={`token-row ${active?'active':''}`}><GluttonArt t={t}/><div><strong>#{String(t.id).padStart(4,'0')}</strong><span className={tone[st]}>{st}</span></div><time className={st==='HUNGRY'||st==='FINAL BITE'?'timer-blink':''}>{st==='FINAL BITE'?clock(t.finalBiteDeadline-now):clock(remaining(t,now))}</time></button>}

function SelectedPosition({t,all,now,phase,target,setTarget,prey,setPrey,refresh}:{t:GluttonToken;all:GluttonToken[];now:number;phase:string;target:string;setTarget:(x:string)=>void;prey:string;setPrey:(x:string)=>void;refresh:()=>void}){
  const st=statusOf(t,now);const rem=remaining(t,now);const preLS=phase!=='LAST_SUPPER'&&phase!=='SETTLED';const rescue=t.fasting||t.finalBiteDeadline>now;const canFeed=preLS&&(rem<=12*3600||rescue);const canFast=preLS&&rem<=12*3600&&!t.fasting;const canPoison=preLS&&!t.fasting&&t.finalBiteDeadline<=now&&rem>3600&&t.poisonCooldownUntil<=now;const devourPhase=phase==='PLAGUE'||phase==='LAST_SUPPER';const canDevour=devourPhase&&rem<=12*3600;const preyOptions=all.filter(x=>x.id!==t.id);
  return <Panel className="selected-position p-5 md:p-6"><div className="flex items-center justify-between"><Kicker>selected position</Kicker><span className="text-xs text-zinc-500">GLUTTON #{String(t.id).padStart(4,'0')}</span></div><div className="selected-grid"><div className="selected-art"><GluttonArt t={t}/></div><div><div className="selected-state"><div><strong className={tone[st]}>{st}</strong><small>CAN #{t.id} ACT RIGHT NOW?</small></div><time className={st==='HUNGRY'||st==='FINAL BITE'?'timer-blink':''}>{st==='FINAL BITE'?clock(t.finalBiteDeadline-now):clock(rem)}</time></div>
    <div className="action-grid"><Action title="FEED" cost="0.0006 APE" desc={canFeed?'Add current Meal hours.':phase==='LAST_SUPPER'?'Last Supper: normal Feed is closed.':'Hungry at 12H.'}><TxButton label="FEED" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="feed" args={[BigInt(t.id)]} value={FEED_PRICE} disabled={!canFeed} onConfirmed={refresh}/></Action>
      <Action title="FAST" cost="FREE" desc={canFast?'Free survival; target protection drops.':phase==='LAST_SUPPER'?'Last Supper: FAST is closed.':t.fasting?'Already Fasting.':'Hungry at 12H.'}><TxButton label="ENTER FAST" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="enterFast" args={[BigInt(t.id)]} disabled={!canFast} className="fast-btn" onConfirmed={refresh}/></Action>
      <Action title="POISON" cost="0.0004 APE" desc={canPoison?'Manual target ID. No official victim list.':t.poisonCooldownUntil>now?`Cooldown ${clock(t.poisonCooldownUntil-now)}.`:'Current state cannot Poison.'}><div className="flex gap-2"><input value={target} onChange={e=>setTarget(e.target.value.replace(/\D/g,''))} placeholder="TARGET #"/><TxButton label="POISON" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="poison" args={[BigInt(t.id),BigInt(target||0)]} value={POISON_PRICE} disabled={!canPoison||!target} onConfirmed={refresh}/></div></Action>
      <Action title="INSPECT" cost="READ ONLY" desc={`Protection: ${t.poisonProtectedUntil>now?clock(t.poisonProtectedUntil-now):'NONE'} · Cooldown: ${t.poisonCooldownUntil>now?clock(t.poisonCooldownUntil-now):'READY'}`}><TxButton label="SYNC METADATA" address={CONTRACTS.gluttonNFT} abi={GLUTTON_NFT_ABI} functionName="refreshMetadata" args={[BigInt(t.id)]} className="secondary-action"/></Action>
    </div>
    {devourPhase&&<div className="devour-panel"><div><b>DEVOUR THE LIVING</b><p>Burn one other living Glutton you own. The eater goes to 36H. The prey creates no corpse.</p></div><select value={prey} onChange={e=>setPrey(e.target.value)}><option value="">SELECT YOUR PREY</option>{preyOptions.map(x=><option key={x.id} value={x.id}>#{x.id}</option>)}</select><TxButton label="DEVOUR OWN GLUTTON" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="liveDevour" args={[BigInt(t.id),BigInt(prey||0)]} disabled={!canDevour||!prey} className="danger-pulse" onConfirmed={refresh}/></div>}
    {phase==='LAST_SUPPER'&&<div className="truce-panel"><b>THE TRUCE</b><p>RETIRE records this Glutton's current-owner vote. Any transfer/death can invalidate or reset the table.</p><TxButton label="RETIRE / VOTE TRUCE" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="voteTruce" args={[BigInt(t.id)]}/></div>}
  </div></div></Panel>
}

function CorpseCard({corpse,survivors,now,refresh}:{corpse:GluttonToken;survivors:GluttonToken[];now:number;refresh:()=>void}){const fresh=corpse.visualState===2;const [eater,setEater]=useState('');const powered=corpse.poweredUntil>now;const eligible=survivors.filter(s=>{const r=remaining(s,now);return fresh?r<=12*3600:r<3600});return <div className={`corpse-card ${fresh?'fresh':'rotten'}`}><div className="corpse-head"><GluttonArt t={corpse}/><div><strong>#{String(corpse.id).padStart(4,'0')}</strong><span>{fresh?'FRESH CORPSE':'ROTTEN / EMERGENCY FOOD'}</span></div></div>{corpse.deadAt===0?<><p className="corpse-help">Logical death detected. Materialize it before corpse actions.</p><TxButton label="REGISTER CORPSE / REAP" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="reap" args={[[BigInt(corpse.id)]]} className="w-full secondary-action" onConfirmed={refresh}/></>:<><div className="corpse-status">{fresh?<>{powered?<b>FRIDGE ON · {clock(corpse.poweredUntil-now)}</b>:<b>FRIDGE OFF</b>}<span>Refrigeration slows spoilage 4× for 24H.</span></>:<><b>EMERGENCY FOOD</b><span>Rotten is usable only at the emergency clock gate.</span></>}</div>{fresh&&<TxButton label={powered?'KEEP FRESH — ACTIVE':'KEEP FRESH'} address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="powerFridge" args={[BigInt(corpse.id)]} value={POWER_PRICE} disabled={powered} className="w-full" onConfirmed={refresh}/>}<div className="eat-row"><select value={eater} onChange={e=>setEater(e.target.value)}><option value="">SELECT EATER</option>{eligible.map(s=><option key={s.id} value={s.id}>#{s.id} · {clock(remaining(s,now))}</option>)}</select><TxButton label="EAT CORPSE" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="consumeCorpse" args={[BigInt(eater||0),BigInt(corpse.id)]} disabled={!eater} className="secondary-action" onConfirmed={refresh}/></div></>}</div>}

function GluttonArt({t}:{t:GluttonToken}){const [src,setSrc]=useState(t.image||'/art/glutton-1.png');useEffect(()=>setSrc(t.image||'/art/glutton-1.png'),[t.image]);return <img src={src} onError={()=>setSrc('/art/glutton-1.png')} alt={`Glutton #${t.id}`} />}
function Action({title,cost,desc,children}:{title:string;cost:string;desc:string;children:React.ReactNode}){return <div className="action-card"><div><strong>{title}</strong><span>{cost}</span></div><p>{desc}</p>{children}</div>}
