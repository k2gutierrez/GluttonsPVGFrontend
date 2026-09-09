'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useAtomValue } from 'jotai';
import type { Address } from 'viem';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, GAME_ENGINE_ABI, INSPECTOR_ABI, PRIZE_VAULT_ABI, ZERO_ADDRESS } from '@/lib/constants';
import { resilientMulticall, readContractRetry } from '@/lib/rpc';

export type FinalTableToken = {
  id: number;
  owner: Address;
  expiry: number;
  visualState: number;
  voteEpoch: bigint;
  voteOwner: Address;
  voteValid: boolean;
};

const result = (row: any) => row?.status === 'success' ? row.result : undefined;
const normTuple = (v: any) => Array.isArray(v) ? v : v ? Object.values(v) : [];

/**
 * Endgame-only canonical reader.
 * It deliberately stays dormant before LAST_SUPPER/SETTLED so the normal game
 * does not pay the RPC cost of scanning the final table. At the final table the
 * population is tiny, but token IDs may still span S; reads are paged and
 * resilient to Curtis multicall failures.
 */
export function useEndgameTable() {
  const p = useAtomValue(protocolAtom);
  const client = usePublicClient();
  const { address } = useAccount();
  const active = p.isSettled || p.currentPhase === 'SETTLED' || (p.gameStart > 0n && p.aliveCount <= 1n) || (p.currentPhase === 'LAST_SUPPER' && p.truceThreshold > 0n && p.aliveCount <= p.truceThreshold);
  const supply = Number(p.startingPopulation || p.totalMinted);
  const [live, setLive] = useState<FinalTableToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReadAt, setLastReadAt] = useState(0);

  const refresh = useCallback(async () => {
    if (!client || !active || supply <= 0 || CONTRACTS.inspector === ZERO_ADDRESS) return;
    setLoading(true);
    setError(null);
    try {
      const epochRaw = await readContractRetry(client, {
        address: CONTRACTS.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: 's_truceEpoch',
      }, 3);
      const epoch = BigInt(epochRaw as bigint);
      const living: { id: number; owner: Address; expiry: number; visualState: number }[] = [];

      for (let start = 1; start <= supply; start += 50) {
        const end = Math.min(supply, start + 49);
        const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const rows = await resilientMulticall(client, ids.flatMap(id => ([
          { address: CONTRACTS.inspector, abi: INSPECTOR_ABI, functionName: 'getTokenView', args: [BigInt(id)] },
          { address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: 's_tokenStates', args: [BigInt(id)] },
        ])) as any);
        ids.forEach((id, i) => {
          const v: any = result(rows[i * 2]);
          const state: any = result(rows[i * 2 + 1]);
          if (!v) return; // burned / consumed tokens have no ownerOf and are excluded
          const visualState = Number(v.visualState ?? v[1] ?? -1);
          const st = normTuple(state);
          const deathSettled = Boolean(st[8] ?? false);
          // During the live final table, Inspector visual state is canonical.
          // After settlement, clocks may continue to elapse in the raw contract
          // view, but settlement must preserve the final table identity. Every
          // non-winning/non-truce death had to be materialized before settlement,
          // so unburned tokens with deathSettled=false are the frozen final table.
          const include = p.isSettled ? !deathSettled : visualState === 1;
          if (!include) return;
          living.push({
            id,
            owner: String(v.owner ?? v[0]) as Address,
            visualState,
            expiry: Number(v.expiry ?? v[2] ?? 0),
          });
        });
      }

      const votes = await resilientMulticall(client, living.map(t => ({
        address: CONTRACTS.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: 's_truceVotes',
        args: [BigInt(t.id)],
      })) as any);

      setLive(living.map((t, i) => {
        const tuple = normTuple(result(votes[i]));
        const voteEpoch = BigInt((tuple[0] as bigint | undefined) ?? 0n);
        const voteOwner = String(tuple[1] ?? ZERO_ADDRESS) as Address;
        const voteValid = voteEpoch === epoch && voteOwner.toLowerCase() === t.owner.toLowerCase();
        return { ...t, voteEpoch, voteOwner, voteValid };
      }));
      setLastReadAt(Date.now());
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Could not read the final table.');
    } finally {
      setLoading(false);
    }
  }, [client, active, supply, p.isSettled]);

  useEffect(() => {
    if (!active) { setLive([]); return; }
    void refresh();
    const timer = setInterval(() => void refresh(), p.isSettled ? 30000 : 6000);
    return () => clearInterval(timer);
  }, [active, refresh, p.isSettled]);

  const voted = useMemo(() => live.filter(t => t.voteValid).length, [live]);
  const truceOpen = p.currentPhase === 'LAST_SUPPER' && p.aliveCount > 1n && p.aliveCount <= p.truceThreshold;
  const unanimous = truceOpen && live.length > 1 && live.length === Number(p.aliveCount) && voted === live.length;
  const sole = live.length === 1 ? live[0] : undefined;
  const myLive = address ? live.filter(t => t.owner.toLowerCase() === address.toLowerCase()) : [];
  const myVotes = myLive.filter(t => t.voteValid).length;

  return { active, live, voted, truceOpen, unanimous, sole, myLive, myVotes, loading, error, refresh, lastReadAt };
}

export function useSettlementEntitlement() {
  const p = useAtomValue(protocolAtom);
  const client = usePublicClient();
  const { address } = useAccount();
  const [state, setState] = useState({
    shares: 0n,
    totalShares: 0n,
    ethSnapshot: 0n,
    wethSnapshot: 0n,
    totalClaimedShares: 0n,
    tiebreakCandidate: 0n,
    loading: false,
    error: null as string | null,
  });

  const refresh = useCallback(async () => {
    if (!client || !p.isSettled) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const requests: any[] = [
        { address: CONTRACTS.prizeVault, abi: PRIZE_VAULT_ABI, functionName: 'getTotalShares' },
        { address: CONTRACTS.prizeVault, abi: PRIZE_VAULT_ABI, functionName: 'getEthSnapshot' },
        { address: CONTRACTS.prizeVault, abi: PRIZE_VAULT_ABI, functionName: 'getWethSnapshot' },
        { address: CONTRACTS.prizeVault, abi: PRIZE_VAULT_ABI, functionName: 'getTotalClaimedShares' },
        { address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: 's_tiebreakCandidate' },
      ];
      if (address) requests.push({ address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: 'getWinningShares', args: [address] });
      const rows = await resilientMulticall(client, requests as any);
      const value = (i: number) => BigInt((result(rows[i]) as bigint | undefined) ?? 0n);
      setState({
        totalShares: value(0),
        ethSnapshot: value(1),
        wethSnapshot: value(2),
        totalClaimedShares: value(3),
        tiebreakCandidate: value(4),
        shares: address ? value(5) : 0n,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e?.shortMessage || e?.message || 'Could not read settlement.' }));
    }
  }, [client, p.isSettled, address]);

  useEffect(() => {
    if (!p.isSettled) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 6000);
    return () => clearInterval(timer);
  }, [p.isSettled, refresh]);

  const ethClaim = state.totalShares > 0n ? state.ethSnapshot * state.shares / state.totalShares : 0n;
  const wethClaim = state.totalShares > 0n ? state.wethSnapshot * state.shares / state.totalShares : 0n;
  return { ...state, ethClaim, wethClaim, refresh, address };
}
