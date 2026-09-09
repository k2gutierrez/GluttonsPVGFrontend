import { GAME_HOUR_SECONDS } from '@/lib/constants';

export const gameSeconds = (realSeconds: number, gameHourSeconds = GAME_HOUR_SECONDS) => Math.max(0, realSeconds) * (3600 / Math.max(1, gameHourSeconds));
export const gameClock = (realSeconds: number, gameHourSeconds = GAME_HOUR_SECONDS) => {
  const n = Math.max(0, Math.floor(gameSeconds(realSeconds, gameHourSeconds)));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};
export const gameHours = (realSeconds: number, gameHourSeconds = GAME_HOUR_SECONDS) => Math.max(0, realSeconds) / Math.max(1, gameHourSeconds);
