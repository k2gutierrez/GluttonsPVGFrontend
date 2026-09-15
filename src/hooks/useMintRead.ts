'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Address } from 'viem';
import { jitter, readApi } from '@/lib/read-api';

export type MintCommunity = {id:number;name:string;collectionAddress:Address;maxTotalAmountAllowed:number;maxPerWallet:number;allowed:boolean;amountMinted:number};
type WalletRow={id:number;balance:string;minted:string};

export function useMintRead(address?:Address){
  const [communities,setCommunities]=useState<MintCommunity[]>([]);const [normalMinted,setNormalMinted]=useState(0);const [walletRows,setWalletRows]=useState<WalletRow[]>([]);const [loadedAddress,setLoadedAddress]=useState<string|null>(null);const [checkedIds,setCheckedIds]=useState<number[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [stale,setStale]=useState(false);
  const loadCommunities=useCallback(async(fresh=false)=>{const c=await readApi<{communities:MintCommunity[]}>('/api/read/communities',{fresh,ttlMs:8000,persist:false});setCommunities(c.value.communities||[]);return c.stale},[]);
  const loadWallet=useCallback(async(fresh=false)=>{if(!address){setNormalMinted(0);setWalletRows([]);setCheckedIds([]);setLoadedAddress(null);return false;}const w=await readApi<{normalMinted:string;communities:WalletRow[];checkedCommunityIds?:number[]}>(`/api/read/mint-wallet/${address}`,{fresh,ttlMs:15000,persist:true});setNormalMinted(Number(BigInt(w.value.normalMinted||'0')));setWalletRows(w.value.communities||[]);setLoadedAddress(address.toLowerCase());setCheckedIds(w.value.checkedCommunityIds||w.value.communities?.map(x=>x.id)||[]);return w.stale},[address]);
  const refresh=useCallback(async(fresh=false)=>{setLoading(true);try{const [a,b]=await Promise.all([loadCommunities(fresh),loadWallet(fresh)]);setStale(a||b);setError(null);}catch(e:any){setError(e?.message||'Mint read service unavailable.')}finally{setLoading(false)}},[loadCommunities,loadWallet]);
  useEffect(()=>{void refresh()},[refresh]);
  // Only the shared community list polls. Per-wallet eligibility is intentionally NOT polled:
  // it is refreshed on connect, community config change, manual/confirmed mint, and contract re-verifies at execution.
  useEffect(()=>{let dead=false,t:any;const loop=()=>{t=setTimeout(async()=>{if(document.visibilityState==='visible'){try{const s=await loadCommunities();setStale(x=>x||s)}catch{}}if(!dead)loop()},jitter(20_000));};loop();return()=>{dead=true;clearTimeout(t)}},[loadCommunities]);
  const communityKey=useMemo(()=>communities.map(c=>`${c.id}:${c.collectionAddress}:${c.allowed}`).join('|'),[communities]);
  useEffect(()=>{if(address&&communityKey)void loadWallet(false).catch(()=>{})},[address,communityKey,loadWallet]);
  const walletCurrent=!address||loadedAddress===address.toLowerCase();const effectiveRows=walletCurrent?walletRows:[];const effectiveChecked=walletCurrent?checkedIds:[];const map=useMemo(()=>new Map(effectiveRows.map(r=>[r.id,r])),[effectiveRows]);const checked=useMemo(()=>new Set(effectiveChecked),[effectiveChecked]);const balanceFor=useCallback((id:number)=>BigInt(map.get(id)?.balance||'0'),[map]);const walletMintedFor=useCallback((id:number)=>BigInt(map.get(id)?.minted||'0'),[map]);const checkedFor=useCallback((id:number)=>checked.has(id),[checked]);
  return{communities,normalMinted:walletCurrent?normalMinted:0,balanceFor,walletMintedFor,checkedFor,loading:loading||Boolean(address&&!walletCurrent),error:stale?'READ MODEL DEGRADED — showing last confirmed mint eligibility':error,refresh:()=>refresh(true)};
}
