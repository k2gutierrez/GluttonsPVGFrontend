import { NextResponse } from 'next/server';
import { compactEndgame } from '@/server/read-service';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{const snap=await compactEndgame();if(!snap)return NextResponse.json({error:'INDEXER_BOOTSTRAPPING'},{status:503,headers:{'Cache-Control':'no-store'}});return NextResponse.json(snap,{headers:{'Cache-Control':'public, max-age=1, s-maxage=2, stale-while-revalidate=15'}});}catch(e:any){return NextResponse.json({error:e?.message||'READ_SERVICE_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}}
