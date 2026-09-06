'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type FXContextValue = { sound: boolean; toggleSound: () => void; blip: (pitch?: number) => void };
const FXContext = createContext<FXContextValue>({ sound: false, toggleSound: () => {}, blip: () => {} });
export const useFX = () => useContext(FXContext);

export function FXProvider({ children }: { children: React.ReactNode }) {
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const blip = useCallback((pitch = 260) => {
    if (!sound || typeof window === 'undefined') return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audio.current ||= new Ctx();
      const ctx = audio.current;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square'; o.frequency.value = pitch;
      g.gain.setValueAtTime(0.018, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.05);
    } catch {}
  }, [sound]);
  const toggleSound = useCallback(() => setSound(v => !v), []);

  useEffect(() => {
    if (!sound) return;
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('button,a,[data-fx-sound]')) blip(190 + Math.random() * 170);
    };
    document.addEventListener('mouseover', over, { passive: true });
    return () => document.removeEventListener('mouseover', over);
  }, [sound, blip]);

  const value = useMemo(() => ({ sound, toggleSound, blip }), [sound, toggleSound, blip]);
  return <FXContext.Provider value={value}>{children}</FXContext.Provider>;
}
