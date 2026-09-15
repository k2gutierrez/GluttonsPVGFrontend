import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
let ts;
try{ts=require('typescript')}catch{
  try{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
  catch{console.error('TypeScript is not installed. Run npm install first.');process.exit(2)}
}
const roots=['src','worker'];
const files=[];
for(const root of roots){
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.tsx?$/.test(e.name))files.push(p)}};
  walk(path.resolve(root));
}
let errors=0;
for(const f of files){
  const source=fs.readFileSync(f,'utf8');
  const out=ts.transpileModule(source,{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true,esModuleInterop:true,skipLibCheck:true}});
  for(const d of out.diagnostics||[]){if(d.category!==ts.DiagnosticCategory.Error)continue;errors++;const pos=d.file&&typeof d.start==='number'?d.file.getLineAndCharacterOfPosition(d.start):null;console.error(`${f}${pos?`:${pos.line+1}:${pos.character+1}`:''} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
}
console.log(`Static TypeScript parse: ${files.length} files, ${errors} errors.`);
if(errors)process.exit(1);
