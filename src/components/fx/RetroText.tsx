'use client';
import { useEffect, useMemo, useState } from 'react';

export function Scramble({ children, loop = false }: { children: string; loop?: boolean }) {
  const [v, setV] = useState(children);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    const run = () => {
      let i = 0; const chars = '01$#<>/\\*+-=[]{}';
      interval = setInterval(() => {
        setV(children.split('').map((c, j) => j < i ? c : (c === ' ' ? c : chars[Math.floor(Math.random() * chars.length)])).join(''));
        i += 1.25;
        if (i >= children.length) { clearInterval(interval); setV(children); if (loop) timer = setTimeout(run, 6500 + Math.random() * 5500); }
      }, 24);
    };
    run();
    return () => { if (interval) clearInterval(interval); if (timer) clearTimeout(timer); };
  }, [children, loop]);
  return <>{v}</>;
}

export function FlipWord({ word, className = '' }: { word: string; className?: string }) {
  return <span className={`flip-word ${className}`} aria-label={word}>{word.split('').map((c, i) => <span key={`${c}-${i}`} style={{ animationDelay: `${i * .11}s` }} aria-hidden="true">{c}</span>)}</span>;
}

export function WeightWord({ word }: { word: string }) {
  return <span className="weight-word" aria-label={word}>{word.split('').map((c, i) => <span key={`${c}-${i}`} style={{ animationDelay: `${i * .19}s` }} aria-hidden="true">{c}</span>)}</span>;
}

export function MorphTicker() {
  const words = useMemo(() => ['HUNGER', 'FEED', 'SURVIVE', 'POISON', 'DEVOUR', 'ROT', 'REPEAT'], []);
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % words.length), 2300); return () => clearInterval(t); }, [words.length]);
  return <div className="morph-ticker" aria-hidden="true"><span>SYS::</span><strong key={words[i]}>{words[i]}</strong><span>::{String(i).padStart(2, '0')}</span></div>;
}
