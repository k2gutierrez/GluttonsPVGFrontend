import { GAME_HOUR_SECONDS } from '@/lib/constants';

export const gameSeconds = (realSeconds: number) => Math.max(0, realSeconds) * (3600 / GAME_HOUR_SECONDS);
export const gameClock = (realSeconds: number) => {
  const n = Math.max(0, Math.floor(gameSeconds(realSeconds)));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};
export const gameHours = (realSeconds: number) => Math.max(0, realSeconds) / GAME_HOUR_SECONDS;
