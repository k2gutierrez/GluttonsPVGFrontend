'use client';
import { useEffect } from 'react'; import { useAtom } from 'jotai'; import { useReadContract } from 'wagmi';
import { CONTRACTS, INSPECTOR_ABI } from '@/lib/constants'; import { globalViewAtom } from '@/state/game';
export function GameSync(){const [,set]=useAtom(globalViewAtom);const r=useReadContract({address:CONTRACTS.inspector,abi:INSPECTOR_ABI,functionName:'getGlobalView',query:{refetchInterval:8000,enabled:CONTRACTS.inspector!=='0x0000000000000000000000000000000000000000'}});useEffect(()=>{if(r.data){const d=r.data as any;set({aliveCount:d.aliveCount,currentMealSeconds:d.currentMealSeconds,isSettled:d.isSettled,currentPhase:d.currentPhase});}},[r.data,set]);return null}
