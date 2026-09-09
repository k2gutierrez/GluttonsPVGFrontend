'use client';

import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { usePublicClient } from 'wagmi';
import { ACTIVE_CHAIN, CONTRACTS, GAME_ENGINE_ABI, GAME_HOUR_SECONDS, ZERO_ADDRESS } from '@/lib/constants';
import { protocolAtom } from '@/state/game';

const LIVE_LOCK_KEY = `gluttons:live-locked:${ACTIVE_CHAIN.id}:${CONTRACTS.gameEngine.toLowerCase()}`;
const BOOT_RETRY_MS = [0, 120, 300, 700, 1400];
const PRE_GAME_POLL_MS = 1800;
const LIVE_POLL_MS = 3000;

const phaseName = (code: number) => {
  if (code === 0) return 'PRE_GAME';
  if (code === 1) return 'FEAST';
  if (code === 2) return 'PLAGUE';
  if (code === 3) return 'LS_WARNING';
  if (code === 4) return 'LAST_SUPPER';
  return 'SETTLED';
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function readRetry(client: any, functionName: string, attempts = BOOT_RETRY_MS.length) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    if (BOOT_RETRY_MS[i]) await sleep(BOOT_RETRY_MS[i]);
    try {
      return await client.readContract({
        address: CONTRACTS.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName,
      } as any);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function readResult(row: any) {
  return row?.status === 'success' ? row.result : undefined;
}

export function GameSync() {
  const client = usePublicClient();
  const [p, set] = useAtom(protocolAtom);
  const liveRef = useRef(p.liveLocked);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => { liveRef.current = p.liveLocked; }, [p.liveLocked]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!client || CONTRACTS.gameEngine === ZERO_ADDRESS) {
      set(prev => ({ ...prev, stageResolved: false, synced: false, rpcDegraded: true }));
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const persistLive = () => {
      try { window.localStorage.setItem(LIVE_LOCK_KEY, '1'); } catch {}
    };

    const cachedLive = (() => {
      try { return window.localStorage.getItem(LIVE_LOCK_KEY) === '1'; } catch { return false; }
    })();

    // A LIVE observation is irreversible for a specific GameEngine address.
    // The cache is therefore safe as a same-deployment boot hint and prevents a
    // previously-live browser from flashing Mint while the RPC wakes up.
    if (cachedLive) {
      liveRef.current = true;
      set(prev => ({ ...prev, stageResolved: true, liveLocked: true }));
    }

    async function stageProbe() {
      const gameStartRaw = await readRetry(client, 's_gameStart');
      const gameStart = BigInt(gameStartRaw as bigint);
      if (gameStart > 0n) {
        liveRef.current = true;
        persistLive();
        set(prev => ({
          ...prev,
          gameStart,
          liveLocked: true,
          stageResolved: true,
          rpcDegraded: false,
        }));
        return true;
      }

      // A browser cache is only a boot hint; the chain remains authoritative.
      // If a cached LIVE hint conflicts with repeated direct reads of gameStart=0,
      // discard the hint instead of trapping this browser on a false LIVE page.
      if (liveRef.current) {
        const confirmations = await Promise.all([
          readRetry(client, 's_gameStart', 3),
          readRetry(client, 's_gameStart', 3),
        ]);
        const allZero = confirmations.every(v => BigInt(v as bigint) === 0n);
        if (!allZero) throw new Error('Conflicting Game Start reads; refusing to guess protocol stage.');
        liveRef.current = false;
        try { window.localStorage.removeItem(LIVE_LOCK_KEY); } catch {}
        set(prev => ({ ...prev, liveLocked: false }));
      }

      // Before allowing any Mint/Pre-Mint UI to render, resolve the minimum
      // pre-game facts with direct eth_call reads. No supply or mint phase is
      // ever inferred from defaults.
      const [preMintEndRaw, totalMintedRaw, maxSupplyRaw] = await Promise.all([
        readRetry(client, 's_preMintEnd', 3),
        readRetry(client, 's_totalMinted', 3),
        readRetry(client, 'MAX_SUPPLY', 3),
      ]);
      set(prev => ({
        ...prev,
        gameStart: 0n,
        liveLocked: false,
        preMintEnd: Boolean(preMintEndRaw),
        totalMinted: BigInt(totalMintedRaw as bigint),
        maxSupply: BigInt(maxSupplyRaw as bigint),
        currentPhase: 'PRE_GAME',
        phaseCode: 0,
        stageResolved: true,
        rpcDegraded: false,
      }));
      return false;
    }

    async function snapshot() {
      if (!client || busyRef.current || cancelled) return;
      busyRef.current = true;
      try {
        const live = await stageProbe();
        const reads = [
          'currentPhaseCode',
          's_aliveCount',
          's_currentMealSeconds',
          'isSettled',
          's_totalMinted',
          'MAX_SUPPLY',
          'S',
          's_totalNormalFeeds',
          's_completedBars',
          'i_startBackstop',
          's_preMintEnd',
          's_communityMintprice',
          'GAME_HOUR',
          'lastSupperWarningAt',
          'lastSupperAt',
          'lastSupperPopulationThreshold',
          'trucePopulationThreshold',
        ];

        let rows: readonly any[];
        try {
          rows = await client.multicall({
            allowFailure: true,
            deployless: true,
            contracts: reads.map(functionName => ({
              address: CONTRACTS.gameEngine,
              abi: GAME_ENGINE_ABI,
              functionName,
            })) as any,
          });
        } catch {
          // If deployless multicall is flaky, individual eth_call reads keep the
          // stage/global state alive instead of blanking the whole application.
          rows = await Promise.all(reads.map(async functionName => {
            try {
              const value = await readRetry(client, functionName, 2);
              return { status: 'success', result: value };
            } catch (error) {
              return { status: 'failure', error };
            }
          }));
        }

        if (cancelled || !mountedRef.current) return;
        const v = (i: number) => readResult(rows[i]);
        const now = Date.now();
        // First LIVE paint requires a coherent minimum snapshot. A successful
        // s_gameStart read alone proves LIVE, but it is not enough to paint
        // counters/phase with zero defaults. Once a good snapshot exists,
        // partial RPC failures preserve it and only mark the UI degraded.
        const phaseCandidate = v(0) === undefined ? undefined : Number(v(0));
        // Critical data is phase-aware. We refuse to paint a phase if the
        // values required to explain that phase are still unknown.
        const criticalIndexes = [0, 1, 2, 3, 4, 5, 6, 12, 15, 16];
        if (phaseCandidate === 0) criticalIndexes.push(9, 10, 11); // backstop / mint phase / community price
        if (phaseCandidate === 3) criticalIndexes.push(13, 14);    // warning start / bell
        if (phaseCandidate === 4) criticalIndexes.push(14);        // bell + truce threshold already required
        const criticalOk = criticalIndexes.every(i => v(i) !== undefined);

        set(prev => {
          const phaseRaw = v(0);
          const phaseCode = phaseRaw === undefined ? prev.phaseCode : Number(phaseRaw);
          return ({
          ...prev,
          aliveCount: BigInt(v(1) ?? prev.aliveCount),
          currentMealSeconds: BigInt(v(2) ?? prev.currentMealSeconds),
          isSettled: Boolean(v(3) ?? prev.isSettled),
          totalMinted: BigInt(v(4) ?? prev.totalMinted),
          maxSupply: BigInt(v(5) ?? prev.maxSupply),
          startingPopulation: BigInt(v(6) ?? prev.startingPopulation),
          totalNormalFeeds: BigInt(v(7) ?? prev.totalNormalFeeds),
          completedBars: BigInt(v(8) ?? prev.completedBars),
          startBackstop: BigInt(v(9) ?? prev.startBackstop),
          preMintEnd: Boolean(v(10) ?? prev.preMintEnd),
          communityMintPrice: BigInt(v(11) ?? prev.communityMintPrice),
          gameHourSeconds: BigInt(v(12) ?? (prev.gameHourSeconds > 0n ? prev.gameHourSeconds : BigInt(GAME_HOUR_SECONDS))),
          lastSupperWarningAt: BigInt(v(13) ?? prev.lastSupperWarningAt),
          lastSupperAt: BigInt(v(14) ?? prev.lastSupperAt),
          lastSupperThreshold: BigInt(v(15) ?? prev.lastSupperThreshold),
          truceThreshold: BigInt(v(16) ?? prev.truceThreshold),
          phaseCode,
          currentPhase: phaseRaw === undefined ? prev.currentPhase : phaseName(phaseCode),
          stageResolved: true,
          synced: prev.synced || criticalOk,
          rpcDegraded: !criticalOk,
          lastSuccessfulSyncAt: criticalOk ? now : prev.lastSuccessfulSyncAt,
          liveLocked: prev.liveLocked || live,
        });
        });
      } catch {
        if (!cancelled && mountedRef.current) {
          // Preserve the last known canonical snapshot. A transient RPC failure
          // must never reset LIVE to PRE_GAME or reset supply to 0/2,000.
          set(prev => ({
            ...prev,
            rpcDegraded: true,
            stageResolved: prev.stageResolved || liveRef.current,
          }));
        }
      } finally {
        busyRef.current = false;
      }
    }

    const schedule = () => {
      if (cancelled) return;
      const delay = liveRef.current ? LIVE_POLL_MS : PRE_GAME_POLL_MS;
      timer = setTimeout(async () => {
        await snapshot();
        schedule();
      }, delay);
    };

    void snapshot().finally(schedule);

    const onFocus = () => { void snapshot(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') void snapshot(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [client, set]);

  return null;
}
