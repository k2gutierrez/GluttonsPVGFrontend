import { atom } from 'jotai';

export type ProtocolView = {
  aliveCount: bigint;
  currentMealSeconds: bigint;
  isSettled: boolean;
  currentPhase: string;
  totalMinted: bigint;
  gameStart: bigint;
  startingPopulation: bigint;
  totalNormalFeeds: bigint;
  completedBars: bigint;
  startBackstop: bigint;
  preMintEnd: boolean;
  communityMintPrice: bigint;
  synced: boolean;
};

export const protocolAtom = atom<ProtocolView>({
  aliveCount: 0n,
  currentMealSeconds: 86400n,
  isSettled: false,
  currentPhase: 'PRE_GAME',
  totalMinted: 0n,
  gameStart: 0n,
  startingPopulation: 0n,
  totalNormalFeeds: 0n,
  completedBars: 0n,
  startBackstop: 0n,
  preMintEnd: false,
  communityMintPrice: 4_000_000_000_000_000n,
  synced: false,
});
