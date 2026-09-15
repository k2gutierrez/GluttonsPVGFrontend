'use client';
import { useEffect } from 'react';
export default function ErrorBoundary({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error('[Gluttons route error]',error)},[error]);
 return <main className="page-shell"><section className="panel error-state protocol-hard-sync"><div className="kicker">runtime recovery</div><h1>TERMINAL INTERRUPTED.</h1><p>The interface hit a runtime error. No blockchain state is inferred from this failure.</p><div className="flex flex-wrap gap-3"><button className="action-btn" onClick={reset}>RETRY VIEW</button><button className="ghost-btn" onClick={()=>window.location.assign('/')}>RETURN LIVE</button></div></section></main>;
}
