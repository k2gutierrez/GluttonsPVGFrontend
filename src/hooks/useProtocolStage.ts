'use client';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { SITE } from '@/lib/constants';

export type SiteStage = 'syncing' | 'awareness' | 'mint' | 'live';

export function useProtocolStage(): SiteStage {
  const p = useAtomValue(protocolAtom);

  // Never guess the protocol stage before at least one authoritative
  // GameEngine read succeeds. This prevents a temporary RPC failure from
  // rendering PRE-MINT/MINT on an already-live deployment.
  if (!p.stageResolved) return 'syncing';

  if (p.liveLocked || p.gameStart > 0n || (p.maxSupply > 0n && p.totalMinted >= p.maxSupply)) return 'live';

  if (SITE.mode === 'mint') return 'mint';
  if (SITE.mode === 'auto') {
    const t = SITE.mintUiOpenAt ? Date.parse(SITE.mintUiOpenAt) : Number.NaN;
    return Number.isFinite(t) && Date.now() >= t ? 'mint' : 'awareness';
  }
  return 'awareness';
}
