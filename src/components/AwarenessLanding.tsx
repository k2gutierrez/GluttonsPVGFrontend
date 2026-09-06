'use client';
import { useState } from 'react';
import { isAddress } from 'viem';
import { toast } from 'sonner';
import { Header } from './Header';
import { Panel, Kicker } from './Terminal';
import { FlipWord, MorphTicker, Scramble, WeightWord } from '@/components/fx/RetroText';
import { PreRevealArt } from './PreRevealArt';
import { SITE } from '@/lib/constants';

export function AwarenessLanding() {
  const [followed, setFollowed] = useState(false); const [wallet, setWallet] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  async function submit() {
    if (!followed) return toast.error('Complete the follow step first.');
    if (!isAddress(wallet.trim())) return toast.error('Enter a valid EVM wallet address.');
    setBusy(true);
    try {
      const r = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet: wallet.trim(), followAck: true }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Registration failed.');
      setDone(true); toast.success('Wallet received.');
    } catch (e: any) { toast.error(e?.message || 'Registration failed.'); }
    finally { setBusy(false); }
  }
  return <><Header/><main className="page-shell awareness-page">
    <div className="ambient-word ambient-a"><WeightWord word="HUNGER"/></div><div className="ambient-word ambient-b"><FlipWord word="FEED"/></div>
    <section className="awareness-grid">
      <Panel className="hero-panel p-6 md:p-10 lg:p-12">
        <Kicker>pre-mint signal</Kicker>
        <MorphTicker/>
        <div className="hero-layout">
          <div>
            <h1 className="mega-title idle-glitch" data-text="SOMETHING IS HUNGRY."><Scramble loop>SOMETHING IS HUNGRY.</Scramble></h1>
            <p className="hero-sub">A finite onchain experiment is coming.</p>
            <div className="hero-stat"><strong>2,000</strong><span>WILL ENTER</span></div>
            <div className="brand-lines"><span>STAY ALIVE. HOWEVER YOU CAN.</span><b>THE DEAD BECOME FOOD. THE LIVING TOO.</b><span>THE POT KEEPS GROWING.</span></div>
          </div>
          <PreRevealArt/>
        </div>
      </Panel>
      <Panel className="register-panel p-6 md:p-8">
        <Kicker>secure a spot</Kicker>
        <h2 className="section-title">FOLLOW. REGISTER. WAIT.</h2>
        <p className="muted-copy">No wallet connection. No signature. Registration is an eligibility record, not a guaranteed mint.</p>
        {done ? <div className="success-terminal"><span>STATUS::REGISTERED</span><strong>WALLET RECEIVED.</strong><p>Watch @GluttonGame for the next signal.</p></div> : <div className="register-steps">
          <div className="step-row"><span>01</span><div><b>FOLLOW @GLUTTONGAME</b><small>Opens X in a new tab.</small><a data-fx-sound href={SITE.xUrl} target="_blank" onClick={() => setFollowed(true)} className="ghost-btn block text-center">FOLLOW ON X ↗</a></div></div>
          <div className="step-row"><span>02</span><div><b>VERIFY STEP</b><small>UX acknowledgement only — not an X API verification.</small><button data-fx-sound onClick={() => setFollowed(true)} className={`ghost-btn w-full ${followed ? 'verified' : ''}`}>{followed ? 'VERIFIED ✓' : 'MARK FOLLOW COMPLETE'}</button></div></div>
          <div className="step-row"><span>03</span><div><b>ENTER WALLET</b><small>Paste your EVM wallet. Do not connect.</small><input value={wallet} onChange={e => setWallet(e.target.value)} placeholder="0xYourWalletAddress…" autoCapitalize="off" autoCorrect="off"/></div></div>
          <div className="step-row"><span>04</span><div><b>SECURE SPOT</b><small>Submit registration.</small><button data-fx-sound onClick={submit} disabled={busy || !followed || !wallet} className="action-btn w-full">{busy ? 'TRANSMITTING…' : 'SECURE MY SPOT'}</button></div></div>
        </div>}
        <div className="no-connect">NO CONNECT. NO SIGNATURE.<br/><span>We only collect the submitted wallet.</span></div>
      </Panel>
    </section>
    <div className="retro-marquee" aria-hidden="true"><div>HUNGER // HUNGER // FEED // ROT // SURVIVE // DEVOUR // 01000111 01001100 01010101 01010100 01010100 01001111 01001110 01010011 //</div></div>
  </main></>;
}
