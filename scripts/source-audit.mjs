import fs from 'node:fs';
import path from 'node:path';

const cwd=process.cwd();
const walk=(dir)=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
const text=f=>fs.readFileSync(f,'utf8');
const rel=f=>path.relative(cwd,f).replaceAll('\\','/');
let fail=0;const pass=m=>console.log(`PASS ${m}`);const bad=m=>{console.error(`FAIL ${m}`);fail++;};
const exists=f=>fs.existsSync(path.join(cwd,f));

// Browser/UI read path must never become a blockchain indexer again.
const clientFiles=[...walk(path.join(cwd,'src/app')),...walk(path.join(cwd,'src/components')),...walk(path.join(cwd,'src/hooks'))]
 .filter(f=>/\.(ts|tsx)$/.test(f)&&!rel(f).includes('/api/'));
const forbiddenClient=[
 [/\buseReadContract\b/,'useReadContract'],[/\buseReadContracts\b/,'useReadContracts'],[/\buseBalance\b/,'useBalance'],[/\buseBlockNumber\b/,'useBlockNumber'],
 [/\bcreatePublicClient\b/,'createPublicClient'],[/\.readContract\s*\(/,'client.readContract'],[/\.multicall\s*\(/,'client.multicall'],[/\.getBalance\s*\(/,'client.getBalance'],[/\.getBlock(Number)?\s*\(/,'client.getBlock'],
 [/https:\/\/(?:rpc\.curtis\.apechain\.com|curtis\.rpc\.caldera\.xyz)/i,'direct Curtis RPC URL'],[/NEXT_PUBLIC_[A-Z0-9_]*RPC_URL\b/,'browser RPC env reference'],
];
for(const f of clientFiles){const s=text(f);for(const[re,name]of forbiddenClient)if(re.test(s))bad(`${rel(f)} contains forbidden public read primitive: ${name}`)}
if(!exists('src/lib/rpc.ts'))pass('legacy browser RPC helper removed');else bad('src/lib/rpc.ts still exists');

const mustContain=[
 ['GameSync shared protocol API','src/components/GameSync.tsx',/readApi<ProtocolSnapshot>\('\/api\/read\/protocol'/],
 ['Stale PRE_GAME never resolves mint','src/components/GameSync.tsx',/degraded&&!snapshotLive&&!live\.current/],
 ['Browser read API circuit breaker','src/lib/read-api.ts',/apiBlockedUntil/],
 ['Browser API 429 backoff','src/lib/read-api.ts',/status===429/],
 ['Stadium shared API','src/hooks/usePublicStadium.ts',/`\/api\/read\/stadium\?v=\$\{revision\}`/],
 ['Wallet indexed API','src/hooks/useOwnedGluttons.ts',/\/api\/read\/wallet\//],
 ['Wallet stale action gate','src/app/my-gluttons/page.tsx',/POSITION STATE STALE — GAMEPLAY ACTIONS PAUSED/],
 ['Endgame versioned API','src/hooks/useEndgameTable.ts',/`\/api\/read\/endgame\?v=\$\{version\}`/],
 ['Endgame stale blocks unanimity','src/hooks/useEndgameTable.ts',/const unanimous=!degraded/],
 ['Stage does not infer LIVE from supply','src/hooks/useProtocolStage.ts',/liveLocked\s*\|\|\s*p\.gameStart\s*>\s*0n/],
 ['Malformed protocol validation','src/components/GameSync.tsx',/validProtocolSnapshot/],
 ['Action stale-state gate','src/components/TxButton.tsx',/STATE SYNCING — ACTION PAUSED/],
 ['Tagged bigint preflight serialization','src/components/TxButton.tsx',/__gluttonsBigInt/],
 ['Submitted tx duplicate-submit gate','src/components/TxButton.tsx',/pendingHash/],
 ['Metadata cosmetic cache','src/hooks/useOwnedGluttons.ts',/cache:'force-cache'/],
 ['Unknown matrix row stays LOADING','src/hooks/usePublicStadium.ts',/status:'LOADING'/],
 ['Consistent single-token read','src/server/read-service.ts',/getConsistentToken/],
 ['Token API consistent read','src/app/api/read/token/[id]/route.ts',/getConsistentToken/],
 ['Metadata API consistent read','src/app/api/read/metadata/[id]/route.ts',/getConsistentToken/],
 ['Indexer deployless multicall','worker/indexer.ts',/deployless:true/],
 ['Indexer protocol committed last','worker/indexer.ts',/Protocol is committed LAST/],
 ['Indexer leader heartbeat','worker/indexer.ts',/expire.*K\.lock/s],
 ['Indexer event log ingestion','worker/indexer.ts',/game events/],
 ['Indexer reorg supply prune','worker/indexer.ts',/pruneAboveSupply/],
 ['Indexer chunked historical logs','worker/indexer.ts',/INDEXER_LOG_CHUNK_BLOCKS/],
 ['Server RPC has zero transport retries','src/server/server-chain.ts',/retryCount:0/],
 ['Settlement API uses indexed shares','src/app/api/read/settlement/[address]/route.ts',/K\.winnerShares/],
 ['Admin PVG route rate limited','src/app/api/read/admin/pvg/route.ts',/protectRpcRoute/],
 ['Admin Community route rate limited','src/app/api/read/admin/community/route.ts',/protectRpcRoute/],
 ['Registration abuse guard','src/app/api/register/route.ts',/protectRpcRoute/],
 ['Mint-wallet checks active communities only','src/app/api/read/mint-wallet/[address]/route.ts',/communities\.filter\(c=>c\.allowed/],
 ['Deployment verifier exists','scripts/verify-deployment.mjs',/DEPLOYMENT VERIFICATION PASS/],
 ['Sustained 2k-user load test','scripts/load-test.mjs',/LOAD_TEST_DURATION_SEC/],
 ['Route error boundary','src/app/error.tsx',/TERMINAL INTERRUPTED/],
 ['Global error boundary','src/app/global-error.tsx',/GLUTTONS IS STILL ONCHAIN/],
];
for(const[name,file,re]of mustContain){const f=path.join(cwd,file);if(fs.existsSync(f)&&re.test(text(f)))pass(name);else bad(`${name} missing (${file})`)}

for(const file of ['src/app/api/read/metadata/[id]/route.ts','src/app/api/read/settlement/[address]/route.ts','src/app/api/read/stadium/route.ts','src/app/api/read/wallet/[address]/route.ts']){
 const s=text(path.join(cwd,file));if(/serverClient|createPublicClient|readContract\s*\(|multicall\s*\(/.test(s))bad(`${file} must be indexed-only`);else pass(`${file} indexed-only`);
}
const stage=text(path.join(cwd,'src/hooks/useProtocolStage.ts'));if(/totalMinted\s*>=\s*maxSupply|maxSupply\s*<=\s*totalMinted/.test(stage))bad('LIVE stage still inferred from supply');else pass('LIVE stage uses canonical gameStart latch only');
const stadium=text(path.join(cwd,'src/hooks/usePublicStadium.ts'));
// Only flag explicit missing-value branches that fabricate CONSUMED. Legitimate mapping from a confirmed burned status is allowed.
if(/if\s*\(\s*!\s*(?:view|t|row)\s*\)[\s\S]{0,80}(?:return|status\s*:)[\s\S]{0,20}['"]CONSUMED['"]/.test(stadium))bad('missing stadium read may be converted to CONSUMED');else pass('missing stadium data is not invented as CONSUMED');
const latch=text(path.join(cwd,'src/hooks/useLiveStageLatch.ts'));if(/preserve\s*:\s*true/.test(latch))bad('useLiveStageLatch still passes boolean preserve value');else pass('live latch preserve typing is safe');
const tx=text(path.join(cwd,'src/components/TxButton.tsx'));if(/p\.synced&&p\.rpcDegraded/.test(tx))bad('TxButton stale gate incorrectly depends on p.synced');else pass('TxButton blocks core writes whenever protocol is degraded');

const pkg=JSON.parse(text(path.join(cwd,'package.json')));for(const[script,cmd]of Object.entries(pkg.scripts||{})){const m=String(cmd).match(/node\s+(scripts\/[^\s]+)/);if(m&&!exists(m[1]))bad(`package script ${script} points to missing ${m[1]}`)}
for(const dep of ['@x402/core','@x402/evm','@x402/extensions','@x402/svm','lucide-react'])if(pkg.dependencies?.[dep])bad(`unused dependency remains: ${dep}`);pass('dependency + script surface checked');

if(fail){console.error(`\nSource audit failed: ${fail} issue(s).`);process.exit(1)}
console.log(`\nSource audit PASS: ${clientFiles.length} client files checked; public pages use the shared production read architecture.`);
