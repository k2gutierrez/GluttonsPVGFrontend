'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useAtomValue } from 'jotai';
import type { Address } from 'viem';
import { protocolAtom } from '@/state/game';
import { CONTRACTS, GAME_ENGINE_ABI, GLUTTON_NFT_ABI, INSPECTOR_ABI, ZERO_ADDRESS } from '@/lib/constants';
import { metadataImage } from '@/lib/metadata';

export type GluttonToken = {
  id: number;
  owner: Address;
  visualState: number;
  expiry: number;
  isHungry: boolean;
  tokenUri: string;
  image: string;
  poisonCooldownUntil: number;
  poisonProtectedUntil: number;
  finalBiteDeadline: number;
  deadAt: number;
  spoilCheckpoint: number;
  poweredUntil: number;
  spoilQ4: number;
  fasting: boolean;
  deathSettled: boolean;
};

const chunks = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));
const okResult = (r: any) => r?.status === 'success' ? r.result : undefined;

// Reviewed contract lock: GameEngine.getVisualState() now applies the same
// refrigerated spoilage math used by gameplay. Inspector visualState is therefore
// the canonical frontend Fresh/Rotten source — do not re-implement spoilage here.
export function isGameplayFresh(t: GluttonToken) {
  return t.visualState === 2;
}

export function statusOf(t: GluttonToken, now = Math.floor(Date.now() / 1000)) {
  if (t.visualState === 2) return 'FRESH';
  if (t.visualState === 3) return 'ROTTEN';
  if (t.finalBiteDeadline > now) return 'FINAL BITE';
  if (t.fasting) return 'FASTING';
  if (t.isHungry) return 'HUNGRY';
  return 'ALIVE';
}

export function useOwnedGluttons() {
  const { address } = useAccount();
  const client = usePublicClient();
  const p = useAtomValue(protocolAtom);
  const [tokens, setTokens] = useState<GluttonToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce(x => x + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!client || !address || CONTRACTS.gluttonNFT === ZERO_ADDRESS || CONTRACTS.inspector === ZERO_ADDRESS || p.totalMinted === 0n) {
        setTokens([]); return;
      }
      setLoading(true); setError(null);
      try {
        const total = Math.min(Number(p.totalMinted), 2000);
        const ids = Array.from({ length: total }, (_, i) => i + 1);
        const owned: number[] = [];
        // ERC721A/721AC is not ERC721Enumerable. Scan ownerOf in multicall batches.
        // Burned IDs revert and are safely ignored with allowFailure.
        for (const batch of chunks(ids, 250)) {
          const res = await client.multicall({
            allowFailure: true,
            contracts: batch.map(id => ({ address: CONTRACTS.gluttonNFT, abi: GLUTTON_NFT_ABI, functionName: 'ownerOf', args: [BigInt(id)] })) as any,
          });
          res.forEach((r: any, i) => {
            const owner = okResult(r) as Address | undefined;
            if (owner && owner.toLowerCase() === address.toLowerCase()) owned.push(batch[i]);
          });
        }
        if (cancelled) return;
        const raw: GluttonToken[] = [];
        for (const batch of chunks(owned, 100)) {
          const [views, states, uris] = await Promise.all([
            client.multicall({ allowFailure: true, contracts: batch.map(id => ({ address: CONTRACTS.inspector, abi: INSPECTOR_ABI, functionName: 'getTokenView', args: [BigInt(id)] })) as any }),
            client.multicall({ allowFailure: true, contracts: batch.map(id => ({ address: CONTRACTS.gameEngine, abi: GAME_ENGINE_ABI, functionName: 's_tokenStates', args: [BigInt(id)] })) as any }),
            client.multicall({ allowFailure: true, contracts: batch.map(id => ({ address: CONTRACTS.gluttonNFT, abi: GLUTTON_NFT_ABI, functionName: 'tokenURI', args: [BigInt(id)] })) as any }),
          ]);
          batch.forEach((id, i) => {
            const v: any = okResult(views[i]);
            const s: any = okResult(states[i]);
            const uri = String(okResult(uris[i]) || '');
            if (!v) return;
            const arr = Array.isArray(s) ? s : [];
            raw.push({
              id,
              owner: v.owner as Address,
              visualState: Number(v.visualState),
              expiry: Number(v.expiry),
              isHungry: Boolean(v.isHungry),
              tokenUri: uri,
              image: '',
              poisonCooldownUntil: Number(arr[1] || 0),
              poisonProtectedUntil: Number(arr[2] || 0),
              finalBiteDeadline: Number(arr[3] || 0),
              deadAt: Number(arr[4] || 0),
              spoilCheckpoint: Number(arr[5] || 0),
              poweredUntil: Number(arr[6] || 0),
              spoilQ4: Number(arr[7] || 0),
              fasting: Boolean(arr[8]),
              deathSettled: Boolean(arr[9]),
            });
          });
        }
        const hydrated = await Promise.all(raw.map(async t => ({ ...t, image: await metadataImage(t.tokenUri, t.visualState) })));
        if (!cancelled) setTokens(hydrated.sort((a, b) => a.id - b.id));
      } catch (e: any) {
        if (!cancelled) setError(e?.shortMessage || e?.message || 'Could not load wallet inventory.');
      } finally { if (!cancelled) setLoading(false); }
    }
    run();
    return () => { cancelled = true; };
  }, [client, address, p.totalMinted, p.gameStart, nonce]);

  return { tokens, loading, error, refresh, address };
}
