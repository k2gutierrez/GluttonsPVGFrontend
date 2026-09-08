'use client';
import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { useReadContracts } from 'wagmi';
import { CONTRACTS, GAME_ENGINE_ABI, INSPECTOR_ABI, MAX_SUPPLY, ZERO_ADDRESS } from '@/lib/constants';
import { protocolAtom } from '@/state/game';

const LIVE_LOCK_KEY = 'gluttons:live-locked:v1';
const engineRead = (name: string) => ({ address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: name } as const);

function persistLiveLock() {
  try { window.localStorage.setItem(LIVE_LOCK_KEY, '1'); } catch {}
}

export function GameSync() {
  const [p, set] = useAtom(protocolAtom);
  const enabled = CONTRACTS.gameEngine !== ZERO_ADDRESS;
  const liveRef = useRef(p.liveLocked);

  useEffect(() => { liveRef.current = p.liveLocked; }, [p.liveLocked]);

  // Fast boot optimization only. We never use localStorage to unlock or regress.
  useEffect(() => {
    if (!enabled) return;
    try {
      if (window.localStorage.getItem(LIVE_LOCK_KEY) === '1') {
        liveRef.current = true;
        set(prev => ({ ...prev, liveLocked: true }));
      }
    } catch {}
  }, [enabled, set]);

  // PRE-GAME SYNC: this is the only polling loop that reads mint-stage fields.
  // It turns itself off forever once LIVE has been latched.
  const pre = useReadContracts({
    contracts: [
      { address: CONTRACTS.inspector, abi: INSPECTOR_ABI, functionName: 'getGlobalView' },
      engineRead('s_totalMinted'),
      engineRead('s_gameStart'),
      engineRead('S'),
      engineRead('s_totalNormalFeeds'),
      engineRead('s_completedBars'),
      engineRead('i_startBackstop'),
      engineRead('s_aliveCount'),
      engineRead('s_currentMealSeconds'),
      engineRead('isSettled'),
      engineRead('s_preMintEnd'),
      engineRead('s_communityMintprice'),
    ] as any,
    allowFailure: true,
    query: {
      enabled: enabled && !p.liveLocked,
      refetchInterval: p.liveLocked ? false : 5000,
      refetchOnWindowFocus: true,
    },
  });

  useEffect(() => {
    if (!pre.data || liveRef.current) return;
    const get = (i: number) => (pre.data?.[i] as any)?.status === 'success' ? (pre.data?.[i] as any).result : undefined;
    const g: any = get(0);
    const gameStart = BigInt(get(2) ?? 0n);
    const totalMinted = BigInt(get(1) ?? 0n);
    const soldOut = totalMinted >= BigInt(MAX_SUPPLY);
    const started = gameStart > 0n;
    const lockNow = started || soldOut;

    if (lockNow) {
      liveRef.current = true;
      persistLiveLock();
    }

    const alive = g?.aliveCount ?? get(7) ?? 0n;
    const meal = g?.currentMealSeconds ?? get(8) ?? 86400n;
    const settled = g?.isSettled ?? get(9) ?? false;
    const phase = g?.currentPhase ?? (lockNow ? 'FEAST' : 'PRE_GAME');

    set(prev => ({
      ...prev,
      aliveCount: BigInt(alive),
      currentMealSeconds: BigInt(meal),
      isSettled: Boolean(settled),
      currentPhase: String(phase),
      totalMinted,
      gameStart,
      startingPopulation: BigInt(get(3) ?? 0n),
      totalNormalFeeds: BigInt(get(4) ?? 0n),
      completedBars: BigInt(get(5) ?? 0n),
      startBackstop: BigInt(get(6) ?? 0n),
      preMintEnd: Boolean(get(10) ?? false),
      communityMintPrice: BigInt(get(11) ?? 4_000_000_000_000_000n),
      synced: true,
      liveLocked: prev.liveLocked || lockNow,
    }));
  }, [pre.data, set]);

  // LIVE SYNC: after the one-way latch, only gameplay/global fields continue to poll.
  // No pre-mint/public-mint availability reads are needed anymore.
  const live = useReadContracts({
    contracts: [
      { address: CONTRACTS.inspector, abi: INSPECTOR_ABI, functionName: 'getGlobalView' },
      engineRead('s_gameStart'),
      engineRead('S'),
      engineRead('s_totalNormalFeeds'),
      engineRead('s_completedBars'),
      engineRead('s_aliveCount'),
      engineRead('s_currentMealSeconds'),
      engineRead('isSettled'),
    ] as any,
    allowFailure: true,
    query: {
      enabled: enabled && p.liveLocked,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  useEffect(() => {
    if (!live.data || !liveRef.current) return;
    const get = (i: number) => (live.data?.[i] as any)?.status === 'success' ? (live.data?.[i] as any).result : undefined;
    const g: any = get(0);
    const gameStart = BigInt(get(1) ?? p.gameStart ?? 0n);
    const alive = g?.aliveCount ?? get(5) ?? p.aliveCount;
    const meal = g?.currentMealSeconds ?? get(6) ?? p.currentMealSeconds;
    const settled = g?.isSettled ?? get(7) ?? p.isSettled;
    const phase = g?.currentPhase ?? p.currentPhase ?? 'FEAST';

    set(prev => ({
      ...prev,
      aliveCount: BigInt(alive),
      currentMealSeconds: BigInt(meal),
      isSettled: Boolean(settled),
      currentPhase: String(phase),
      gameStart: gameStart > 0n ? gameStart : prev.gameStart,
      startingPopulation: BigInt(get(2) ?? prev.startingPopulation),
      totalNormalFeeds: BigInt(get(3) ?? prev.totalNormalFeeds),
      completedBars: BigInt(get(4) ?? prev.completedBars),
      synced: true,
      liveLocked: true,
    }));
  // p fields are fallback-only; avoid turning this into a render-driven polling loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.data, set]);

  return null;
}
