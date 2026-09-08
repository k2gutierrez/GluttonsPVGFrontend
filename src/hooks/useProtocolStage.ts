'use client';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { MAX_SUPPLY, SITE } from '@/lib/constants';

export type SiteStage = 'awareness' | 'mint' | 'live';

export function useProtocolStage(): SiteStage {
  const p = useAtomValue(protocolAtom);

  // LIVE is a terminal frontend state. Once the latch is set, marketing config,
  // temporary RPC failures, or stale mint reads can never send the UI backwards.
  if (p.liveLocked || p.gameStart > 0n || p.totalMinted >= BigInt(MAX_SUPPLY)) return 'live';

  if (SITE.mode === 'mint') return 'mint';
  if (SITE.mode === 'auto') {
    const t = SITE.mintUiOpenAt ? Date.parse(SITE.mintUiOpenAt) : Number.NaN;
    return Number.isFinite(t) && Date.now() >= t ? 'mint' : 'awareness';
  }
  return 'awareness';
}
