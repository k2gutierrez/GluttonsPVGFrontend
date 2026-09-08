'use client';
import { useEffect } from 'react';

const code = [
  '0x19A7 // HUNGER_CLOCK', 'FEED(tokenId)', '01001000 01010101 01001110 01000111 01000101 01010010',
  'METABOLISM::DECAY', 'ownerOf(tokenId)', 'KEEP_FRESH // 24H', 'POISON_TARGET != SELF',
  'THE_POT_KEEPS_GROWING', 'DEAD => FRESH => ROTTEN', 'ONCHAIN::LIVE', 'STAY_ALIVE()',
];

export function AmbientFX() {
  useEffect(() => {
    const io = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-visible', e.isIntersecting)), { threshold: 0.12 });
    const observe = () => document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(n => io.observe(n));
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io.disconnect(); };
  }, []);
  return <>
    <div className="scanline" />
    <div className="crt-vignette" />
    <div className="noise-layer" />
    <div className="code-rain" aria-hidden="true">
      {code.map((x, i) => <span key={x} style={{ left: `${4 + (i * 9.1) % 92}%`, animationDelay: `${-i * 1.37}s`, animationDuration: `${15 + (i % 5) * 4}s` }}>{x}</span>)}
    </div>
  </>;
}
