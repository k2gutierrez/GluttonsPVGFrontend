'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { formatEther, type Address } from 'viem';
import { protocolAtom } from '@/state/game';
import {
  CONTRACTS, GAME_ENGINE_ABI, MINT_PRICE, NATIVE_SYMBOL,
  PARTNER_ERC721_ABI, PUBLIC_MAX_PER_WALLET, ZERO_ADDRESS,
} from '@/lib/constants';
import { Header } from './Header';
import { Panel, Kicker } from './Terminal';
import { PreRevealArt } from './PreRevealArt';
import { TxButton } from './TxButton';
import { FlipWord, MorphTicker, Scramble, WeightWord } from '@/components/fx/RetroText';
import { useLiveStageLatch } from '@/hooks/useLiveStageLatch';

const pct = (n: number, d: number) => d ? Math.max(0, Math.min(100, n / d * 100)) : 0;
const fmt = (s: number) => { const d = Math.max(0, s); const h = Math.floor(d / 3600); const m = Math.floor((d % 3600) / 60); const x = d % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`; };
const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;

type Community = {
  id: number;
  name: string;
  collectionAddress: Address;
  maxTotalAmountAllowed: number;
  maxPerWallet: number;
  allowed: boolean;
  amountMinted: number;
};

function normalizeCommunity(raw: any, id: number): Community {
  const a = Array.isArray(raw) ? raw : raw || {};
  return {
    id,
    name: String(a.name ?? a[0] ?? `COMMUNITY #${id}`),
    collectionAddress: String(a.collectionAddress ?? a[1] ?? ZERO_ADDRESS) as Address,
    maxTotalAmountAllowed: Number(a.maxTotalAmountAllowed ?? a[2] ?? 0),
    maxPerWallet: Number(a.maxPerWallet ?? a[3] ?? 0),
    allowed: Boolean(a.allowed ?? a[4] ?? false),
    amountMinted: Number(a.amountMinted ?? a[5] ?? 0),
  };
}

export function MintStage() {
  const p = useAtomValue(protocolAtom);
  const verifyLiveStage = useLiveStageLatch();
  const { address } = useAccount();
  const minted = Number(p.totalMinted);
  const maxSupply = Number(p.maxSupply || 2000n);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => { const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(t); }, []);
  const backstop = Number(p.startBackstop);
  const backstopReached = backstop > 0 && now >= backstop;
  const remaining = backstop > 0 ? backstop - now : 0;

  const communityRead = useReadContract({
    address: CONTRACTS.gameEngine,
    abi: GAME_ENGINE_ABI,
    functionName: 'getInvitedNftCommunities',
    query: { enabled: CONTRACTS.gameEngine !== ZERO_ADDRESS && !p.preMintEnd, refetchInterval: 5000 },
  });
  const communities = useMemo(() => {
    const data = (communityRead.data || []) as readonly any[];
    return data.map((c, i) => normalizeCommunity(c, i));
  }, [communityRead.data]);

  // UX-only invited-NFT discovery. GameEngine re-verifies holder status in preMint().
  const holdings = useReadContracts({
    contracts: communities.map(c => ({
      address: c.collectionAddress,
      abi: PARTNER_ERC721_ABI,
      functionName: 'balanceOf',
      args: [address ?? ZERO_ADDRESS],
    })) as any,
    allowFailure: true,
    query: { enabled: !!address && communities.length > 0 && !p.preMintEnd, refetchInterval: 8000 },
  });

  // Canonical per-wallet community usage. This is now readable because
  // s_amountMintPerCollection is public in the reviewed GameEngine.
  const communityWalletMints = useReadContracts({
    contracts: communities.map(c => ({
      address: CONTRACTS.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: 's_amountMintPerCollection',
      args: [address ?? ZERO_ADDRESS, c.collectionAddress],
    })) as any,
    allowFailure: true,
    query: { enabled: !!address && communities.length > 0 && !p.preMintEnd, refetchInterval: 5000 },
  });

  const balanceFor = (id: number) => {
    const index = communities.findIndex(c => c.id === id);
    const r: any = index >= 0 ? holdings.data?.[index] : undefined;
    return r?.status === 'success' ? BigInt(r.result ?? 0n) : 0n;
  };
  const walletCommunityMintedFor = (id: number) => {
    const index = communities.findIndex(c => c.id === id);
    const r: any = index >= 0 ? communityWalletMints.data?.[index] : undefined;
    return r?.status === 'success' ? BigInt(r.result ?? 0n) : 0n;
  };

  return <><Header/><main className="page-shell mint-page">
    <div className="ambient-word ambient-a"><WeightWord word={p.preMintEnd ? 'MINT' : 'ACCESS'}/></div><div className="ambient-word ambient-b"><FlipWord word="FEED"/></div>
    <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
      <Panel className="hero-panel p-6 md:p-9 lg:p-10">
        <Kicker>{p.preMintEnd ? 'public mint / phase 02' : 'community pre-mint / phase 01'}</Kicker><MorphTicker/>
        <div className="grid items-center gap-7 md:grid-cols-[1fr_.72fr]">
          <div>
            <h1 className="mint-title idle-glitch" data-text={`${maxSupply.toLocaleString()} WILL ENTER.`}><Scramble loop>{`${maxSupply.toLocaleString()} WILL ENTER.`}</Scramble><br/><span>HOW MANY WILL LEAVE?</span></h1>
            <p className="hero-sub mt-5">STAY ALIVE. HOWEVER YOU CAN.</p>
            <div className="mini-rule-grid"><span><b>01</b> 24H CLOCK</span><span><b>02</b> FEED OR FAST</span><span><b>03</b> POISON</span><span><b>04</b> DEATH = FOOD</span></div>
            <Link href="/rules" className="read-rules">READ BEFORE YOU MINT <span>OPEN RULES →</span></Link>
          </div>
          <PreRevealArt compact/>
        </div>
      </Panel>

      <Panel className="mint-console p-6 md:p-8">
        <Kicker>{p.preMintEnd ? 'public mint console' : 'community access console'}</Kicker>
        <div className="console-meter"><div className="flex justify-between"><span>MINTED</span><b>{minted.toLocaleString()} / {maxSupply.toLocaleString()}</b></div><div className="bar mt-3"><i style={{ width: `${pct(minted, maxSupply)}%` }}/></div></div>
        <div className="console-block"><span>GAME START</span>{backstop ? <strong className="countdown-color">{backstopReached ? 'BACKSTOP REACHED' : fmt(remaining)}</strong> : <strong>SELLOUT / BACKSTOP</strong>}<small>Sellout starts automatically. Backstop can be started permissionlessly.</small></div>
        {backstopReached
          ? <TxButton label="START GAME" address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="ensureStarted" onConfirmed={verifyLiveStage} className="mt-5 w-full danger-pulse"/>
          : p.preMintEnd
            ? <PublicMint/>
            : <CommunityPreMint communities={communities} balanceFor={balanceFor} walletMintedFor={walletCommunityMintedFor} connected={!!address}/>} 
        <div className="unrevealed-note">ART REMAINS UNREVEALED UNTIL GAME START.</div>
      </Panel>
    </div>

    {!p.preMintEnd && !backstopReached && <CommunityDirectory communities={communities} balanceFor={balanceFor} walletMintedFor={walletCommunityMintedFor} connected={!!address}/>} 
    <div className="retro-marquee" aria-hidden="true"><div>{p.preMintEnd ? `PUBLIC MINT // MAX 4 / WALLET // LIVE WALLET COUNTER // 0.004 ${NATIVE_SYMBOL} // 95% POT //` : 'COMMUNITY PRE-MINT // INVITED NFT HOLDERS // LIVE WALLET COUNTER // DYNAMIC PRICE //'} UNREVEALED // SELLOUT =&gt; GAME_START // 24:00:00 // FOOD GETS WORSE //</div></div>
  </main></>;
}

function PublicMint() {
  const p = useAtomValue(protocolAtom);
  const verifyLiveStage = useLiveStageLatch();
  const { address } = useAccount();
  const [qty, setQty] = useState(1);
  const walletMintRead = useReadContract({
    address: CONTRACTS.gameEngine,
    abi: GAME_ENGINE_ABI,
    functionName: 's_normalMintAmount',
    args: [address ?? ZERO_ADDRESS],
    query: { enabled: !!address && CONTRACTS.gameEngine !== ZERO_ADDRESS, refetchInterval: 4000 },
  });
  const used = Number(walletMintRead.data ?? 0n);
  const walletRemaining = Math.max(0, PUBLIC_MAX_PER_WALLET - used);
  const supplyRemaining = Math.max(0, Number(p.maxSupply || 2000n) - Number(p.totalMinted));
  const maxQty = Math.max(0, Math.min(walletRemaining, supplyRemaining));
  useEffect(() => { if (maxQty > 0 && qty > maxQty) setQty(maxQty); }, [maxQty, qty]);
  const exhausted = !!address && walletRemaining === 0;

  return <div className="mint-mode-block">
    <div className="mode-chip">PHASE 02 / PUBLIC</div>
    <div className="console-block compact"><span>PRICE / EACH</span><strong>0.004 <i>{NATIVE_SYMBOL}</i></strong><small>95% → POT / 5% → PVG</small></div>

    {!address ? <div className="eligibility-message">CONNECT WALLET TO LOAD YOUR PUBLIC MINT COUNTER.</div> : <WalletMintCounter label="YOUR PUBLIC MINTS" used={used} cap={PUBLIC_MAX_PER_WALLET}/>} 

    <Quantity value={qty} setValue={setQty} max={maxQty}/>
    <TxButton
      label={exhausted ? 'PUBLIC MINT LIMIT USED' : `MINT ${qty} GLUTTON${qty > 1 ? 'S' : ''}`}
      address={CONTRACTS.gameEngine}
      abi={GAME_ENGINE_ABI}
      functionName="mint"
      args={[BigInt(qty)]}
      value={MINT_PRICE * BigInt(qty)}
      disabled={!address || maxQty === 0 || qty > maxQty}
      onConfirmed={verifyLiveStage}
      className="mt-4 w-full"
    />
    <p className="mint-footnote">PUBLIC LIMIT: 4 GLUTTONS MAXIMUM PER WALLET. YOUR COUNTER IS READ DIRECTLY FROM <b>s_normalMintAmount(wallet)</b>. COMMUNITY PRE-MINTS USE A SEPARATE COUNTER.</p>
  </div>;
}

function CommunityPreMint({ communities, balanceFor, walletMintedFor, connected }: { communities: Community[]; balanceFor: (id:number)=>bigint; walletMintedFor:(id:number)=>bigint; connected:boolean }) {
  const p = useAtomValue(protocolAtom);
  const verifyLiveStage = useLiveStageLatch();
  const active = communities.filter(c => c.allowed && c.amountMinted < c.maxTotalAmountAllowed);
  const firstEligible = active.find(c => balanceFor(c.id) > 0n && Number(walletMintedFor(c.id)) < c.maxPerWallet);
  const [selected, setSelected] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  useEffect(() => {
    if (selected === null && firstEligible) setSelected(firstEligible.id);
  }, [selected, firstEligible?.id]);

  const c = communities.find(x => x.id === selected);
  const communityRemaining = c ? Math.max(0, c.maxTotalAmountAllowed - c.amountMinted) : 0;
  const walletUsed = c ? Number(walletMintedFor(c.id)) : 0;
  const walletRemaining = c ? Math.max(0, c.maxPerWallet - walletUsed) : 0;
  const supplyRemaining = Math.max(0, Number(p.maxSupply || 2000n) - Number(p.totalMinted));
  const maxQty = c ? Math.max(0, Math.min(walletRemaining, communityRemaining, supplyRemaining)) : 0;
  useEffect(() => { if (maxQty > 0 && qty > maxQty) setQty(maxQty); }, [maxQty, qty]);

  const holdsInvite = !!c && balanceFor(c.id) > 0n;
  const eligible = !!c && holdsInvite && c.allowed && walletRemaining > 0 && communityRemaining > 0;
  const price = p.communityMintPrice;
  const buttonLabel = !c ? 'SELECT COMMUNITY' : walletRemaining === 0 ? 'COMMUNITY MINT LIMIT USED' : `PRE-MINT ${qty} GLUTTON${qty>1?'S':''}`;

  return <div className="mint-mode-block">
    <div className="mode-chip">PHASE 01 / COMMUNITY PRE-MINT</div>
    <div className="console-block compact"><span>COMMUNITY PRICE / EACH</span><strong>{Number(formatEther(price)).toLocaleString(undefined,{maximumFractionDigits:6})} <i>{NATIVE_SYMBOL}</i></strong><small>DYNAMIC PRICE READ DIRECTLY FROM GAME ENGINE</small></div>
    {!connected ? <div className="eligibility-message">CONNECT WALLET TO CHECK INVITED NFT ACCESS AND YOUR COMMUNITY MINT COUNTER.</div> : !active.length ? <div className="eligibility-message">NO COMMUNITY IS ACTIVE RIGHT NOW.</div> : <>
      <label className="mint-select-label">SELECT INVITED COMMUNITY</label>
      <select className="mint-community-select" value={selected ?? ''} onChange={e=>{setSelected(e.target.value === '' ? null : Number(e.target.value));setQty(1)}}>
        <option value="">SELECT…</option>
        {active.map(x => {
          const used = Number(walletMintedFor(x.id));
          const holder = balanceFor(x.id) > 0n;
          const tag = !holder ? 'NOT DETECTED' : used >= x.maxPerWallet ? `USED ${used}/${x.maxPerWallet}` : `ELIGIBLE · ${x.maxPerWallet-used} LEFT`;
          return <option key={x.id} value={x.id}>{x.name} • {tag}</option>;
        })}
      </select>
      {c && <>
        <div className={`eligibility-message ${eligible?'eligible':'ineligible'}`}>
          <b>{!holdsInvite ? 'NO INVITED NFT DETECTED' : walletRemaining === 0 ? 'COMMUNITY WALLET CAP USED' : eligible ? 'INVITED NFT DETECTED / ONCHAIN CHECK READY' : 'COMMUNITY MINT UNAVAILABLE'}</b>
          <span>{c.name} · {short(c.collectionAddress)} · {communityRemaining} community mints remain</span>
        </div>
        <WalletMintCounter label={`YOUR ${c.name} MINTS`} used={walletUsed} cap={c.maxPerWallet}/>
      </>}
      <Quantity value={qty} setValue={setQty} max={maxQty}/>
      <TxButton label={buttonLabel} address={CONTRACTS.gameEngine} abi={GAME_ENGINE_ABI} functionName="preMint" args={[BigInt(qty),BigInt(c?.id ?? 0)]} value={price * BigInt(qty)} disabled={!eligible || !c || maxQty === 0 || qty > maxQty} onConfirmed={verifyLiveStage} className="mt-4 w-full"/>
      {c && <p className="mint-footnote">COMMUNITY CAP: {c.maxTotalAmountAllowed} · MAX PER WALLET: {c.maxPerWallet} · YOU USED: {walletUsed}. YOUR COUNTER IS READ DIRECTLY FROM <b>s_amountMintPerCollection(wallet, collection)</b>.</p>}
    </>}
  </div>;
}

function CommunityDirectory({ communities, balanceFor, walletMintedFor, connected }: { communities: Community[]; balanceFor:(id:number)=>bigint; walletMintedFor:(id:number)=>bigint; connected:boolean }) {
  return <Panel className="mt-4 p-5 md:p-7">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><Kicker>invited nft communities</Kicker><h2 className="font-display text-4xl uppercase md:text-5xl">PRE-MINT ACCESS</h2></div><div className="text-[9px] uppercase tracking-[.15em] text-zinc-600">{connected?'WALLET CHECK + MINT COUNTERS ACTIVE':'CONNECT TO CHECK ELIGIBILITY'}</div></div>
    <div className="community-mint-grid mt-5">{communities.length ? communities.map(c => {
      const left = Math.max(0,c.maxTotalAmountAllowed-c.amountMinted);
      const bal=balanceFor(c.id);
      const used = Number(walletMintedFor(c.id));
      const userLeft = Math.max(0,c.maxPerWallet-used);
      const holder = bal > 0n;
      return <div key={c.id} className={`community-mint-card ${c.allowed?'active':'inactive'}`}>
        <div className="flex items-start justify-between gap-3"><div><span className="community-id">#{String(c.id).padStart(2,'0')}</span><strong>{c.name}</strong><small>{short(c.collectionAddress)}</small></div><b className={c.allowed?'text-emerald-400':'text-zinc-600'}>{c.allowed?'ACTIVE':'NOT OPEN'}</b></div>
        <div className="bar mt-4"><i style={{width:`${pct(c.amountMinted,c.maxTotalAmountAllowed)}%`}}/></div>
        <div className="community-stats"><span>MINTED <b>{c.amountMinted}/{c.maxTotalAmountAllowed}</b></span><span>REMAIN <b>{left}</b></span><span>WALLET CAP <b>{c.maxPerWallet}</b></span><span>YOU <b>{connected ? `${used}/${c.maxPerWallet}` : '—'}</b></span></div>
        {connected && <div className={`community-eligibility ${holder && userLeft>0?'yes':'no'}`}>{!holder ? 'NO INVITED NFT DETECTED' : userLeft > 0 ? `ELIGIBLE · ${userLeft} MINT${userLeft===1?'':'S'} LEFT · INVITED NFT × ${bal}` : `COMMUNITY MINT LIMIT USED · ${used}/${c.maxPerWallet}`}</div>}
      </div>;
    }) : <div className="eligibility-message">NO INVITED NFT COMMUNITIES HAVE BEEN REGISTERED YET.</div>}</div>
    <p className="mt-4 text-[9px] uppercase leading-5 tracking-[.08em] text-zinc-600">Holder status and wallet mint usage are displayed before signing. GameEngine independently re-verifies holder ownership and enforces the same per-wallet counter inside preMint().</p>
  </Panel>;
}

function WalletMintCounter({label, used, cap}:{label:string;used:number;cap:number}) {
  const left = Math.max(0, cap-used);
  return <div className={`wallet-mint-counter ${left===0?'exhausted':''}`}>
    <div><span>{label}</span><strong>{used} / {cap}</strong></div>
    <div className="wallet-counter-bar"><i style={{width:`${pct(used,cap)}%`}}/></div>
    <small>{left > 0 ? `${left} MINT${left===1?'':'S'} REMAIN FOR THIS WALLET` : 'WALLET LIMIT REACHED'}</small>
  </div>;
}

function Quantity({value,setValue,max}:{value:number;setValue:(n:number)=>void;max:number}) {
  if (max <= 0) return <div className="quantity-console quantity-empty"><span>QUANTITY</span><div><b>0</b></div><small>NO MINTS REMAIN</small></div>;
  return <div className="quantity-console"><span>QUANTITY</span><div><button onClick={()=>setValue(Math.max(1,value-1))}>−</button><b>{value}</b><button onClick={()=>setValue(Math.min(max,value+1))}>+</button></div><small>MAX {max}</small></div>;
}
