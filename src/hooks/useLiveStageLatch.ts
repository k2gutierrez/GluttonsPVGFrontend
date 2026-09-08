'use client';
import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { usePublicClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import { CONTRACTS, GAME_ENGINE_ABI, MAX_SUPPLY, ZERO_ADDRESS } from '@/lib/constants';
import { protocolAtom } from '@/state/game';

const LIVE_LOCK_KEY = 'gluttons:live-locked:v1';

/**
 * Re-check the terminal stage immediately after a mint-like transaction confirms.
 * GameSync still polls as a fallback for sellout caused by another wallet.
 */
export function useLiveStageLatch() {
  const client = usePublicClient();
  const set = useSetAtom(protocolAtom);
  const router = useRouter();

  return useCallback(async () => {
    if (!client || CONTRACTS.gameEngine === ZERO_ADDRESS) return false;
    try {
      const [gameStartRaw, totalMintedRaw] = await Promise.all([
        client.readContract({ address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: 's_gameStart' } as any),
        client.readContract({ address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: 's_totalMinted' } as any),
      ]);
      const gameStart = BigInt(gameStartRaw as bigint ?? 0n);
      const totalMinted = BigInt(totalMintedRaw as bigint ?? 0n);
      const live = gameStart > 0n || totalMinted >= BigInt(MAX_SUPPLY);

      set(prev => ({
        ...prev,
        gameStart: gameStart > 0n ? gameStart : prev.gameStart,
        totalMinted: totalMinted > prev.totalMinted ? totalMinted : prev.totalMinted,
        synced: true,
        liveLocked: prev.liveLocked || live,
      }));

      if (live) {
        try { window.localStorage.setItem(LIVE_LOCK_KEY, '1'); } catch {}
        router.replace('/');
      }
      return live;
    } catch {
      // The 5s pre-game watcher remains the safety fallback. Never unlock LIVE here.
      return false;
    }
  }, [client, router, set]);
}
