'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useAtomValue } from 'jotai';
import type { Address } from 'viem';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, GAME_ENGINE_ABI, GAME_HOUR_SECONDS, GLUTTON_NFT_ABI, INSPECTOR_ABI, ZERO_ADDRESS } from '@/lib/constants';
import { metadataImage } from '@/lib/metadata';
import { readContractRetry, resilientMulticall, rpcCircuitState } from '@/lib/rpc';

export type GluttonToken = {
  id: number;
  owner: Address;
  visualState: number;
  expiry: number;
  isHungry: boolean;
  tokenUri: string;
  image: string;
  poisonProtectedUntil: number;
  finalBiteDeadline: number;
  deadAt: number;
  spoilCheckpoint: number;
  poweredUntil: number;
  spoilQ4: number;
  fasting: boolean;
  deathSettled: boolean;
};

// Keep every RPC payload deliberately small. A large wallet is a valid
// stress-test case on Curtis, so inventory discovery is progressive rather than
// one giant multicall.
export const INVENTORY_PAGE_SIZE = 50;
const okResult = (r: any) => r?.status === 'success' ? r.result : undefined;

// GameEngine.getVisualState() remains the canonical Fresh/Rotten source.
// A loaded token can cross a clock boundary between RPC reads. Canonical v1.3
// keeps FASTING alive at 0H pre-Last-Supper; an elapsed Final Bite is death.
// Normal non-Fasting expiry is logical death even before Reap/accounting sync.
export function isLogicallyDead(t: GluttonToken, now = Math.floor(Date.now() / 1000)) {
  if (t.visualState === 2 || t.visualState === 3) return true;
  if (t.visualState !== 1) return false;
  if (t.finalBiteDeadline > 0 && now >= t.finalBiteDeadline) return true;
  if (t.fasting) return false;
  return t.expiry > 0 && now >= t.expiry;
}

export function effectiveVisualState(t: GluttonToken, now = Math.floor(Date.now() / 1000)) {
  if (t.visualState === 2 || t.visualState === 3) return t.visualState;
  // Until Inspector is re-read, an expired living snapshot is optimistically
  // treated as Fresh. Canonical hydration immediately follows in the page.
  if (isLogicallyDead(t, now)) return 2;
  return t.visualState;
}

export function isGameplayFresh(t: GluttonToken, now = Math.floor(Date.now() / 1000)) {
  return effectiveVisualState(t, now) === 2;
}

export function statusOf(t: GluttonToken, now = Math.floor(Date.now() / 1000), gameHourSeconds = GAME_HOUR_SECONDS) {
  const visualState = effectiveVisualState(t, now);
  if (visualState === 2) return 'FRESH';
  if (visualState === 3) return 'ROTTEN';
  if (t.finalBiteDeadline > now) return 'FINAL BITE';
  if (t.fasting) return 'FASTING';
  if (t.expiry > now && (t.expiry - now) <= 12 * gameHourSeconds) return 'HUNGRY';
  return 'ALIVE';
}

export function useOwnedGluttons() {
  const { address } = useAccount();
  const client = usePublicClient();
  const p = useAtomValue(protocolAtom);
  const [tokens, setTokens] = useState<GluttonToken[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [nextTokenId, setNextTokenId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestLock = useRef(false);
  const sessionRef = useRef(0);

  const supplySource = p.gameStart > 0n && p.startingPopulation > 0n ? p.startingPopulation : p.totalMinted;
  const totalMinted = Math.max(0, Number(supplySource));
  const hasMore = nextTokenId <= totalMinted;

  const hydrateIds = useCallback(async (ids: number[]) => {
    if (!client || ids.length === 0) return [] as GluttonToken[];
    const [views, states] = await Promise.all([
      resilientMulticall(client, ids.map(id => ({ address: CONTRACTS.inspector, abi: INSPECTOR_ABI, functionName: 'getTokenView', args: [BigInt(id)] }))),
      resilientMulticall(client, ids.map(id => ({ address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: 's_tokenStates', args: [BigInt(id)] }))),
    ]);
    const raw: GluttonToken[] = [];
    ids.forEach((id, i) => {
      const v: any = okResult(views[i]);
      const s: any = okResult(states[i]);
      if (!v) return;
      const arr = Array.isArray(s) ? s : [];
      raw.push({
        id, owner: v.owner as Address, visualState: Number(v.visualState), expiry: Number(v.expiry), isHungry: Boolean(v.isHungry),
        tokenUri: '', image: '', poisonProtectedUntil: Number(arr[1] || 0), finalBiteDeadline: Number(arr[2] || 0),
        deadAt: Number(arr[3] || 0), spoilCheckpoint: Number(arr[4] || 0), poweredUntil: Number(arr[5] || 0),
        spoilQ4: Number(arr[6] || 0), fasting: Boolean(arr[7]), deathSettled: Boolean(arr[8]),
      });
    });
    return raw;
  }, [client]);

  const hydrateImages = useCallback(async (ids: number[]) => {
    if (!client || ids.length === 0) return;
    try {
      const reads = await resilientMulticall(client, ids.map(id => ({ address: CONTRACTS.gluttonNFT, abi: GLUTTON_NFT_ABI, functionName: 'tokenURI', args: [BigInt(id)] })));
      const updates = new Map<number, { tokenUri: string; image: string }>();
      await Promise.all(ids.map(async (id, i) => {
        const uri = String(okResult(reads[i]) || '');
        if (!uri) return;
        const image = await metadataImage(uri, 1);
        updates.set(id, { tokenUri: uri, image });
      }));
      if (updates.size) setTokens(prev => prev.map(t => updates.has(t.id) ? { ...t, ...updates.get(t.id)! } : t));
    } catch { /* metadata is non-critical; fallback art remains */ }
  }, [client]);

  const scanPage = useCallback(async (startId: number, session = sessionRef.current) => {
    if (!client || !address || requestLock.current || totalMinted === 0) return;
    if (startId > totalMinted) return;

    requestLock.current = true;
    const isFirst = startId === 1 && scannedCount === 0;
    if (isFirst) setLoading(true); else setLoadingMore(true);
    setError(null);

    try {
      const endId = Math.min(totalMinted, startId + INVENTORY_PAGE_SIZE - 1);
      const ids = Array.from({ length: endId - startId + 1 }, (_, i) => startId + i);

      const owners = await resilientMulticall(client, ids.map(id => ({ address: CONTRACTS.gluttonNFT, abi: GLUTTON_NFT_ABI, functionName: 'ownerOf', args: [BigInt(id)] })));

      if (session !== sessionRef.current) return;

      const ownedIds: number[] = [];
      owners.forEach((r: any, i) => {
        const owner = okResult(r) as Address | undefined;
        if (owner && owner.toLowerCase() === address.toLowerCase()) ownedIds.push(ids[i]);
      });

      const hydrated = await hydrateIds(ownedIds);
      if (session !== sessionRef.current) return;

      setTokens(prev => {
        const map = new Map(prev.map(t => [t.id, t]));
        hydrated.forEach(t => map.set(t.id, t));
        return [...map.values()].sort((a, b) => a.id - b.id);
      });
      setScannedCount(endId);
      setNextTokenId(endId + 1);
      // First paint uses state + fallback art; metadata hydrates afterward.
      if (!rpcCircuitState().blocked) setTimeout(() => void hydrateImages(ownedIds), 1200);
    } catch (e: any) {
      if (session === sessionRef.current) setError(e?.shortMessage || e?.message || 'Could not load wallet inventory page.');
    } finally {
      requestLock.current = false;
      if (session === sessionRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [client, address, totalMinted, scannedCount, hydrateIds, hydrateImages]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore) return;
    await scanPage(nextTokenId);
  }, [hasMore, loading, loadingMore, scanPage, nextTokenId]);

  // Refresh only specific token IDs. This is used for clock-boundary state
  // transitions and action confirmations so a large wallet never needs a
  // full inventory hydration just because one Glutton died, fed, or was reaped.
  const refreshIds = useCallback(async (ids: number[]) => {
    if (!client || !address || ids.length === 0) return;
    const uniqueIds = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))];
    if (uniqueIds.length === 0) return;

    try {
      const hydratedOwned: GluttonToken[] = [];
      for (let i = 0; i < uniqueIds.length; i += INVENTORY_PAGE_SIZE) {
        const batch = uniqueIds.slice(i, i + INVENTORY_PAGE_SIZE);
        const hydrated = await hydrateIds(batch);
        hydrated.forEach(t => {
          if (t.owner.toLowerCase() === address.toLowerCase()) hydratedOwned.push(t);
        });
      }

      setTokens(prev => {
        const requested = new Set(uniqueIds);
        const map = new Map(prev.filter(t => !requested.has(t.id)).map(t => [t.id, t]));
        hydratedOwned.forEach(t => map.set(t.id, t));
        return [...map.values()].sort((a, b) => a.id - b.id);
      });
      void hydrateImages(hydratedOwned.map(t => t.id));

      // Burns/consumption can change ERC-721 balance, so keep the header honest.
      const balance = await readContractRetry(client, {
        address: CONTRACTS.gluttonNFT,
        abi: GLUTTON_NFT_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      setWalletBalance(Number(balance));
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Could not refresh token state.');
    }
  }, [client, address, hydrateIds, hydrateImages]);

  // Refresh only the inventory already discovered. This keeps a player who has
  // scrolled deep into a large wallet from being thrown back to token #1 after
  // a manual full refresh.
  const refresh = useCallback(async () => {
    if (!client || !address || tokens.length === 0 || refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const updated: GluttonToken[] = [];
      for (let i = 0; i < tokens.length; i += INVENTORY_PAGE_SIZE) {
        const batch = tokens.slice(i, i + INVENTORY_PAGE_SIZE).map(t => t.id);
        const hydrated = await hydrateIds(batch);
        // getTokenView includes ownerOf; only keep tokens still owned by wallet.
        hydrated.forEach(t => {
          if (t.owner.toLowerCase() === address.toLowerCase()) updated.push(t);
        });
      }
      setTokens(updated.sort((a, b) => a.id - b.id));
      void hydrateImages(updated.map(t => t.id));
      const balance = await readContractRetry(client, { address: CONTRACTS.gluttonNFT, abi: GLUTTON_NFT_ABI, functionName: 'balanceOf', args: [address] });
      setWalletBalance(Number(balance));
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Could not refresh loaded positions.');
    } finally {
      setRefreshing(false);
    }
  }, [client, address, tokens, refreshing, hydrateIds, hydrateImages]);

  const rescan = useCallback(async () => {
    if (!client || !address) return;
    const session = ++sessionRef.current;
    setTokens([]);
    setScannedCount(0);
    setNextTokenId(1);
    setError(null);
    requestLock.current = false;
    try {
      const balance = await readContractRetry(client, { address: CONTRACTS.gluttonNFT, abi: GLUTTON_NFT_ABI, functionName: 'balanceOf', args: [address] });
      if (session !== sessionRef.current) return;
      setWalletBalance(Number(balance));
      if (Number(balance) > 0 && totalMinted > 0) await scanPage(1, session);
    } catch (e: any) {
      if (session === sessionRef.current) setError(e?.shortMessage || e?.message || 'Could not start inventory scan.');
    }
  }, [client, address, totalMinted, scanPage]);

  useEffect(() => {
    const session = ++sessionRef.current;
    requestLock.current = false;
    setTokens([]);
    setWalletBalance(0);
    setScannedCount(0);
    setNextTokenId(1);
    setError(null);

    async function start() {
      if (!client || !address || CONTRACTS.gluttonNFT === ZERO_ADDRESS || CONTRACTS.inspector === ZERO_ADDRESS || totalMinted === 0) return;
      setLoading(true);
      try {
        const balance = await readContractRetry(client, { address: CONTRACTS.gluttonNFT, abi: GLUTTON_NFT_ABI, functionName: 'balanceOf', args: [address] });
        if (session !== sessionRef.current) return;
        setWalletBalance(Number(balance));
        if (Number(balance) === 0) return;
      } catch (e: any) {
        if (session === sessionRef.current) setError(e?.shortMessage || e?.message || 'Could not read wallet balance.');
        return;
      } finally {
        if (session === sessionRef.current) setLoading(false);
      }
      await scanPage(1, session);
    }

    start();
    return () => { sessionRef.current++; requestLock.current = false; };
    // p.gameStart intentionally resets inventory when the protocol crosses reveal.
  }, [client, address, totalMinted, p.gameStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    tokens,
    walletBalance,
    scannedCount,
    totalMinted,
    hasMore,
    pageSize: INVENTORY_PAGE_SIZE,
    loading,
    loadingMore,
    refreshing,
    error,
    loadMore,
    refresh,
    refreshIds,
    rescan,
    address,
  };
}
