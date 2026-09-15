'use client';

import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { ACTIVE_CHAIN, CONTRACTS } from '@/lib/constants';
import { readApi, forgetReadCache } from '@/lib/read-api';
import { validProtocolSnapshot, type ProtocolSnapshot } from '@/lib/read-model';
import { protocolAtom } from '@/state/game';

const KEY = `gluttons:live-locked:${ACTIVE_CHAIN.id}:${CONTRACTS.gameEngine.toLowerCase()}`;

function isThisDeployment(p: ProtocolSnapshot) {
  return validProtocolSnapshot(p)
    && p.chainId === ACTIVE_CHAIN.id
    && String(p.deployment).toLowerCase() === CONTRACTS.gameEngine.toLowerCase();
}

export function useLiveStageLatch() {
  const set = useSetAtom(protocolAtom);
  const router = useRouter();

  return useCallback(async () => {
    forgetReadCache('/api/read/protocol');

    // A just-confirmed sellout/mint can arrive a few seconds before the shared indexer.
    // We retry the shared read model only. We never guess LIVE from totalMinted and we
    // never send a browser RPC read to decide the website stage.
    for (let i = 0; i < 8; i++) {
      try {
        const r = await readApi<ProtocolSnapshot>('/api/read/protocol', {
          fresh: true,
          ttlMs: 0,
          persist: true,
        });
        if (!isThisDeployment(r.value)) throw new Error('READ_MODEL_DEPLOYMENT_MISMATCH');

        const gs = BigInt(r.value.gameStart);
        if (gs > 0n) {
          try { localStorage.setItem(KEY, '1'); } catch {}
          set(x => ({
            ...x,
            gameStart: gs,
            phaseCode: r.value.phaseCode,
            currentPhase: r.value.currentPhase,
            totalMinted: BigInt(r.value.totalMinted),
            maxSupply: BigInt(r.value.maxSupply),
            startingPopulation: BigInt(r.value.startingPopulation),
            tokenStateBlock: Number(r.value.tokenStateBlock || 0),
            stageResolved: true,
            synced: true,
            rpcDegraded: r.stale,
            liveLocked: true,
            lastSuccessfulSyncAt: Date.now(),
          }));
          router.replace('/');
          return true;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 700 + i * 250));
    }
    return false;
  }, [router, set]);
}
