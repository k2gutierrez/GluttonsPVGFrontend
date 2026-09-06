'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { SITE } from '@/lib/constants';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { useFX } from '@/components/fx/FXProvider';

export function Header({ isolated = false }: { isolated?: boolean }) {
  const p = useAtomValue(protocolAtom); const stage = useProtocolStage(); const fx = useFX();
  if (isolated) return <header className="site-header"><div className="header-inner"><Link href="/communities" className="brand">GLUTTONS<span>//</span><em>COMMUNITIES</em></Link><div className="ml-auto flex items-center gap-3"><SoundButton/><ConnectButton chainStatus="icon" accountStatus="address" showBalance={false}/></div></div></header>;
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand">GLUTTONS<span>//</span></Link>
    {stage !== 'awareness' && <nav className="main-nav">
      {stage === 'mint' ? <><Link href="/">MINT</Link><Link href="/rules">RULES</Link></> : <><Link href="/">LIVE</Link><Link href="/my-gluttons">MY GLUTTONS</Link><Link href="/rules">RULES</Link><a href={SITE.openSeaUrl} target="_blank">OPENSEA ↗</a></>}
    </nav>}
    <div className="ml-auto flex items-center gap-3">
      <span className="hidden text-[9px] uppercase tracking-[.18em] text-zinc-600 lg:block">CURTIS / {stage === 'awareness' ? 'PRE-MINT_SIGNAL' : stage === 'mint' ? 'MINT_OPEN' : p.currentPhase}</span>
      <button data-fx-sound onClick={fx.toggleSound} className="sound-toggle" aria-label="Toggle interface sound">SND {fx.sound ? 'ON' : 'OFF'}</button>
      {stage !== 'awareness' && <ConnectButton chainStatus="icon" accountStatus="address" showBalance={false}/>} 
    </div>
  </div></header>;
}
function SoundButton(){const fx=useFX();return <button data-fx-sound onClick={fx.toggleSound} className="sound-toggle">SND {fx.sound?'ON':'OFF'}</button>}
