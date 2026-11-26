/* node proef/build.mjs → proef/dist/worker.js (+ static.gen.js). Zonder geheimen. Vereist esbuild (npm i esbuild elders). */
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url)),fien=path.join(here,'../../fien');const out={};
const skip=/^(ai-results|vendor\/.*\.map)/;
(function walk(d,rel=''){for(const n of fs.readdirSync(d)){const p=path.join(d,n),r=rel?rel+'/'+n:n;if(fs.statSync(p).isDirectory())walk(p,r);else if(!skip.test(r))out[r]=fs.readFileSync(p).toString('base64')}})(fien);
fs.writeFileSync(path.join(here,'static.gen.js'),'export default '+JSON.stringify(out));
const {build}=await import(process.env.ESBUILD||'esbuild');
await build({entryPoints:[path.join(here,'entry.js')],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:path.join(here,'dist/worker.js'),external:['@cloudflare/puppeteer','node:*'],mainFields:['module','main'],conditions:['workerd','worker','browser']});
console.log('files',Object.keys(out).length,'bytes',fs.statSync(path.join(here,'dist/worker.js')).size);
