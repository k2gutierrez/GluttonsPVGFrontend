'use client';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { GAME_HOUR_SECONDS } from '@/lib/constants';

export function useProtocolTiming() {
  const p = useAtomValue(protocolAtom);
  const gameHourSeconds = Number(p.gameHourSeconds > 0n ? p.gameHourSeconds : BigInt(GAME_HOUR_SECONDS));
  return {
    gameHourSeconds,
    hungryWindowSeconds: 12 * gameHourSeconds,
    rottenThresholdQ4: 24 * gameHourSeconds * 4,
  };
}
