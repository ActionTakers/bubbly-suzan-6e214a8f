// node test/chat-test.mjs — nep-R2, nep-Gemini. Geen netwerk, geen echte sleutels.
import {koppel,chat,schoon} from '../chat.js';
const store=new Map();const FIEN={async put(k,v){store.set(k,String(v))},async get(k){return store.has(k)?{text:async()=>store.get(k)}:null},async head(k){return store.has(k)?{}:null}};
const env={FIEN,CHAT_KOPPELCODE:'test-koppel-123',GEMINI_API_KEY:'nep',CHAT_PROMPT:'test',CHAT_DAG_MAX:'3'};
const J=(s,o)=>({status:s,body:o});let llm={tekst:'Zet het deeg 20 minuten in de koelkast.'};
globalThis.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(llm)}]}}]})});
const rq=(body,h={})=>({json:async()=>body,text:async()=>JSON.stringify(body),headers:{get:k=>h[k]||null}});
let ok=0,n=0;const t=(c,m)=>{n++;if(c)ok++;else console.log('FOUT',m)};
t((await koppel(rq({code:'fout'}),env,J)).status===401,'foute code');
const k=await koppel(rq({code:'test-koppel-123'}),env,J);t(k.status===200&&/^[a-f0-9]{64}$/.test(k.body.token),'koppel');const H={Authorization:'Bearer '+k.body.token};
t((await chat(rq({id:'CABCDE',berichten:[{wie:'suzan',tekst:'hoi'}]}),env,J)).status===401,'zonder token');
const r1=await chat(rq({id:'CABCDE',berichten:[{wie:'suzan',tekst:'deeg plakt'}]},H),env,J);t(r1.status===200&&r1.body.tekst.includes('koelkast'),'antwoord');
llm={tekst:'Die taart kost €25.'};const r2=await chat(rq({id:'CABCDF',berichten:[{wie:'suzan',tekst:'prijs?'}]},H),env,J);t(r2.body.klaar&&!r2.body.tekst.includes('€'),'prijs gefilterd');
t([...store.keys()].some(x=>x.startsWith('chat/klaar/CABCDF')),'klaargezet in R2');
llm={tekst:'Ja hoor, die is notenvrij.'};t(schoon(llm).klaar,'allergie-belofte gefilterd');
t(schoon({tekst:'Vraag het aan Gabriël'}).klaar,'naam gefilterd');
await chat(rq({id:'CABCDG',berichten:[{wie:'suzan',tekst:'x'}]},H),env,J);t((await chat(rq({id:'CABCDH',berichten:[{wie:'suzan',tekst:'x'}]},H),env,J)).status===429,'daglimiet');
console.log(`${ok}/${n}`);process.exit(ok===n?0:1);
