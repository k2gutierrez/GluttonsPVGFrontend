'use client';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { AwarenessLanding } from './AwarenessLanding';
import { MintStage } from './MintStage';
import { LiveDashboard } from './LiveDashboard';
export function HomeRouter(){const stage=useProtocolStage();return stage==='awareness'?<AwarenessLanding/>:stage==='mint'?<MintStage/>:<LiveDashboard/>}
