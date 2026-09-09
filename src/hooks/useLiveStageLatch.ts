'use client';
import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { usePublicClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ACTIVE_CHAIN, CONTRACTS, GAME_ENGINE_ABI, ZERO_ADDRESS } from '@/lib/constants';
import { protocolAtom } from '@/state/game';

const LIVE_LOCK_KEY = `gluttons:live-locked:${ACTIVE_CHAIN.id}:${CONTRACTS.gameEngine.toLowerCase()}`;
const wait = (ms:number) => new Promise(r=>setTimeout(r,ms));

async function readRetry(client:any, functionName:string) {
  let last:unknown;
  for (const ms of [0,120,350,800]) {
    if (ms) await wait(ms);
    try { return await client.readContract({address:CONTRACTS.gameEngine, abi:GAME_ENGINE_ABI, functionName} as any); }
    catch (e) { last=e; }
  }
  throw last;
}

/** Immediate post-transaction stage verification. Never waits for the background poller. */
export function useLiveStageLatch() {
  const client = usePublicClient();
  const set = useSetAtom(protocolAtom);
  const router = useRouter();

  return useCallback(async () => {
    if (!client || CONTRACTS.gameEngine === ZERO_ADDRESS) return false;
    try {
      const gameStart = BigInt(await readRetry(client,'s_gameStart') as bigint);
      const phaseCode = gameStart > 0n ? Number(await readRetry(client,'currentPhaseCode') as number) : 0;
      const live = gameStart > 0n || phaseCode > 0;
      set(prev => ({
        ...prev,
        gameStart: gameStart > 0n ? gameStart : prev.gameStart,
        phaseCode: live ? phaseCode : prev.phaseCode,
        currentPhase: live ? ['PRE_GAME','FEAST','PLAGUE','LS_WARNING','LAST_SUPPER','SETTLED'][phaseCode] ?? prev.currentPhase : prev.currentPhase,
        stageResolved: true,
        synced: prev.synced || live,
        rpcDegraded: false,
        liveLocked: prev.liveLocked || live,
      }));
      if (live) {
        try { window.localStorage.setItem(LIVE_LOCK_KEY,'1'); } catch {}
        router.replace('/');
      }
      return live;
    } catch {
      // Keep the existing one-way state. Background GameSync will retry.
      return false;
    }
  }, [client, router, set]);
}
