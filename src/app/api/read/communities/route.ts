import { NextResponse } from 'next/server'; import { requireStore,K } from '@/server/store';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(){try{const rows=await requireStore().get<any[]>(K.communities);return NextResponse.json({communities:rows||[]},{headers:{'Cache-Control':'public, s-maxage=10, stale-while-revalidate=60'}});}catch(e:any){return NextResponse.json({error:e?.message||'READ_SERVICE_UNAVAILABLE'},{status:503});}}
