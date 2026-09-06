'use client';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { MAX_SUPPLY, SITE } from '@/lib/constants';

export type SiteStage = 'awareness' | 'mint' | 'live';

export function useProtocolStage(): SiteStage {
  const p = useAtomValue(protocolAtom);
  // The contract wins over marketing configuration. Sellout auto-starts GameEngine.
  if (p.gameStart > 0n || p.totalMinted >= BigInt(MAX_SUPPLY)) return 'live';
  if (SITE.mode === 'mint') return 'mint';
  if (SITE.mode === 'auto') {
    const t = SITE.mintUiOpenAt ? Date.parse(SITE.mintUiOpenAt) : Number.NaN;
    return Number.isFinite(t) && Date.now() >= t ? 'mint' : 'awareness';
  }
  return 'awareness';
}
