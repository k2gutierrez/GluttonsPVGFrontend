'use client';
import { useEffect, useRef, useState } from 'react';
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { toast } from 'sonner';
import type { Abi, Address } from 'viem';
import { ZERO_ADDRESS } from '@/lib/constants';

export function humanError(e: any) {
  const s = String(e?.shortMessage || e?.message || e);
  const map: [string, string][] = [
    ['NotHungry', 'That action is not available at the current hunger clock.'], ['ClockTooLow', 'This clock is too low for that action.'],
['Protected', 'Target is Poison Protected. Wait for the shield timer to expire.'], ['SelfPoison', 'You cannot poison the same Glutton.'],
    ['MintClosed', 'Mint is closed. Game Start cannot be extended.'], ['MaxSupplyExceeded', 'All Gluttons have entered.'],
    ['NotOwner', 'Your connected wallet does not own the required Glutton.'], ['InvalidValue', 'Wrong transaction value. Refresh and retry.'],
    ['InvalidMintValue', 'Wrong mint value. Refresh and retry.'], ['InvalidState', 'That action is not legal in the current token or game state.'],
    ['AlreadyStarted', 'The game has already started.'], ['AlreadySettled', 'The table is already settled.'],
    ['NotLastSupper', 'This action only exists at the final table.'], ['NotUnanimous', 'The Truce is not unanimous.'],
    ['NormalMintNotAllowed', 'Public Mint is not open yet. This is still the Community Pre-Mint phase.'],
    ['PreMintPhaseEnded', 'Community Pre-Mint has ended. Use the Public Mint interface.'],
    ['MaxSupplyForInviteExceeded', 'That invited community has reached its total mint allowance.'],
    ['CommunityMintNotAllowed', 'That invited community is not active for minting.'],
    ['NotCommunityHolder', 'This wallet does not hold an NFT from the selected invited community.'],
    ['InvalidMaxPerWalletAmount', 'This mint would exceed the wallet limit for the current mint phase.'],
    ['AlreadyAllowed', 'That invited community is already active.'],
  ];
  return map.find(([k]) => s.includes(k))?.[1] || 'Transaction failed or was rejected. No confirmed state changed.';
}

export function TxButton({ label, address, abi, functionName, args = [], value, disabled = false, className = '', onConfirmed, preflight = false, successLabel = 'CONFIRMED ✓', successMs = 2200 }:
{ label: string; address: Address; abi: Abi | readonly unknown[]; functionName: string; args?: readonly unknown[]; value?: bigint; disabled?: boolean; className?: string; onConfirmed?: () => void; preflight?: boolean; successLabel?: string; successMs?: number }) {
  const { address: account } = useAccount();
  const client = usePublicClient();
  const w = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: w.data });
  const fired = useRef<string | undefined>(undefined);
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    if (receipt.isSuccess && w.data && fired.current !== w.data) {
      fired.current = w.data;
      setJustConfirmed(true);
      toast.success('Confirmed onchain.');
      onConfirmed?.();
      const timer = setTimeout(() => setJustConfirmed(false), successMs);
      return () => clearTimeout(timer);
    }
  }, [receipt.isSuccess, w.data, onConfirmed, successMs]);

  const click = async () => {
    try {
      if (preflight) {
        if (!client || !account) { toast.error('Connect the wallet and retry.'); return; }
        await client.simulateContract({ account, address, abi: abi as Abi, functionName, args, value } as any);
      }
      w.writeContract({ address, abi: abi as Abi, functionName, args, value } as any, { onSuccess: () => toast.message('Transaction submitted.'), onError: e => toast.error(humanError(e)) });
    } catch (e) {
      toast.error(humanError(e));
    }
  };
  const off = disabled || address === ZERO_ADDRESS || w.isPending || receipt.isLoading;
  const buttonText = w.isPending || receipt.isLoading ? 'CONFIRMING…' : justConfirmed ? successLabel : label;
  return <button data-fx-sound onClick={click} disabled={off} className={`action-btn ${className}`}>{buttonText}</button>;
}
