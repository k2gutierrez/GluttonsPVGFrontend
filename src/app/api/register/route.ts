import { NextResponse } from 'next/server';
import { isAddress, getAddress } from 'viem';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { requireTrustedOrigin } from '@/server/request-guard';
import { protectRpcRoute,tooMany } from '@/server/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    requireTrustedOrigin(req);
    const len=Number(req.headers.get('content-length')||0);if(len>16_384)return NextResponse.json({error:'REQUEST_TOO_LARGE'},{status:413});
    try{await protectRpcRoute(req,'register',{perIp:30,global:5000,windowSec:60})}catch(e:any){if(e?.status===429)return tooMany();throw e;}
    const body = await req.json(); const raw = String(body?.wallet || '').trim();
    if (!isAddress(raw)) return NextResponse.json({ error: 'Invalid EVM wallet.' }, { status: 400 });
    if (!body?.followAck) return NextResponse.json({ error: 'Follow step is incomplete.' }, { status: 400 });
    const wallet = getAddress(raw);
    const payload = { wallet, follow_ack: true, source: 'gluttons.fun', created_at: new Date().toISOString() };

    if (process.env.REGISTRATION_WEBHOOK_URL) {
      const r = await fetch(process.env.REGISTRATION_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.REGISTRATION_WEBHOOK_BEARER ? { authorization: `Bearer ${process.env.REGISTRATION_WEBHOOK_BEARER}` } : {}) }, body: JSON.stringify(payload) });
      if (!r.ok && r.status !== 409) return NextResponse.json({ error: 'Registration service rejected the request.' }, { status: 502 });
      return NextResponse.json({ ok: true });
    }
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const r = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/glutton_registrations`, {
        method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(payload),
      });
      if (!r.ok && r.status !== 409) return NextResponse.json({ error: 'Could not persist registration.' }, { status: 502 });
      return NextResponse.json({ ok: true });
    }
    if (process.env.NODE_ENV !== 'production') {
      const dir = path.join(process.cwd(), '.local-data'); await mkdir(dir, { recursive: true }); await appendFile(path.join(dir, 'registrations.ndjson'), JSON.stringify(payload) + '\n');
      return NextResponse.json({ ok: true, local: true });
    }
    return NextResponse.json({ error: 'Registration storage is not configured. Add Supabase or REGISTRATION_WEBHOOK_URL.' }, { status: 503 });
  } catch(e:any) { return NextResponse.json({ error: e?.message==='UNTRUSTED_ORIGIN'?'UNTRUSTED_ORIGIN':'Invalid registration request.' }, { status: e?.message==='UNTRUSTED_ORIGIN'?403:400 }); }
}
