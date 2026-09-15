import type { Address } from 'viem';

export type ProtocolSnapshot = {
  chainId: number;
  deployment: string;
  blockNumber: number;
  indexedAt: number;
  /** Last safe block that changed at least one indexed token/vote/owner state. */
  tokenStateBlock: number;
  gameStart: string;
  phaseCode: number;
  currentPhase: string;
  aliveCount: string;
  currentMealSeconds: string;
  isSettled: boolean;
  totalMinted: string;
  maxSupply: string;
  startingPopulation: string;
  totalNormalFeeds: string;
  completedBars: string;
  startBackstop: string;
  preMintEnd: boolean;
  communityMintPrice: string;
  gameHourSeconds: string;
  lastSupperWarningAt: string;
  lastSupperAt: string;
  lastSupperThreshold: string;
  truceThreshold: string;
  truceEpoch: string;
  tiebreakCandidate: string;
  rottenThreshold: string;
  potNative: string;
  potWeth: string;
  wethAddress: string;
};

export type TokenSnapshot = {
  id: number;
  owner?: Address;
  burned: boolean;
  /** Canonical GameEngine visual state: 0 unrevealed, 1 alive, 2 fresh, 3 rotten. */
  visualState: number;
  expiry: number;
  poisonProtectedUntil: number;
  finalBiteDeadline: number;
  deadAt: number;
  spoilCheckpoint: number;
  poweredUntil: number;
  spoilQ4: number;
  fasting: boolean;
  deathSettled: boolean;
  voteEpoch: string;
  voteOwner?: Address;
  updatedBlock: number;
  /** Cached canonical tokenURI. Never required to decide gameplay state. */
  tokenUri?: string;
};

export type DerivedStatus = 'UNMINTED'|'ALIVE'|'HUNGRY'|'FASTING'|'FINAL_BITE'|'FRESH'|'ROTTEN'|'CONSUMED'|'UNKNOWN';

const uintString = /^\d+$/;
export function validProtocolSnapshot(v: unknown): v is ProtocolSnapshot {
  if (!v || typeof v !== 'object') return false;
  const x = v as Record<string, unknown>;
  const strings = ['deployment','gameStart','aliveCount','currentMealSeconds','totalMinted','maxSupply','startingPopulation','totalNormalFeeds','completedBars','startBackstop','communityMintPrice','gameHourSeconds','lastSupperWarningAt','lastSupperAt','lastSupperThreshold','truceThreshold','truceEpoch','tiebreakCandidate','rottenThreshold','potNative','potWeth','wethAddress'];
  if (!Number.isSafeInteger(x.chainId) || !Number.isSafeInteger(x.blockNumber) || !Number.isFinite(x.indexedAt) || !Number.isSafeInteger(x.tokenStateBlock)) return false;
  if (!Number.isInteger(x.phaseCode) || Number(x.phaseCode) < 0 || Number(x.phaseCode) > 5) return false;
  if (typeof x.currentPhase !== 'string' || typeof x.isSettled !== 'boolean' || typeof x.preMintEnd !== 'boolean') return false;
  return strings.every(k => typeof x[k] === 'string' && (k === 'deployment' || k === 'wethAddress' ? /^0x[a-fA-F0-9]{40}$/.test(String(x[k])) : uintString.test(String(x[k]))));
}

export function logicalDeadAt(t: TokenSnapshot, p: ProtocolSnapshot, now: number) {
  if (t.deadAt > 0) return t.deadAt;
  if (t.finalBiteDeadline > 0 && now >= t.finalBiteDeadline) return t.finalBiteDeadline;
  if (t.fasting) {
    const bell = Number(p.lastSupperAt || 0);
    if (t.expiry <= now && bell > 0 && now >= bell) return bell;
    return 0;
  }
  return t.expiry > 0 && now >= t.expiry ? t.expiry : 0;
}

export function virtualSpoilQ4(t: TokenSnapshot, p: ProtocolSnapshot, deadAt: number, now: number) {
  let spoil = t.spoilQ4;
  const threshold = Number(p.rottenThreshold || 0);
  if (threshold > 0 && spoil >= threshold) return spoil;
  const last = t.spoilCheckpoint > 0 ? t.spoilCheckpoint : deadAt;
  if (!last || now <= last) return spoil;
  let powerEnd = t.poweredUntil;
  const bell = Number(p.lastSupperAt || 0);
  if (bell > 0 && powerEnd > bell) powerEnd = bell;
  if (powerEnd > last) {
    if (now <= powerEnd) spoil += now - last;
    else spoil += (powerEnd - last) + (now - powerEnd) * 4;
  } else spoil += (now - last) * 4;
  return spoil;
}

export function deriveStatus(t: TokenSnapshot|undefined, p: ProtocolSnapshot, now=Math.floor(Date.now()/1000)): DerivedStatus {
  if (!t) return 'UNKNOWN';
  if (t.burned) return 'CONSUMED';
  if (!Number(p.gameStart)) return 'UNMINTED';
  const dead = logicalDeadAt(t,p,now);
  if (dead) {
    const threshold = Number(p.rottenThreshold || 0);
    return threshold > 0 && virtualSpoilQ4(t,p,dead,now) >= threshold ? 'ROTTEN' : 'FRESH';
  }
  if (t.finalBiteDeadline > now) return 'FINAL_BITE';
  if (t.fasting) return 'FASTING';
  const gh = Number(p.gameHourSeconds || 3600);
  if (t.expiry > now && t.expiry-now <= 12*gh) return 'HUNGRY';
  return 'ALIVE';
}
