'use client';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { AwarenessLanding } from './AwarenessLanding';
import { MintStage } from './MintStage';
import { LiveDashboard } from './LiveDashboard';
import { Header } from './Header';
import { Panel, Kicker } from './Terminal';

function ProtocolSyncScreen(){
  return <><Header/><main className="page-shell"><Panel className="error-state loading-grid"><Kicker>chain state</Kicker><b>SYNCING PROTOCOL</b><p>Reading the current GameEngine state. Mint and gameplay UI stay locked until the chain answers.</p></Panel></main></>;
}

export function HomeRouter(){
  const stage=useProtocolStage();
  if(stage==='syncing') return <ProtocolSyncScreen/>;
  return stage==='awareness'?<AwarenessLanding/>:stage==='mint'?<MintStage/>:<LiveDashboard/>;
}
