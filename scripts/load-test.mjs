const base=(process.env.LOAD_TEST_URL||'').replace(/\/$/,'');
if(!base) throw new Error('Set LOAD_TEST_URL=https://your-staging-domain');
if(process.env.LOAD_TEST_CONFIRM!=='YES') throw new Error('Safety lock: set LOAD_TEST_CONFIRM=YES. Run this only against staging or an approved production test window.');
const vus=Math.max(1,Number(process.env.LOAD_TEST_VUS||2000));
const duration=Math.max(10,Number(process.env.LOAD_TEST_DURATION_SEC||60))*1000;
const maxConcurrent=Math.max(10,Number(process.env.LOAD_TEST_CONCURRENCY||300));
const errorThreshold=Math.max(0,Number(process.env.LOAD_TEST_MAX_ERROR_RATE||0.01));
const lat=[];const statuses=new Map();let ok=0,fail=0,active=0;const queue=[];const start=Date.now();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function q(p){if(!lat.length)return 0;return lat[Math.min(lat.length-1,Math.floor((lat.length-1)*p))]||0;}
async function request(path){while(active>=maxConcurrent)await sleep(5);active++;const t=performance.now();try{const r=await fetch(base+path,{headers:{accept:'application/json','x-load-test':'gluttons-v2.2'},cache:'no-store'});lat.push(performance.now()-t);statuses.set(r.status,(statuses.get(r.status)||0)+1);if(r.ok||r.status===409)ok++;else fail++;}catch{lat.push(performance.now()-t);statuses.set('network',(statuses.get('network')||0)+1);fail++;}finally{active--;}}
function jitter(baseMs,pct=.25){return Math.max(500,Math.round(baseMs*(1-pct+Math.random()*pct*2)));}
async function virtualUser(id){
 // Arrival wave: every viewer loads protocol; a quarter are simultaneously looking at Stadium.
 await sleep(Math.floor((id/vus)*5000)+Math.floor(Math.random()*400));
 await request('/api/read/protocol');if(id%4===0)await request('/api/read/stadium?v=load');
 let nextProtocol=Date.now()+jitter(10_000),nextStadium=Date.now()+jitter(30_000),nextEndgame=Date.now()+jitter(35_000);
 const end=start+duration;
 while(Date.now()<end){const now=Date.now();if(now>=nextProtocol){await request('/api/read/protocol');nextProtocol=Date.now()+jitter(10_000);}if(now>=nextStadium){await request('/api/read/stadium?v=load');nextStadium=Date.now()+jitter(30_000);}if(id%10===0&&now>=nextEndgame){await request('/api/read/endgame?v=load');nextEndgame=Date.now()+jitter(35_000);}await sleep(150+Math.floor(Math.random()*250));}
}
console.log(`Starting Gluttons sustained read-layer load test: ${vus} virtual users / ${duration/1000}s / max ${maxConcurrent} in-flight HTTP requests`);
for(let i=0;i<vus;i++)queue.push(virtualUser(i));
await Promise.all(queue);while(active)await sleep(20);
lat.sort((a,b)=>a-b);const total=ok+fail,elapsed=(Date.now()-start)/1000,errorRate=total?fail/total:1;
const report={virtualUsers:vus,duration_sec:Number(elapsed.toFixed(1)),requests:total,rps:Number((total/elapsed).toFixed(1)),ok,fail,error_rate:Number(errorRate.toFixed(4)),p50_ms:Number(q(.5).toFixed(1)),p95_ms:Number(q(.95).toFixed(1)),p99_ms:Number(q(.99).toFixed(1)),statuses:Object.fromEntries(statuses)};
console.log(JSON.stringify(report,null,2));
if(errorRate>errorThreshold){console.error(`FAIL error rate ${(errorRate*100).toFixed(2)}% > ${(errorThreshold*100).toFixed(2)}%`);process.exit(2);}console.log('PASS load-test error threshold. Review p95/p99 and origin/CDN metrics before launch.');
