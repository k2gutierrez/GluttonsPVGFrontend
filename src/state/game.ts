import { atom } from 'jotai';
export type GlobalView={aliveCount:bigint;currentMealSeconds:bigint;isSettled:boolean;currentPhase:string};
export const globalViewAtom=atom<GlobalView|null>(null);
