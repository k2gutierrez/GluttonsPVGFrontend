import { NextResponse } from 'next/server';
import { getConsistentToken } from '@/server/read-service';
import { deriveStatus } from '@/lib/read-model';
import { ASSETS, SITE } from '@/lib/constants';
export const runtime='nodejs';export const dynamic='force-dynamic';

const resolveExternal=(uri:string)=>uri.startsWith('ipfs://')?`${SITE.ipfsGateway}${uri.slice(7)}`:uri.startsWith('ar://')?`https://arweave.net/${uri.slice(5)}`:uri;

function decodeDataJson(uri: string): any | null {
  try {
    const comma = uri.indexOf(',');
    if (comma < 0) return null;
    const head = uri.slice(0, comma);
    const body = uri.slice(comma + 1);
    const json = head.includes(';base64') ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body);
    return JSON.parse(json);
  } catch { return null; }
}

// Server-side image resolution: the browser never depends on third-party
// CORS/redirects. Alive tokens point to a per-token JSON; dead tokens embed
// onchain base64 JSON with the fresh/rotten image URL inside.
async function imageFor(tokenUri: string, visualState: number): Promise<string> {
  if (visualState === 1 || visualState === 0) {
    if (!tokenUri || tokenUri.startsWith('data:')) return ASSETS.fallbackAlive;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(resolveExternal(tokenUri), { signal: ctl.signal, cache: 'no-store' });
      if (r.ok) {
        const meta: any = await r.json();
        const img = resolveExternal(String(meta?.image || meta?.image_url || meta?.animation_url || ''));
        if (img) return img;
      }
    } catch { /* fall through to fallback */ }
    finally { clearTimeout(t); }
    return ASSETS.fallbackAlive;
  }
  const meta = decodeDataJson(tokenUri);
  const img = resolveExternal(String(meta?.image || ''));
  if (img) return img;
  return visualState === 3 ? ASSETS.fallbackRotten : ASSETS.fallbackFresh;
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const{id}=await params;const n=Number(id);if(!Number.isSafeInteger(n)||n<=0)return NextResponse.json({error:'BAD_TOKEN_ID'},{status:400});const snap=await getConsistentToken(n);if(!snap)return NextResponse.json({error:'INDEXER_BOOTSTRAPPING'},{status:503});if(snap.outOfRange||!snap.token||snap.token.burned)return NextResponse.json({error:'TOKEN_UNAVAILABLE'},{status:404});const status=deriveStatus(snap.token,snap.protocol);const image=await imageFor(String(snap.token.tokenUri||''),Number(snap.token.visualState||0));return NextResponse.json({tokenUri:snap.token.tokenUri||'',visualState:snap.token.visualState,status,image,pending:!snap.token.tokenUri},{headers:{'Cache-Control':snap.token.tokenUri?'public, max-age=60, s-maxage=120, stale-while-revalidate=600':'public, max-age=2, s-maxage=5, stale-while-revalidate=30'}});}catch(e:any){return NextResponse.json({error:e?.message||'METADATA_READ_FAILED'},{status:503,headers:{'Cache-Control':'no-store'}});}}
