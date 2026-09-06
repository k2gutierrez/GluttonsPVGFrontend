'use client';
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { useReadContracts } from 'wagmi';
import { CONTRACTS, GAME_ENGINE_ABI, INSPECTOR_ABI, ZERO_ADDRESS } from '@/lib/constants';
import { protocolAtom } from '@/state/game';

const engineRead = (name: string) => ({ address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: name } as const);
export function GameSync() {
  const [, set] = useAtom(protocolAtom);
  const enabled = CONTRACTS.gameEngine !== ZERO_ADDRESS;
  const r = useReadContracts({
    contracts: [
      { address: CONTRACTS.inspector, abi: INSPECTOR_ABI, functionName: 'getGlobalView' },
      engineRead('s_totalMinted'), engineRead('s_gameStart'), engineRead('S'), engineRead('s_totalNormalFeeds'), engineRead('s_completedBars'), engineRead('i_startBackstop'), engineRead('s_aliveCount'), engineRead('s_currentMealSeconds'), engineRead('isSettled'),
    ] as any,
    allowFailure: true,
    query: { enabled, refetchInterval: 5000 },
  });
  useEffect(() => {
    if (!r.data) return;
    const get = (i: number) => (r.data?.[i] as any)?.status === 'success' ? (r.data?.[i] as any).result : undefined;
    const g: any = get(0);
    const alive = g?.aliveCount ?? get(7) ?? 0n;
    const meal = g?.currentMealSeconds ?? get(8) ?? 86400n;
    const settled = g?.isSettled ?? get(9) ?? false;
    const phase = g?.currentPhase ?? (get(2) && BigInt(get(2)) > 0n ? 'FEAST' : 'PRE_GAME');
    set({
      aliveCount: BigInt(alive), currentMealSeconds: BigInt(meal), isSettled: Boolean(settled), currentPhase: String(phase),
      totalMinted: BigInt(get(1) ?? 0n), gameStart: BigInt(get(2) ?? 0n), startingPopulation: BigInt(get(3) ?? 0n),
      totalNormalFeeds: BigInt(get(4) ?? 0n), completedBars: BigInt(get(5) ?? 0n), startBackstop: BigInt(get(6) ?? 0n), synced: true,
    });
  }, [r.data, set]);
  return null;
}
