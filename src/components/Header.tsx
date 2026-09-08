'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAtomValue } from 'jotai';
import { protocolAtom } from '@/state/game';
import { ACTIVE_CHAIN, SITE } from '@/lib/constants';
import { useProtocolStage } from '@/hooks/useProtocolStage';
import { useFX } from '@/components/fx/FXProvider';

export function Header({ isolated = false }: { isolated?: boolean }) {
  const p = useAtomValue(protocolAtom);
  const stage = useProtocolStage();
  const fx = useFX();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isolated) return <header className="site-header"><div className="header-inner isolated-header"><Link href="/communities" className="brand">GLUTTONS<span>//</span><em>COMMUNITIES</em></Link><div className="header-actions ml-auto flex items-center gap-3"><SoundButton/><ConnectButton chainStatus="icon" accountStatus="address" showBalance={false}/></div></div></header>;

  const links = stage === 'mint'
    ? [{ href: '/', label: 'MINT' }, { href: '/rules', label: 'RULES' }]
    : [{ href: '/', label: 'LIVE' }, { href: '/my-gluttons', label: 'MY GLUTTONS' }, { href: '/leaderboard', label: 'LEADERBOARD' }, { href: '/rules', label: 'RULES' }];

  return <header className="site-header">
    <div className="header-inner">
      <Link href="/" className="brand">GLUTTONS<span>//</span></Link>
      {stage !== 'awareness' && <nav className="main-nav">
        {links.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        {stage === 'live' && <a href={SITE.openSeaUrl} target="_blank">OPENSEA ↗</a>}
      </nav>}
      <div className="header-actions ml-auto flex items-center gap-3">
        <span className="header-network hidden text-[9px] uppercase tracking-[.18em] text-zinc-600 lg:block">{ACTIVE_CHAIN.name.toUpperCase()} / {stage === 'awareness' ? 'PRE-MINT_SIGNAL' : stage === 'mint' ? (p.preMintEnd ? 'PUBLIC_MINT' : 'COMMUNITY_PRE_MINT') : p.currentPhase}</span>
        <button data-fx-sound onClick={fx.toggleSound} className="sound-toggle" aria-label="Toggle interface sound">SND {fx.sound ? 'ON' : 'OFF'}</button>
        {stage !== 'awareness' && <div className="wallet-connect"><ConnectButton chainStatus="icon" accountStatus="address" showBalance={false}/></div>}
        {stage !== 'awareness' && <button className="mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? 'CLOSE' : 'MENU'}</button>}
      </div>
    </div>
    {stage !== 'awareness' && menuOpen && <nav id="mobile-nav" className="mobile-nav">
      {links.map(l => <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</Link>)}
      {stage === 'live' && <a href={SITE.openSeaUrl} target="_blank" onClick={() => setMenuOpen(false)}>OPENSEA ↗</a>}
    </nav>}
  </header>;
}
function SoundButton(){const fx=useFX();return <button data-fx-sound onClick={fx.toggleSound} className="sound-toggle">SND {fx.sound?'ON':'OFF'}</button>}
