'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { useAtomValue } from 'jotai';
import type { Address } from 'viem';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, GAME_ENGINE_ABI, GAME_HOUR_SECONDS, INSPECTOR_ABI, ZERO_ADDRESS } from '@/lib/constants';

export const STADIUM_BATCH_SIZE = 50;
const REFRESH_EVERY_MS = 2500;
const INITIAL_BATCH_PAUSE_MS = 90;

export type StadiumStatus =
  | 'UNMINTED'
  | 'LOADING'
  | 'ALIVE'
  | 'HUNGRY'
  | 'FASTING'
  | 'FINAL_BITE'
  | 'FRESH'
  | 'ROTTEN'
  | 'CONSUMED';

export type StadiumToken = {
  id: number;
  owner?: Address;
  visualState: number;
  expiry: number;
  isHungry: boolean;
  poisonProtectedUntil: number;
  finalBiteDeadline: number;
  fasting: boolean;
  status: StadiumStatus;
  loaded: boolean;
};

const result = (r: any) => r?.status === 'success' ? r.result : undefined;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function classify(view: any, state: any, now: number): StadiumStatus {
  if (!view) return 'CONSUMED';
  const visualState = Number(view.visualState);
  if (visualState === 2) return 'FRESH';
  if (visualState === 3) return 'ROTTEN';
  if (visualState === 0) return 'LOADING';
  const arr = Array.isArray(state) ? state : [];
  const finalBiteDeadline = Number(arr[2] || 0);
  const fasting = Boolean(arr[7]);
  if (finalBiteDeadline > now) return 'FINAL_BITE';
  if (finalBiteDeadline > 0 && finalBiteDeadline <= now) return 'FRESH';
  if (!fasting && Number(view.expiry || 0) > 0 && Number(view.expiry) <= now) return 'FRESH';
  if (fasting) return 'FASTING';
  if (Boolean(view.isHungry)) return 'HUNGRY';
  return 'ALIVE';
}

export function usePublicStadium() {
  const client = usePublicClient();
  const p = useAtomValue(protocolAtom);
  const supplySource = p.gameStart > 0n && p.startingPopulation > 0n ? p.startingPopulation : p.totalMinted;
  const totalMinted = Math.max(0, Number(supplySource));
  const matrixSupply = p.startingPopulation > 0n ? Number(p.startingPopulation) : totalMinted;
  const [tokens, setTokens] = useState<Record<number, StadiumToken>>({});
  const [scanned, setScanned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const generation = useRef(0);
  const refreshCursor = useRef(1);

  useEffect(() => { const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(timer); }, []);

  const readBatch = useCallback(async (ids: number[]) => {
    if (!client || ids.length === 0) return [] as StadiumToken[];
    const now = Math.floor(Date.now() / 1000);
    const contracts = ids.flatMap(id => ([
      { address: CONTRACTS.inspector, abi: INSPECTOR_ABI, functionName: 'getTokenView', args: [BigInt(id)] },
      { address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: 's_tokenStates', args: [BigInt(id)] },
    ])) as any;
    const reads = await client.multicall({ allowFailure: true, deployless: true, contracts });
    return ids.map((id, index) => {
      const view: any = result(reads[index * 2]);
      const state: any = result(reads[index * 2 + 1]);
      const arr = Array.isArray(state) ? state : [];
      return {
        id,
        owner: view?.owner as Address | undefined,
        visualState: Number(view?.visualState ?? -1),
        expiry: Number(view?.expiry || 0),
        isHungry: Boolean(view?.isHungry),
        poisonProtectedUntil: Number(arr[1] || 0),
        finalBiteDeadline: Number(arr[2] || 0),
        fasting: Boolean(arr[7]),
        status: classify(view, state, now),
        loaded: true,
      } satisfies StadiumToken;
    });
  }, [client]);

  useEffect(() => {
    const id = ++generation.current;
    setTokens({});
    setScanned(0);
    setError(null);
    refreshCursor.current = 1;
    if (!client || totalMinted <= 0 || CONTRACTS.inspector === ZERO_ADDRESS || CONTRACTS.gameEngine === ZERO_ADDRESS) return;

    let cancelled = false;
    async function initialScan() {
      setLoading(true);
      try {
        for (let start = 1; start <= totalMinted; start += STADIUM_BATCH_SIZE) {
          if (cancelled || id !== generation.current) return;
          const end = Math.min(totalMinted, start + STADIUM_BATCH_SIZE - 1);
          const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          const batch = await readBatch(ids);
          if (cancelled || id !== generation.current) return;
          setTokens(prev => {
            const next = { ...prev };
            batch.forEach(t => { next[t.id] = t; });
            return next;
          });
          setScanned(end);
          await wait(INITIAL_BATCH_PAUSE_MS);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.shortMessage || e?.message || 'Could not read the public stadium.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialScan();
    return () => { cancelled = true; };
  }, [client, totalMinted, readBatch]);

  // Once the initial progressive scan finishes, rotate through one small page
  // at a time. The page stays alive without ever asking Curtis for all-token
  // states in a single RPC payload.
  useEffect(() => {
    if (!client || loading || scanned < totalMinted || totalMinted <= 0) return;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        let start = refreshCursor.current;
        if (start > totalMinted) start = 1;
        const end = Math.min(totalMinted, start + STADIUM_BATCH_SIZE - 1);
        const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const batch = await readBatch(ids);
        setTokens(prev => {
          const next = { ...prev };
          batch.forEach(t => { next[t.id] = t; });
          return next;
        });
        refreshCursor.current = end + 1;
      } catch {
        // A rotating refresh may fail temporarily on testnet. Keep the last
        // canonical snapshot instead of blanking the stadium.
      } finally {
        busy = false;
      }
    }, REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [client, loading, scanned, totalMinted, readBatch]);

  const list = useMemo(() => {
    return Array.from({ length: matrixSupply }, (_, i) => {
      const tokenId = i + 1;
      if (tokenId > totalMinted) return { id: tokenId, visualState: -2, expiry: 0, isHungry: false, poisonProtectedUntil: 0, finalBiteDeadline: 0, fasting: false, status: 'UNMINTED' as const, loaded: true };
      const t = tokens[tokenId];
      if (!t) return { id: tokenId, visualState: -1, expiry: 0, isHungry: false, poisonProtectedUntil: 0, finalBiteDeadline: 0, fasting: false, status: 'LOADING' as const, loaded: false };
      // Re-evaluate clock-only labels client-side between RPC rotations.
      let status = t.status;
      if (t.visualState === 1) {
        if (t.finalBiteDeadline > now) status = 'FINAL_BITE';
        else if (t.finalBiteDeadline > 0 && t.finalBiteDeadline <= now) status = 'FRESH';
        else if (!t.fasting && t.expiry > 0 && t.expiry <= now) status = 'FRESH';
        else if (t.fasting) status = 'FASTING';
        else if (t.expiry > 0 && t.expiry - now <= 12 * GAME_HOUR_SECONDS && t.expiry > now) status = 'HUNGRY';
        else status = 'ALIVE';
      }
      return { ...t, status };
    });
  }, [tokens, totalMinted, matrixSupply, now]);

  return { list, totalMinted, scanned, loading, error, batchSize: STADIUM_BATCH_SIZE };
}

export function stadiumRemaining(t: StadiumToken, now = Math.floor(Date.now() / 1000)) {
  if (t.status === 'FINAL_BITE') return Math.max(0, t.finalBiteDeadline - now);
  return Math.max(0, t.expiry - now);
}
