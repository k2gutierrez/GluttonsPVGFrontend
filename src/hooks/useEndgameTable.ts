'use client';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { useAccount } from 'wagmi';
import { useAtomValue } from 'jotai';
import type { Address } from 'viem';
import { protocolAtom } from '@/state/game';
import { readApi,jitter } from '@/lib/read-api';
import { validProtocolSnapshot,type ProtocolSnapshot,type TokenSnapshot } from '@/lib/read-model';

export type FinalTableToken={id:number;owner:Address;expiry:number;visualState:number;voteEpoch:bigint;voteOwner:Address;voteValid:boolean};
type EndgamePayload={protocol:ProtocolSnapshot;live:Array<TokenSnapshot&{status:string;voteValid:boolean}>;voted:number;indexedAt:number;tableBlock:number};
export function useEndgameTable(){
 const p=useAtomValue(protocolAtom);const{address}=useAccount();const active=p.isSettled||p.currentPhase==='SETTLED'||(p.gameStart>0n&&p.aliveCount<=1n)||(p.currentPhase==='LAST_SUPPER'&&p.truceThreshold>0n&&p.aliveCount<=p.truceThreshold);const[live,setLive]=useState<FinalTableToken[]>([]);const[loading,setLoading]=useState(false);const[error,setError]=useState<string|null>(null);const[degraded,setDegraded]=useState(false);const[lastReadAt,setLastReadAt]=useState(0);
 const version=`${Number(p.tokenStateBlock||0)}-${Number(p.indexedBlock||0)}`;
 const refresh=useCallback(async(fresh=false)=>{if(!active){setLive([]);setDegraded(false);return;}setLoading(true);try{const r=await readApi<EndgamePayload>(`/api/read/endgame?v=${version}`,{fresh,ttlMs:2500});if(!validProtocolSnapshot(r.value.protocol))throw new Error('ENDGAME_PROTOCOL_INVALID');setLive(r.value.live.filter(x=>x.owner).map(x=>({id:x.id,owner:x.owner!,expiry:x.expiry,visualState:x.status==='FRESH'?2:x.status==='ROTTEN'?3:1,voteEpoch:BigInt(x.voteEpoch||'0'),voteOwner:(x.voteOwner||'0x0000000000000000000000000000000000000000')as Address,voteValid:Boolean(x.voteValid)})));setLastReadAt(Date.now());setDegraded(r.stale);setError(r.stale?'INDEXER DEGRADED — showing last confirmed final table':null);}catch(e:any){setDegraded(true);setError(e?.message||'Final table read service unavailable.')}finally{setLoading(false)}},[active,version]);
 useEffect(()=>{if(!active){setLive([]);return;}void refresh();let dead=false,t:ReturnType<typeof setTimeout>;const loop=()=>{t=setTimeout(async()=>{if(document.visibilityState==='visible')await refresh(false);if(!dead)loop()},jitter(p.isSettled?30_000:8_000));};loop();return()=>{dead=true;clearTimeout(t)}},[active,p.isSettled,refresh]);
 const voted=useMemo(()=>live.filter(t=>t.voteValid).length,[live]);const truceOpen=p.currentPhase==='LAST_SUPPER'&&p.aliveCount>1n&&p.aliveCount<=p.truceThreshold;const complete=live.length===Number(p.aliveCount);const unanimous=!degraded&&truceOpen&&live.length>1&&complete&&voted===live.length;const sole=!degraded&&complete&&live.length===1?live[0]:undefined;const myLive=address?live.filter(t=>t.owner.toLowerCase()===address.toLowerCase()):[];const myVotes=myLive.filter(t=>t.voteValid).length;return{active,live,voted,truceOpen,unanimous,sole,myLive,myVotes,loading,error,degraded,complete,refresh:()=>refresh(true),lastReadAt};
}

export function useSettlementEntitlement(){
 const p=useAtomValue(protocolAtom);const{address}=useAccount();const[loadedAddress,setLoadedAddress]=useState<string|null>(null);const[state,setState]=useState({shares:0n,claimedShares:0n,claimableShares:0n,claimStatusKnown:false,totalShares:0n,ethSnapshot:0n,wethSnapshot:0n,totalClaimedShares:0n,tiebreakCandidate:0n,loading:false,degraded:false,error:null as string|null});
 const refresh=useCallback(async(fresh=false)=>{if(!p.isSettled||!address)return;setState(s=>({...s,loading:true,error:null}));try{const r=await readApi<any>(`/api/read/settlement/${address}`,{fresh,ttlMs:5000});setLoadedAddress(address.toLowerCase());setState({shares:BigInt(r.value.shares),claimedShares:BigInt(r.value.claimedShares||'0'),claimableShares:BigInt(r.value.claimableShares||r.value.shares||'0'),claimStatusKnown:Boolean(r.value.claimStatusKnown),totalShares:BigInt(r.value.totalShares),ethSnapshot:BigInt(r.value.ethSnapshot),wethSnapshot:BigInt(r.value.wethSnapshot),totalClaimedShares:BigInt(r.value.totalClaimedShares),tiebreakCandidate:BigInt(r.value.tiebreakCandidate||'0'),loading:false,degraded:r.stale,error:r.stale?'SETTLEMENT SNAPSHOT STALE — claim status will be re-verified onchain':null});}catch(e:any){setState(s=>({...s,loading:false,degraded:true,error:e?.message||'Could not read settlement entitlement.'}));}},[p.isSettled,address]);
 useEffect(()=>{if(!address){setLoadedAddress(null);return;}if(loadedAddress&&loadedAddress!==address.toLowerCase())setLoadedAddress(null);},[address,loadedAddress]);
 useEffect(()=>{if(!p.isSettled||!address)return;void refresh(false);},[p.isSettled,address,refresh]);
 const walletCurrent=Boolean(address&&loadedAddress===address.toLowerCase());const safeState=walletCurrent?state:{...state,shares:0n,claimedShares:0n,claimableShares:0n,claimStatusKnown:false,loading:Boolean(address)};
 const ethClaim=safeState.totalShares>0n?safeState.ethSnapshot*safeState.claimableShares/safeState.totalShares:0n;const wethClaim=safeState.totalShares>0n?safeState.wethSnapshot*safeState.claimableShares/safeState.totalShares:0n;return{...safeState,ethClaim,wethClaim,refresh:()=>refresh(true),address};
}
