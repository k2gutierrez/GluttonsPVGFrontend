import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TEMPORARY diagnostic endpoint — reports only the PRESENCE of environment
// variables (no values, no secrets). Remove after env wiring is confirmed.
const NAMES = [
  'APP_ORIGIN',
  'DEPLOYMENT_BLOCK',
  'RPC_URL',
  'RPC_FALLBACK_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_CHAIN_MODE',
  'NEXT_PUBLIC_GAME_HOUR_SECONDS',
  'NEXT_PUBLIC_SITE_STAGE',
  'NEXT_PUBLIC_READ_STALE_MS',
] as const;

export async function GET() {
  const envSeen: Record<string, boolean> = {};
  for (const n of NAMES) envSeen[n] = Boolean(process.env[n] && process.env[n]!.length > 0);
  return NextResponse.json({ envSeen }, { headers: { 'Cache-Control': 'no-store' } });
}
