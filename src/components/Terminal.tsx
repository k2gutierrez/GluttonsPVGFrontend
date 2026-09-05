'use client';
import { useEffect,useState } from 'react';
export function Scramble({children}:{children:string}){const [v,setV]=useState(children);useEffect(()=>{let i=0;const chars='01$#<>/\\*+-';const t=setInterval(()=>{setV(children.split('').map((c,j)=>j<i?c:(c===' '?c:chars[Math.floor(Math.random()*chars.length)])).join(''));i+=1.5;if(i>=children.length){clearInterval(t);setV(children)}},22);return()=>clearInterval(t)},[children]);return <>{v}</>}
export function Panel({children,className=''}:{children:React.ReactNode,className?:string}){return <section className={`terminal-panel ${className}`}>{children}</section>}
export function Kicker({children}:{children:React.ReactNode}){return <div className="mb-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#ff5b2e]">// {children}</div>}
