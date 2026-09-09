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
  stageResolved: boolean;
  rpcDegraded: boolean;
  lastSuccessfulSyncAt: number;
  gameHourSeconds: bigint;
  phaseCode: number;
  lastSupperWarningAt: bigint;
  lastSupperAt: bigint;
  lastSupperThreshold: bigint;
  truceThreshold: bigint;
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
  maxSupply: 0n,
  gameStart: 0n,
  startingPopulation: 0n,
  totalNormalFeeds: 0n,
  completedBars: 0n,
  startBackstop: 0n,
  preMintEnd: false,
  communityMintPrice: 4_000_000_000_000_000n,
  synced: false,
  stageResolved: false,
  rpcDegraded: false,
  lastSuccessfulSyncAt: 0,
  gameHourSeconds: 0n,
  phaseCode: 0,
  lastSupperWarningAt: 0n,
  lastSupperAt: 0n,
  lastSupperThreshold: 0n,
  truceThreshold: 0n,
  liveLocked: false,
});
