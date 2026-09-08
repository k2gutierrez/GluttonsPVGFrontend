import { atom } from 'jotai';

export type ProtocolView = {
  aliveCount: bigint;
  currentMealSeconds: bigint;
  isSettled: boolean;
  currentPhase: string;
  totalMinted: bigint;
  maxSupply: bigint;
  gameStart: bigint;
  startingPopulation: bigint;
  totalNormalFeeds: bigint;
  completedBars: bigint;
  startBackstop: bigint;
  preMintEnd: boolean;
  communityMintPrice: bigint;
  synced: boolean;
  /**
   * Frontend one-way latch. Once LIVE is observed, the UI never renders
   * Community Pre-Mint or Public Mint again during this deployment.
   * Onchain state remains authoritative; localStorage is only a fast boot hint.
   */
  liveLocked: boolean;
};

export const protocolAtom = atom<ProtocolView>({
  aliveCount: 0n,
  currentMealSeconds: 86400n,
  isSettled: false,
  currentPhase: 'PRE_GAME',
  totalMinted: 0n,
  maxSupply: 2000n,
  gameStart: 0n,
  startingPopulation: 0n,
  totalNormalFeeds: 0n,
  completedBars: 0n,
  startBackstop: 0n,
  preMintEnd: false,
  communityMintPrice: 4_000_000_000_000_000n,
  synced: false,
  liveLocked: false,
});
