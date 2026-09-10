/**
 * Shared read-side RPC governor.
 *
 * Goals:
 * - cap concurrent RPC POSTs from the whole browser tab;
 * - detect HTTP 429/rate-limit responses;
 * - open a shared circuit breaker so every feature backs off together;
 * - NEVER recursively split multicalls after a 429 (that creates retry storms);
 * - keep non-rate-limit fallback behaviour for flaky deployless multicalls.
 *
 * Transactions/wallet signing do not pass through this file.
 */
export const rpcWait = (ms:number) => new Promise(resolve=>setTimeout(resolve,ms));

const MAX_CONCURRENT_READS = 2;
const RATE_LIMIT_BACKOFF_MS = [5_000, 10_000, 20_000, 30_000, 45_000, 60_000];
let activeReads = 0;
let queue: Array<() => void> = [];
let blockedUntil = 0;
let rateLimitStrikes = 0;
let lastRateLimitAt = 0;

export class RpcRateLimitError extends Error {
  retryAt:number;
  constructor(message='RPC rate limited', retryAt=blockedUntil) {
    super(message);
    this.name='RpcRateLimitError';
    this.retryAt=retryAt;
  }
}

function errorText(error:any) {
  const pieces = [
    error?.message,
    error?.shortMessage,
    error?.details,
    error?.cause?.message,
    error?.cause?.shortMessage,
    error?.cause?.details,
    error?.response?.status,
    error?.status,
  ];
  try { pieces.push(JSON.stringify(error)); } catch {}
  return pieces.filter(Boolean).join(' ').toLowerCase();
}

export function isRateLimitError(error:any) {
  const t = errorText(error);
  return t.includes('429') || t.includes('too many requests') || t.includes('rate limit') || t.includes('ratelimit');
}

function registerRateLimit() {
  const now=Date.now();
  // Strikes decay after a quiet minute so one old 429 does not punish the tab forever.
  if (now-lastRateLimitAt > 60_000) rateLimitStrikes=0;
  lastRateLimitAt=now;
  rateLimitStrikes=Math.min(rateLimitStrikes+1,RATE_LIMIT_BACKOFF_MS.length);
  const delay=RATE_LIMIT_BACKOFF_MS[rateLimitStrikes-1];
  blockedUntil=Math.max(blockedUntil,now+delay);
  return blockedUntil;
}

export function rpcCircuitState() {
  const now=Date.now();
  return {
    blocked: blockedUntil>now,
    retryAt: blockedUntil,
    retryInMs: Math.max(0,blockedUntil-now),
    rateLimitStrikes,
    activeReads,
  };
}

async function acquireSlot() {
  while (blockedUntil>Date.now()) await rpcWait(Math.min(1_000,blockedUntil-Date.now()));
  if (activeReads>=MAX_CONCURRENT_READS) await new Promise<void>(resolve=>queue.push(resolve));
  // The circuit may have opened while this request was queued.
  while (blockedUntil>Date.now()) await rpcWait(Math.min(1_000,blockedUntil-Date.now()));
  activeReads++;
}

function releaseSlot() {
  activeReads=Math.max(0,activeReads-1);
  const next=queue.shift();
  if(next) next();
}

export async function governedRpcCall<T>(fn:()=>Promise<T>):Promise<T> {
  await acquireSlot();
  try {
    const out=await fn();
    // Successful reads slowly heal the circuit.
    if (rateLimitStrikes>0 && Date.now()-lastRateLimitAt>10_000) rateLimitStrikes--;
    return out;
  } catch(error) {
    if(isRateLimitError(error)) {
      const retryAt=registerRateLimit();
      throw new RpcRateLimitError('RPC returned 429 / Too Many Requests',retryAt);
    }
    throw error;
  } finally {
    releaseSlot();
  }
}

export async function readContractRetry(client:any, request:any, attempts=2) {
  let last:unknown;
  for (let i=0;i<attempts;i++) {
    try { return await governedRpcCall(()=>client.readContract(request)); }
    catch (e) {
      last=e;
      // A 429 is global capacity pressure. Retrying immediately only makes it worse.
      if (e instanceof RpcRateLimitError || isRateLimitError(e)) throw e;
      if (i<attempts-1) await rpcWait(350*(i+1));
    }
  }
  throw last;
}

/**
 * Safe multicall. A normal transport/payload failure may be bisected.
 * A 429 NEVER bisects: one failed POST must not turn into 2, 4, 8... POSTs.
 */
export async function resilientMulticall(client:any, contracts:any[]):Promise<any[]> {
  if (!contracts.length) return [];
  try {
    return await governedRpcCall(()=>client.multicall({allowFailure:true,deployless:true,contracts}));
  } catch (error) {
    if (error instanceof RpcRateLimitError || isRateLimitError(error)) throw error;
    if (contracts.length===1) {
      try { return [{status:'success',result:await readContractRetry(client,contracts[0],2)}]; }
      catch (e) { return [{status:'failure',error:e ?? error}]; }
    }
    const mid=Math.ceil(contracts.length/2);
    // Sequential on purpose: parallel fallback doubles pressure on a struggling RPC.
    const left=await resilientMulticall(client,contracts.slice(0,mid));
    const right=await resilientMulticall(client,contracts.slice(mid));
    return [...left,...right];
  }
}
