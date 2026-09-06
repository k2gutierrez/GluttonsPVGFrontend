'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MintStage } from '@/components/MintStage';
import { useProtocolStage } from '@/hooks/useProtocolStage';
export default function MintPage(){const stage=useProtocolStage();const router=useRouter();useEffect(()=>{if(stage!=='mint')router.replace('/')},[stage,router]);return stage==='mint'?<MintStage/>:null}
