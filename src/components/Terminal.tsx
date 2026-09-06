'use client';
import { Scramble } from '@/components/fx/RetroText';
export { Scramble };
export function Panel({ children, className = '', reveal = true }: { children: React.ReactNode; className?: string; reveal?: boolean }) {
  return <section data-reveal={reveal ? '' : undefined} className={`terminal-panel ${className}`}>{children}</section>;
}
export function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 font-mono text-[10px] uppercase tracking-[.22em] text-[#ff6238]">// {children}</div>;
}
