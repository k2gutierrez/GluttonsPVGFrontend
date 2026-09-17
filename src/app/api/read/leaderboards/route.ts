import { NextResponse } from 'next/server';
import { requireStore, K } from '@/server/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = { wallet: string; count: number; rank: number };
const top50 = (hash: Record<string, string> | null): Row[] =>
  Object.entries(hash || {})
    .map(([wallet, count]) => ({ wallet, count: Number(count) || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.wallet.localeCompare(b.wallet))
    .slice(0, 50)
    .map((r, i) => ({ ...r, rank: i + 1 }));

export async function GET() {
  try {
    const store = requireStore();
    const [poisons, feeds] = await Promise.all([
      store.hgetall<Record<string, string>>(K.poisons),
      store.hgetall<Record<string, string>>(K.feeds),
    ]);
    return NextResponse.json(
      { poisons: top50(poisons), feeds: top50(feeds), asOf: Date.now() },
      { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'LEADERBOARDS_UNAVAILABLE' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
