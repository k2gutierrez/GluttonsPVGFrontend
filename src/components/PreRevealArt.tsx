'use client';
import { useState } from 'react';
import { ASSETS } from '@/lib/constants';

export function PreRevealArt({ compact = false }: { compact?: boolean }) {
  const [broken, setBroken] = useState(false);
  return <div className={`pre-reveal-shell ${compact ? 'compact' : ''}`}>
    <div className="pre-reveal-grid" />
    {!broken ? <img src={ASSETS.preReveal} onError={() => setBroken(true)} alt="Gluttons pre-reveal" className="pre-reveal-image" /> : <div className="pre-reveal-fallback">?</div>}
    <div className="pre-eyes"><i/><i/></div>
    <div className="pre-label">UNREVEALED // SIGNAL DETECTED</div>
  </div>;
}
